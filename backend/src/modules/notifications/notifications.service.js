const prisma = require('../../lib/prisma');
const realtime = require('../../lib/realtime');
const push = require('../../lib/push');
const { publicUserSelect, formatPublicUser } = require('../../lib/selects');
const { toCursorPage, cursorArgs } = require('../../utils/pagination');
const ApiError = require('../../utils/ApiError');

const notificationInclude = { actor: { select: publicUserSelect } };

function formatNotification(n) {
  return {
    id: n.id,
    type: n.type,
    entityId: n.entityId,
    message: n.message,
    actor: formatPublicUser(n.actor),
    isRead: Boolean(n.readAt),
    createdAt: n.createdAt,
  };
}

/** Telefon bildirimi metni ve dokununca açılacak ekran */
function pushContent(n) {
  const actor = n.actor ? n.actor.displayName || n.actor.username : 'Bir üye';
  const post = n.entityId ? `/post/${n.entityId}` : '/notifications';
  switch (n.type) {
    case 'NEW_FOLLOWER':
      return { body: `${actor} seni takip etmeye başladı`, url: n.actor ? `/user/${n.actor.id}` : '/notifications' };
    case 'POST_LIKED':
      return { body: `${actor} gönderine destek verdi 💜`, url: post };
    case 'POST_COMMENTED':
      return { body: `${actor} gönderine yorum yaptı`, url: post };
    case 'COMMENT_REPLIED':
      return { body: `${actor} yorumuna yanıt verdi`, url: post };
    case 'COMMENT_LIKED':
      return { body: `${actor} yorumunu beğendi`, url: post };
    default:
      return { body: n.message ?? 'Yeni bir bildirimin var', url: '/notifications' };
  }
}

/**
 * Bildirim oluşturur, kullanıcının açık uygulamasına anlık, kapalıysa telefonuna
 * push bildirimi olarak iletir. Kullanıcının kendi eylemi için bildirim üretilmez.
 * Hata ana işlemi bozmaz.
 */
async function notify({ userId, actorId = null, type, entityId = null, message = null }) {
  if (actorId && actorId === userId) return null;
  try {
    const notification = await prisma.notification.create({
      data: { userId, actorId, type, entityId: entityId ? String(entityId) : null, message },
      include: notificationInclude,
    });
    const formatted = formatNotification(notification);
    realtime.emitToUser(userId, 'notification:new', formatted);
    const { body, url } = pushContent(notification);
    push.sendToUsersSafe([userId], { title: 'OnkoBağ', body, data: { url, notificationId: notification.id } });
    return formatted;
  } catch (err) {
    console.error('Bildirim oluşturulamadı:', err.message);
    return null;
  }
}

async function list(userId, { cursor, limit, unreadOnly }) {
  const rows = await prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: notificationInclude,
    ...cursorArgs(cursor, limit),
  });
  const page = toCursorPage(rows, limit);
  return { ...page, data: page.data.map(formatNotification) };
}

const unreadCount = (userId) => prisma.notification.count({ where: { userId, readAt: null } });

async function markRead(userId, id) {
  const { count } = await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  if (count === 0) {
    const exists = await prisma.notification.count({ where: { id, userId } });
    if (!exists) throw ApiError.notFound('Bildirim bulunamadı');
  }
}

async function markAllRead(userId) {
  const { count } = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return count;
}

module.exports = { notify, list, unreadCount, markRead, markAllRead, formatNotification };
