// Birebir özel mesajlaşma.
// - İki kullanıcı arasında tek sohbet vardır (directKey = küçük:büyük uuid)
// - Yeni sohbet başlatırken alıcının DM izni (EVERYONE / FOLLOWING / NOBODY)
//   ve iki yönlü engelleme kontrol edilir
// - Mesajlar her iki tarafın user:<id> soket kanalına iletilir
const prisma = require('../../lib/prisma');
const realtime = require('../../lib/realtime');
const push = require('../../lib/push');
const { signMedia } = require('../../lib/mediaUrls');
const ApiError = require('../../utils/ApiError');
const { isBlockedBetween } = require('../../lib/blocks');
const { publicUserSelect, formatPublicUser, mediaSelect } = require('../../lib/selects');
const { attachMedia, purgeMedia } = require('../media/media.service');

const directKeyOf = (a, b) => [a, b].sort().join(':');

const messageInclude = {
  sender: { select: publicUserSelect },
  media: { select: mediaSelect, orderBy: { sortOrder: 'asc' } },
};

function formatMessage(m) {
  const visible = m.status === 'PUBLISHED';
  return {
    id: m.id,
    conversationId: m.conversationId,
    type: m.type,
    sender: formatPublicUser(m.sender),
    senderId: m.senderId,
    content: visible ? m.content : null,
    media: visible ? m.media.map(signMedia) : [],
    status: m.status,
    editedAt: m.editedAt,
    createdAt: m.createdAt,
  };
}

/** Sohbetin katılımcısı olduğunu doğrular; { me, other } katılımcı kayıtlarını döner */
async function getParticipants(userId, conversationId) {
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    include: { user: { select: { ...publicUserSelect, dmPermission: true } } },
  });
  const me = participants.find((p) => p.userId === userId);
  if (!me) throw ApiError.notFound('Sohbet bulunamadı');
  const other = participants.find((p) => p.userId !== userId);
  return { me, other };
}

/**
 * Alıcının "Kimler mesaj atabilir" ayarı. Yalnızca yeni sohbet açarken değil HER
 * mesajda uygulanır: "Kimse" seçildiği andan itibaren açık sohbetler dahil hiç
 * mesaj alınmaz; "Takip ettiklerim" seçildiyse yalnızca alıcının takip ettiği
 * kişiler yazabilir.
 */
async function canMessage(senderId, recipient) {
  if (!recipient || recipient.status !== 'ACTIVE') return false;
  if (recipient.dmPermission === 'NOBODY') return false;
  if (recipient.dmPermission === 'FOLLOWING') {
    // Alıcı, mesaj gönderen kişiyi takip ediyorsa izin verilir
    const follows = await prisma.follow.count({ where: { followerId: recipient.id, followingId: senderId } });
    return follows > 0;
  }
  return true;
}

async function unreadCount(conversationId, userId, lastReadMessageId, hiddenAt) {
  return prisma.directMessage.count({
    where: {
      conversationId,
      status: 'PUBLISHED',
      senderId: { not: userId },
      ...(lastReadMessageId ? { id: { gt: lastReadMessageId } } : {}),
      ...(hiddenAt ? { createdAt: { gt: hiddenAt } } : {}),
    },
  });
}

async function formatConversation(conversation, userId) {
  const me = conversation.participants.find((p) => p.userId === userId);
  const other = conversation.participants.find((p) => p.userId !== userId);
  const lastMessage = conversation.messages?.[0];

  return {
    id: conversation.id,
    otherUser: formatPublicUser(other?.user),
    lastMessage: lastMessage && (!me.hiddenAt || lastMessage.createdAt > me.hiddenAt) ? formatMessage(lastMessage) : null,
    lastMessageAt: conversation.lastMessageAt,
    unreadCount: await unreadCount(conversation.id, userId, me.lastReadMessageId, me.hiddenAt),
    isMuted: me.isMuted,
    otherLastReadMessageId: other?.lastReadMessageId ?? null,
    // Karşı tarafa şu an mesaj gönderilebilir mi (mesaj izni, engel, hesap durumu)
    canMessage: Boolean(other) && (await canMessage(userId, other.user)) && !(await isBlockedBetween(userId, other.userId)),
  };
}

const participantUserSelect = { ...publicUserSelect, dmPermission: true };

const conversationInclude = {
  participants: { include: { user: { select: participantUserSelect } } },
  messages: { orderBy: { id: 'desc' }, take: 1, include: messageInclude },
};

/** Mevcut sohbeti döner veya yenisini oluşturur */
async function startConversation(userId, otherUserId) {
  if (userId === otherUserId) throw ApiError.badRequest('Kendinize mesaj gönderemezsiniz');

  const recipient = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { id: true, status: true, dmPermission: true },
  });
  if (!recipient || recipient.status !== 'ACTIVE') throw ApiError.notFound('Kullanıcı bulunamadı');
  if (await isBlockedBetween(userId, otherUserId)) throw ApiError.notFound('Kullanıcı bulunamadı');

  const directKey = directKeyOf(userId, otherUserId);
  let conversation = await prisma.conversation.findUnique({ where: { directKey }, include: conversationInclude });

  if (!conversation) {
    if (!(await canMessage(userId, recipient))) {
      throw ApiError.forbidden('Bu kullanıcı özel mesaj kabul etmiyor', { code: 'DM_NOT_ALLOWED' });
    }
    try {
      conversation = await prisma.conversation.create({
        data: { directKey, participants: { create: [{ userId }, { userId: otherUserId }] } },
        include: conversationInclude,
      });
    } catch (err) {
      // İki taraf aynı anda başlatırsa directKey benzersizliği yakalar
      if (err.code !== 'P2002') throw err;
      conversation = await prisma.conversation.findUnique({ where: { directKey }, include: conversationInclude });
    }
  }

  return formatConversation(conversation, userId);
}

async function listConversations(userId) {
  const links = await prisma.conversationParticipant.findMany({
    where: { userId, conversation: { lastMessageAt: { not: null } } },
    include: { conversation: { include: conversationInclude } },
    orderBy: { conversation: { lastMessageAt: 'desc' } },
  });

  const visible = links.filter((l) => !l.hiddenAt || l.conversation.lastMessageAt > l.hiddenAt);
  return Promise.all(visible.map((l) => formatConversation(l.conversation, userId)));
}

async function getConversation(userId, conversationId) {
  await getParticipants(userId, conversationId);
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, include: conversationInclude });
  return formatConversation(conversation, userId);
}

async function listMessages(userId, conversationId, { before, limit }) {
  const { me } = await getParticipants(userId, conversationId);

  const rows = await prisma.directMessage.findMany({
    where: {
      conversationId,
      ...(before ? { id: { lt: before } } : {}),
      // Kullanıcı sohbeti silmişse yalnızca sonrasındaki mesajları görür
      ...(me.hiddenAt ? { createdAt: { gt: me.hiddenAt } } : {}),
    },
    orderBy: { id: 'desc' },
    take: limit + 1,
    include: messageInclude,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return { data: page.reverse().map(formatMessage), nextCursor: hasMore ? String(page[0].id) : null };
}

async function sendMessage(userId, conversationId, { content, mediaIds = [] }) {
  const { other } = await getParticipants(userId, conversationId);
  if (!other || other.user.status !== 'ACTIVE') {
    throw ApiError.forbidden('Bu kullanıcıya artık mesaj gönderilemez', { code: 'RECIPIENT_UNAVAILABLE' });
  }
  if (await isBlockedBetween(userId, other.userId)) {
    throw ApiError.forbidden('Bu kullanıcıya mesaj gönderemezsiniz', { code: 'BLOCKED' });
  }
  // Mesaj izni her mesajda yeniden kontrol edilir (açık sohbetler dahil)
  if (!(await canMessage(userId, other.user))) {
    throw ApiError.forbidden('Bu kullanıcı şu anda mesaj kabul etmiyor', { code: 'DM_NOT_ALLOWED' });
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.directMessage.create({
      data: { conversationId, senderId: userId, type: mediaIds.length ? 'IMAGE' : 'TEXT', content: content || null },
    });
    await attachMedia(tx, userId, mediaIds, { directMessageId: created.id });
    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: created.createdAt } });
    // Gönderen kendi mesajını okumuş sayılır
    await tx.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadMessageId: created.id },
    });
    return tx.directMessage.findUnique({ where: { id: created.id }, include: messageInclude });
  });

  const formatted = formatMessage(message);
  realtime.emitToUser(userId, 'dm:message:new', formatted);
  realtime.emitToUser(other.userId, 'dm:message:new', formatted);

  // Sessize alınmamışsa alıcının telefonuna bildirim
  if (!other.isMuted) {
    const sender = message.sender ? message.sender.displayName || message.sender.username : 'Yeni mesaj';
    push.sendToUsersSafe([other.userId], {
      title: sender,
      body: content || '📷 Görsel',
      data: { url: `/conversation/${conversationId}`, conversationId },
    });
  }
  return formatted;
}

async function deleteMessage(userId, conversationId, messageId) {
  const { other } = await getParticipants(userId, conversationId);
  const message = await prisma.directMessage.findFirst({ where: { id: messageId, conversationId } });
  if (!message || message.status === 'DELETED') throw ApiError.notFound('Mesaj bulunamadı');
  if (message.senderId !== userId) throw ApiError.forbidden('Yalnızca kendi mesajınızı silebilirsiniz');

  // Metin ve görseller veritabanından da silinir (yalnızca gizlenmez)
  const updated = await prisma.$transaction(async (tx) => {
    await purgeMedia(tx, { directMessageId: messageId });
    return tx.directMessage.update({
      where: { id: messageId },
      data: { status: 'DELETED', content: null },
      include: messageInclude,
    });
  });
  const formatted = formatMessage(updated);
  realtime.emitToUser(userId, 'dm:message:updated', formatted);
  if (other) realtime.emitToUser(other.userId, 'dm:message:updated', formatted);
}

async function markRead(userId, conversationId, messageId) {
  const { other } = await getParticipants(userId, conversationId);
  const { count } = await prisma.conversationParticipant.updateMany({
    where: {
      conversationId,
      userId,
      OR: [{ lastReadMessageId: null }, { lastReadMessageId: { lt: messageId } }],
    },
    data: { lastReadMessageId: messageId },
  });
  // Karşı tarafa "görüldü" bilgisi
  if (count > 0 && other) {
    realtime.emitToUser(other.userId, 'dm:read', { conversationId, userId, messageId });
  }
}

async function hideConversation(userId, conversationId) {
  await getParticipants(userId, conversationId);
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { hiddenAt: new Date() },
  });
}

async function setMuted(userId, conversationId, muted) {
  await getParticipants(userId, conversationId);
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { isMuted: muted },
  });
}

module.exports = {
  formatMessage,
  getParticipants,
  startConversation,
  listConversations,
  getConversation,
  listMessages,
  sendMessage,
  deleteMessage,
  markRead,
  hideConversation,
  setMuted,
};
