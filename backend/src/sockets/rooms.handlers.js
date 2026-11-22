// Genel sohbet odası soket olayları
//
// İstemci → sunucu (ack ile yanıt: { ok, data } | { ok: false, error })
//   room:send    { roomId, content?, replyToId?, mediaIds? }
//   room:typing  { roomId }
//   room:read    { roomId, messageId }
//
// Sunucu → istemci
//   room:message:new      mesaj nesnesi
//   room:message:updated  düzenlenen / silinen / gizlenen mesaj
//   room:typing           { roomId, user: { id, username } }
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const socketHandler = require('./handler');
const schemas = require('../modules/rooms/rooms.schemas');
const rooms = require('../modules/rooms/rooms.service');

/** İçerik üretmeden önce e-posta doğrulamasını güncel veriden kontrol eder */
async function assertVerified(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerifiedAt: true } });
  if (!user?.emailVerifiedAt) {
    throw ApiError.forbidden('Bu işlem için e-posta adresinizi doğrulamanız gerekiyor', { code: 'EMAIL_NOT_VERIFIED' });
  }
}

module.exports = function registerRoomHandlers(io, socket) {
  const userId = socket.user.id;

  socket.on(
    'room:send',
    socketHandler(schemas.socketSend, async ({ roomId, ...message }) => {
      await assertVerified(userId);
      return rooms.sendMessage(userId, roomId, message);
    }),
  );

  socket.on(
    'room:typing',
    socketHandler(schemas.socketTyping, async ({ roomId }) => {
      if (!socket.rooms.has(`room:${roomId}`)) return null;
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true } });
      socket.to(`room:${roomId}`).emit('room:typing', { roomId, user });
      return null;
    }),
  );

  socket.on(
    'room:read',
    socketHandler(schemas.socketRead, async ({ roomId, messageId }) => {
      await rooms.markRead(userId, roomId, messageId);
      return null;
    }),
  );
};
