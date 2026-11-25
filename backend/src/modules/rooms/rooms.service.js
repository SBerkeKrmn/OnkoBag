// Genel sohbet odaları: listeleme, mesaj geçmişi, mesaj gönderme/düzenleme/silme.
// Mesaj gönderme hem REST hem Socket.io tarafından bu servis üzerinden yapılır;
// yeni mesaj odadaki herkese `room:message:new` olayıyla iletilir.
const prisma = require('../../lib/prisma');
const realtime = require('../../lib/realtime');
const ApiError = require('../../utils/ApiError');
const { getBlockedUserIds } = require('../../lib/blocks');
const { publicUserSelect, formatPublicUser, mediaSelect, cancerTypeSelect } = require('../../lib/selects');
const { attachMedia, purgeMedia } = require('../media/media.service');
const { signMedia } = require('../../lib/mediaUrls');

const messageInclude = {
  sender: { select: publicUserSelect },
  media: { select: mediaSelect, orderBy: { sortOrder: 'asc' } },
  replyTo: { select: { id: true, content: true, status: true, sender: { select: publicUserSelect } } },
};

function formatMessage(m) {
  const visible = m.status === 'PUBLISHED';
  return {
    id: m.id,
    roomId: m.roomId,
    type: m.type,
    sender: formatPublicUser(m.sender),
    content: visible ? m.content : null,
    media: visible ? m.media.map(signMedia) : [],
    status: m.status,
    replyTo: m.replyTo
      ? {
          id: m.replyTo.id,
          content: m.replyTo.status === 'PUBLISHED' ? m.replyTo.content : null,
          sender: formatPublicUser(m.replyTo.sender),
        }
      : null,
    editedAt: m.editedAt,
    createdAt: m.createdAt,
  };
}

/** Kullanıcının odaya üye olduğunu doğrular, üyeliği döner */
async function getMembership(userId, roomId) {
  const membership = await prisma.roomMembership.findUnique({
    where: { roomId_userId: { roomId, userId } },
    include: { room: true },
  });
  if (!membership || !membership.room.isActive) {
    throw ApiError.forbidden('Bu odanın üyesi değilsiniz', { code: 'NOT_ROOM_MEMBER' });
  }
  return membership;
}

async function unreadCount(roomId, userId, lastReadMessageId) {
  return prisma.roomMessage.count({
    where: {
      roomId,
      status: 'PUBLISHED',
      senderId: { not: userId },
      ...(lastReadMessageId ? { id: { gt: lastReadMessageId } } : {}),
    },
  });
}

async function listMyRooms(userId) {
  const memberships = await prisma.roomMembership.findMany({
    where: { userId, room: { isActive: true } },
    include: { room: { include: { cancerType: { select: cancerTypeSelect } } } },
    orderBy: { room: { cancerType: { sortOrder: 'asc' } } },
  });

  return Promise.all(
    memberships.map(async (m) => {
      const [lastMessage, unread] = await Promise.all([
        prisma.roomMessage.findFirst({
          where: { roomId: m.roomId, status: 'PUBLISHED' },
          orderBy: { id: 'desc' },
          include: messageInclude,
        }),
        unreadCount(m.roomId, userId, m.lastReadMessageId),
      ]);
      return {
        id: m.room.id,
        name: m.room.name,
        description: m.room.description,
        roomNumber: m.room.roomNumber,
        memberCount: m.room.memberCount,
        cancerType: m.room.cancerType,
        isMuted: m.isMuted,
        unreadCount: unread,
        lastMessage: lastMessage ? formatMessage(lastMessage) : null,
      };
    }),
  );
}

async function getRoom(userId, roomId) {
  const membership = await getMembership(userId, roomId);
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { cancerType: { select: cancerTypeSelect } },
  });

  // Odadaki aktif hasta / iyileşen dağılımı (oda ekranındaki özet için)
  const breakdown = await prisma.userCancerProfile.groupBy({
    by: ['status'],
    where: { cancerTypeId: room.cancerTypeId, user: { roomMemberships: { some: { roomId } } } },
    _count: { _all: true },
  });

  return {
    id: room.id,
    name: room.name,
    description: room.description,
    roomNumber: room.roomNumber,
    memberCount: room.memberCount,
    cancerType: room.cancerType,
    isMuted: membership.isMuted,
    silencedUntil: membership.silencedUntil,
    members: {
      activeTreatment: breakdown.find((b) => b.status === 'ACTIVE_TREATMENT')?._count._all ?? 0,
      survivors: breakdown.find((b) => b.status === 'SURVIVOR')?._count._all ?? 0,
    },
  };
}

async function listMessages(userId, roomId, { before, limit }) {
  await getMembership(userId, roomId);
  const blocked = await getBlockedUserIds(userId);

  const rows = await prisma.roomMessage.findMany({
    where: {
      roomId,
      ...(before ? { id: { lt: before } } : {}),
      ...(blocked.length ? { OR: [{ senderId: null }, { senderId: { notIn: blocked } }] } : {}),
    },
    orderBy: { id: 'desc' },
    take: limit + 1,
    include: messageInclude,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    // İstemci kolaylığı için eskiden yeniye sıralı
    data: page.reverse().map(formatMessage),
    nextCursor: hasMore ? String(page[0].id) : null,
  };
}

async function sendMessage(userId, roomId, { content, replyToId, mediaIds = [] }) {
  const membership = await getMembership(userId, roomId);
  if (membership.silencedUntil && membership.silencedUntil > new Date()) {
    throw ApiError.forbidden('Bu odada geçici olarak mesaj gönderemezsiniz', {
      code: 'SILENCED',
      details: { silencedUntil: membership.silencedUntil },
    });
  }

  if (replyToId) {
    const parent = await prisma.roomMessage.findFirst({ where: { id: replyToId, roomId } });
    if (!parent) throw ApiError.badRequest('Yanıtlanan mesaj bulunamadı');
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.roomMessage.create({
      data: {
        roomId,
        senderId: userId,
        type: mediaIds.length ? 'IMAGE' : 'TEXT',
        content: content || null,
        replyToId,
      },
    });
    await attachMedia(tx, userId, mediaIds, { roomMessageId: created.id });
    return tx.roomMessage.findUnique({ where: { id: created.id }, include: messageInclude });
  });

  const formatted = formatMessage(message);
  realtime.emitToRoom(roomId, 'room:message:new', formatted);
  return formatted;
}

async function getOwnMessage(userId, roomId, messageId) {
  const message = await prisma.roomMessage.findFirst({ where: { id: messageId, roomId } });
  if (!message || message.status === 'DELETED') throw ApiError.notFound('Mesaj bulunamadı');
  if (message.senderId !== userId) throw ApiError.forbidden('Yalnızca kendi mesajınızı değiştirebilirsiniz');
  return message;
}

async function editMessage(userId, roomId, messageId, { content }) {
  await getMembership(userId, roomId);
  const message = await getOwnMessage(userId, roomId, messageId);
  if (message.type !== 'TEXT' && message.type !== 'IMAGE') throw ApiError.badRequest('Bu mesaj düzenlenemez');

  const updated = await prisma.roomMessage.update({
    where: { id: messageId },
    data: { content, editedAt: new Date() },
    include: messageInclude,
  });
  const formatted = formatMessage(updated);
  realtime.emitToRoom(roomId, 'room:message:updated', formatted);
  return formatted;
}

async function deleteMessage(userId, roomId, messageId) {
  await getMembership(userId, roomId);
  await getOwnMessage(userId, roomId, messageId);

  // Metin ve görseller veritabanından da silinir (yalnızca gizlenmez)
  const updated = await prisma.$transaction(async (tx) => {
    await purgeMedia(tx, { roomMessageId: messageId });
    return tx.roomMessage.update({
      where: { id: messageId },
      data: { status: 'DELETED', content: null },
      include: messageInclude,
    });
  });
  realtime.emitToRoom(roomId, 'room:message:updated', formatMessage(updated));
}

async function markRead(userId, roomId, messageId) {
  await getMembership(userId, roomId);
  // Okundu işareti yalnızca ileri gider
  await prisma.roomMembership.updateMany({
    where: { roomId, userId, OR: [{ lastReadMessageId: null }, { lastReadMessageId: { lt: messageId } }] },
    data: { lastReadMessageId: messageId },
  });
}

async function setMuted(userId, roomId, muted) {
  await getMembership(userId, roomId);
  await prisma.roomMembership.update({ where: { roomId_userId: { roomId, userId } }, data: { isMuted: muted } });
}

async function listMembers(userId, roomId, { offset, limit }) {
  await getMembership(userId, roomId);
  const blocked = await getBlockedUserIds(userId);
  const rows = await prisma.roomMembership.findMany({
    where: { roomId, userId: { notIn: blocked }, user: { status: 'ACTIVE' } },
    orderBy: { joinedAt: 'asc' },
    skip: offset,
    take: limit,
    select: { joinedAt: true, user: { select: publicUserSelect } },
  });
  return rows.map((r) => ({ ...formatPublicUser(r.user), joinedAt: r.joinedAt }));
}

module.exports = {
  formatMessage,
  messageInclude,
  getMembership,
  listMyRooms,
  getRoom,
  listMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  markRead,
  setMuted,
  listMembers,
};
