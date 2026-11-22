// Birebir mesajlaşma soket olayları
//
// İstemci → sunucu (ack ile yanıt: { ok, data } | { ok: false, error })
//   dm:send    { conversationId, content?, mediaIds? }
//   dm:typing  { conversationId }
//   dm:read    { conversationId, messageId }
//
// Sunucu → istemci (user:<id> kanalı üzerinden)
//   dm:message:new      mesaj nesnesi (gönderenin diğer cihazlarına da gider)
//   dm:message:updated  silinen / gizlenen mesaj
//   dm:typing           { conversationId, userId }
//   dm:read             { conversationId, userId, messageId }
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const socketHandler = require('./handler');
const schemas = require('../modules/conversations/conversations.schemas');
const conversations = require('../modules/conversations/conversations.service');

async function assertVerified(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
  if (!user?.emailVerifiedAt) {
    throw ApiError.forbidden('Bu işlem için e-posta adresinizi doğrulamanız gerekiyor', { code: 'EMAIL_NOT_VERIFIED' });
  }
}

module.exports = function registerDmHandlers(io, socket) {
  const userId = socket.user.id;

  socket.on(
    'dm:send',
    socketHandler(schemas.socketSend, async ({ conversationId, ...message }) => {
      await assertVerified(userId);
      return conversations.sendMessage(userId, conversationId, message);
    }),
  );

  socket.on(
    'dm:typing',
    socketHandler(schemas.socketTyping, async ({ conversationId }) => {
      const { other } = await conversations.getParticipants(userId, conversationId);
      if (other) io.to(`user:${other.userId}`).emit('dm:typing', { conversationId, userId });
      return null;
    }),
  );

  socket.on(
    'dm:read',
    socketHandler(schemas.socketRead, async ({ conversationId, messageId }) => {
      await conversations.markRead(userId, conversationId, messageId);
      return null;
    }),
  );
};
