// Moderasyon ve yönetim işlemleri. Her işlem moderation_logs tablosuna
// denetim kaydı olarak yazılır (kim, neyi, ne zaman, hangi gerekçeyle).
const prisma = require('../../lib/prisma');
const realtime = require('../../lib/realtime');
const ApiError = require('../../utils/ApiError');
const { publicUserSelect, formatPublicUser, cancerTypeSelect, mediaSelect } = require('../../lib/selects');
const { toCursorPage, cursorArgs } = require('../../utils/pagination');
const { loadTarget, previewTarget } = require('../reports/reportTargets');
const { assignUserToRoom } = require('../rooms/roomAssignment');
const notifications = require('../notifications/notifications.service');
const rooms = require('../rooms/rooms.service');
const conversations = require('../conversations/conversations.service');

function log(db, { moderatorId, action, targetType, targetId, targetUserId, reportId, reason, metadata }) {
  return db.moderationLog.create({
    data: {
      moderatorId,
      action,
      targetType,
      targetId: targetId != null ? String(targetId) : null,
      targetUserId,
      reportId,
      reason,
      metadata,
    },
  });
}

/** İlgili şikayeti otomatik olarak sonuçlandırır */
async function resolveReport(db, reportId, moderatorId, note) {
  if (!reportId) return;
  await db.report.updateMany({
    where: { id: reportId, status: { in: ['PENDING', 'IN_REVIEW'] } },
    data: { status: 'RESOLVED', reviewedById: moderatorId, reviewedAt: new Date(), resolutionNote: note },
  });
}

// --- Panel özeti -------------------------------------------------------------------------

async function stats() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [users, activeUsers24h, survivorsPending, pendingReports, urgentReports, posts24h, roomMessages24h, rooms_] =
    await Promise.all([
      prisma.user.count({ where: { status: { not: 'DELETED' } } }),
      prisma.user.count({ where: { lastSeenAt: { gte: since } } }),
      prisma.userCancerProfile.count({ where: { status: 'SURVIVOR', isVerified: false, user: { status: 'ACTIVE' } } }),
      prisma.report.count({ where: { status: { in: ['PENDING', 'IN_REVIEW'] } } }),
      prisma.report.count({ where: { status: { in: ['PENDING', 'IN_REVIEW'] }, reason: 'SELF_HARM' } }),
      prisma.post.count({ where: { createdAt: { gte: since } } }),
      prisma.roomMessage.count({ where: { createdAt: { gte: since } } }),
      prisma.chatRoom.count({ where: { isActive: true } }),
    ]);
  return {
    users,
    activeUsers24h,
    survivorsPendingVerification: survivorsPending,
    pendingReports,
    urgentReports,
    posts24h,
    roomMessages24h,
    activeRooms: rooms_,
  };
}

// --- Şikayetler ----------------------------------------------------------------------------

async function listReports({ status, targetType, cursor, limit }) {
  const rows = await prisma.report.findMany({
    where: { ...(status ? { status } : {}), ...(targetType ? { targetType } : {}) },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      reporter: { select: publicUserSelect },
      reviewedBy: { select: { id: true, username: true } },
    },
    ...cursorArgs(cursor, limit),
  });
  const page = toCursorPage(rows, limit);
  const data = await Promise.all(
    page.data.map(async (r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      description: r.description,
      status: r.status,
      reporter: formatPublicUser(r.reporter),
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt,
      resolutionNote: r.resolutionNote,
      createdAt: r.createdAt,
      target: await previewTarget(r.targetType, r.targetId),
    })),
  );
  return { ...page, data };
}

async function updateReport(moderatorId, reportId, { status, resolutionNote }) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw ApiError.notFound('Şikayet bulunamadı');

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.report.update({
      where: { id: reportId },
      data: { status, resolutionNote, reviewedById: moderatorId, reviewedAt: new Date() },
    });
    if (status !== 'IN_REVIEW') {
      await log(tx, {
        moderatorId,
        action: 'RESOLVE_REPORT',
        targetType: report.targetType,
        targetId: report.targetId,
        reportId,
        reason: resolutionNote,
        metadata: { status },
      });
    }
    return r;
  });

  if (status === 'RESOLVED' && report.reporterId) {
    await notifications.notify({
      userId: report.reporterId,
      type: 'REPORT_RESOLVED',
      entityId: reportId,
      message: 'Şikayetiniz incelendi ve gerekli işlem yapıldı. Topluluğumuzu güvenli tuttuğunuz için teşekkürler.',
    });
  }
  return updated;
}

// --- İçerik gizleme / geri yükleme -------------------------------------------------------------

async function emitContentUpdate(targetType, id) {
  if (targetType === 'ROOM_MESSAGE') {
    const m = await prisma.roomMessage.findUnique({ where: { id }, include: rooms.messageInclude });
    realtime.emitToRoom(m.roomId, 'room:message:updated', rooms.formatMessage(m));
  }
  if (targetType === 'DIRECT_MESSAGE') {
    const m = await prisma.directMessage.findUnique({
      where: { id },
      include: {
        sender: { select: publicUserSelect },
        media: { select: mediaSelect },
        conversation: { include: { participants: true } },
      },
    });
    const formatted = conversations.formatMessage(m);
    m.conversation.participants.forEach((p) => realtime.emitToUser(p.userId, 'dm:message:updated', formatted));
  }
}

async function setContentStatus(moderatorId, { targetType, targetId }, { reason, reportId }, hide) {
  const { record, id, ownerId, def } = await loadTarget(targetType, targetId);
  if (record.status === 'DELETED') throw ApiError.badRequest('Silinmiş içerik üzerinde işlem yapılamaz');

  const from = hide ? 'PUBLISHED' : 'HIDDEN';
  if (record.status !== from) {
    throw ApiError.badRequest(hide ? 'İçerik zaten gizli' : 'İçerik zaten yayında', { code: 'NO_CHANGE' });
  }

  await prisma.$transaction(async (tx) => {
    await tx[def.model].update({ where: { id }, data: { status: hide ? 'HIDDEN' : 'PUBLISHED' } });
    // Gizlenen yorum gönderinin yorum sayısından düşülür
    if (targetType === 'COMMENT') {
      await tx.post.update({
        where: { id: record.postId },
        data: { commentCount: hide ? { decrement: 1 } : { increment: 1 } },
      });
    }
    await log(tx, {
      moderatorId,
      action: hide ? 'HIDE_CONTENT' : 'RESTORE_CONTENT',
      targetType,
      targetId,
      targetUserId: ownerId,
      reportId,
      reason,
    });
    if (hide) await resolveReport(tx, reportId, moderatorId, reason);
  });

  await emitContentUpdate(targetType, id);
}

// --- Kullanıcı yönetimi -----------------------------------------------------------------------

async function listUsers(viewer, { q, status, role, offset, limit }) {
  const users = await prisma.user.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(role ? { role } : {}),
      ...(q
        ? {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { displayName: { contains: q, mode: 'insensitive' } },
              ...(viewer.role === 'ADMIN' ? [{ email: { contains: q.toLowerCase() } }] : []),
            ],
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    select: {
      id: true,
      username: true,
      displayName: true,
      email: viewer.role === 'ADMIN',
      role: true,
      status: true,
      suspendedUntil: true,
      emailVerifiedAt: true,
      lastSeenAt: true,
      createdAt: true,
      cancerProfiles: { select: { status: true, isVerified: true, cancerType: { select: cancerTypeSelect } } },
    },
  });

  // Her kullanıcı hakkında yapılmış şikayet sayısı
  const reportCounts = await prisma.report.groupBy({
    by: ['targetId'],
    where: { targetType: 'USER', targetId: { in: users.map((u) => u.id) } },
    _count: { _all: true },
  });
  return users.map((u) => ({
    ...u,
    reportCount: reportCounts.find((r) => r.targetId === u.id)?._count._all ?? 0,
  }));
}

async function getManageableUser(actor, userId) {
  if (actor.id === userId) throw ApiError.badRequest('Bu işlemi kendi hesabınıza uygulayamazsınız');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.status === 'DELETED') throw ApiError.notFound('Kullanıcı bulunamadı');
  // Moderatörler yalnızca normal kullanıcılar üzerinde işlem yapabilir
  if (actor.role !== 'ADMIN' && user.role !== 'USER') {
    throw ApiError.forbidden('Yetkili hesaplar üzerinde yalnızca yöneticiler işlem yapabilir');
  }
  return user;
}

async function suspendUser(actor, userId, { until, reason, reportId }) {
  await getManageableUser(actor, userId);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { status: 'SUSPENDED', suspendedUntil: until ?? null } });
    await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await log(tx, {
      moderatorId: actor.id,
      action: 'SUSPEND_USER',
      targetType: 'USER',
      targetId: userId,
      targetUserId: userId,
      reportId,
      reason,
      metadata: { until: until ?? null },
    });
    await resolveReport(tx, reportId, actor.id, reason);
  });
  realtime.disconnectUser(userId);
}

async function unsuspendUser(actor, userId, { reason }) {
  const user = await getManageableUser(actor, userId);
  if (user.status !== 'SUSPENDED') throw ApiError.badRequest('Kullanıcı askıda değil', { code: 'NO_CHANGE' });
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { status: 'ACTIVE', suspendedUntil: null } });
    await log(tx, {
      moderatorId: actor.id,
      action: 'UNSUSPEND_USER',
      targetType: 'USER',
      targetId: userId,
      targetUserId: userId,
      reason,
    });
  });
}

async function warnUser(actor, userId, { reason, reportId }) {
  await getManageableUser(actor, userId);
  await prisma.$transaction(async (tx) => {
    await log(tx, {
      moderatorId: actor.id,
      action: 'WARN_USER',
      targetType: 'USER',
      targetId: userId,
      targetUserId: userId,
      reportId,
      reason,
    });
    await resolveReport(tx, reportId, actor.id, reason);
  });
  await notifications.notify({
    userId,
    type: 'SYSTEM',
    message: `Topluluk kurallarıyla ilgili bir uyarı aldınız: ${reason}`,
  });
}

async function changeRole(actor, userId, { role }) {
  const user = await getManageableUser(actor, userId);
  if (user.role === role) throw ApiError.badRequest('Kullanıcı zaten bu role sahip', { code: 'NO_CHANGE' });
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role } });
    await log(tx, {
      moderatorId: actor.id,
      action: 'CHANGE_ROLE',
      targetType: 'USER',
      targetId: userId,
      targetUserId: userId,
      metadata: { from: user.role, to: role },
    });
  });
}

// --- İyileşen doğrulaması ---------------------------------------------------------------------

async function listPendingSurvivors({ offset, limit }) {
  const profiles = await prisma.userCancerProfile.findMany({
    where: { status: 'SURVIVOR', isVerified: false, user: { status: 'ACTIVE' } },
    orderBy: { createdAt: 'asc' },
    skip: offset,
    take: limit,
    select: {
      id: true,
      diagnosisYear: true,
      remissionYear: true,
      createdAt: true,
      cancerType: { select: cancerTypeSelect },
      user: { select: { ...publicUserSelect, bio: true, createdAt: true } },
    },
  });
  return profiles.map((p) => ({ ...p, user: { ...formatPublicUser(p.user), bio: p.user.bio, createdAt: p.user.createdAt } }));
}

async function setSurvivorVerification(actor, profileId, verify, reason) {
  const profile = await prisma.userCancerProfile.findUnique({
    where: { id: profileId },
    include: { cancerType: true },
  });
  if (!profile) throw ApiError.notFound('Profil bulunamadı');
  if (profile.status !== 'SURVIVOR') throw ApiError.badRequest('Yalnızca iyileşen profilleri doğrulanabilir');
  if (profile.isVerified === verify) throw ApiError.badRequest('Profil zaten bu durumda', { code: 'NO_CHANGE' });

  await prisma.$transaction(async (tx) => {
    await tx.userCancerProfile.update({
      where: { id: profileId },
      data: verify
        ? { isVerified: true, verifiedById: actor.id, verifiedAt: new Date() }
        : { isVerified: false, verifiedById: null, verifiedAt: null },
    });
    await log(tx, {
      moderatorId: actor.id,
      action: verify ? 'VERIFY_SURVIVOR' : 'REVOKE_SURVIVOR',
      targetUserId: profile.userId,
      reason,
      metadata: { profileId, cancerTypeId: profile.cancerTypeId },
    });
  });

  if (verify) {
    await notifications.notify({
      userId: profile.userId,
      type: 'SURVIVOR_VERIFIED',
      entityId: profileId,
      message: `${profile.cancerType.name} iyileşen rozetiniz onaylandı. Deneyimleriniz birçok kişiye umut olacak 💜`,
    });
  }
}

// --- Odalar ---------------------------------------------------------------------------------------

async function silenceInRoom(actor, { roomId, userId }, { until, reason }) {
  await getManageableUser(actor, userId);
  const membership = await prisma.roomMembership.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (!membership) throw ApiError.notFound('Kullanıcı bu odanın üyesi değil');

  await prisma.$transaction(async (tx) => {
    await tx.roomMembership.update({ where: { roomId_userId: { roomId, userId } }, data: { silencedUntil: until } });
    await log(tx, {
      moderatorId: actor.id,
      action: 'SILENCE_IN_ROOM',
      targetUserId: userId,
      reason,
      metadata: { roomId, until },
    });
  });
}

async function listRooms({ cancerTypeId }) {
  return prisma.chatRoom.findMany({
    where: cancerTypeId ? { cancerTypeId } : {},
    orderBy: [{ cancerType: { sortOrder: 'asc' } }, { roomNumber: 'asc' }],
    include: { cancerType: { select: cancerTypeSelect } },
  });
}

async function createRoom(actor, { cancerTypeId, name, description, maxMembers }) {
  const cancerType = await prisma.cancerType.findUnique({ where: { id: cancerTypeId } });
  if (!cancerType) throw ApiError.badRequest('Geçersiz kanser türü');

  return prisma.$transaction(async (tx) => {
    const last = await tx.chatRoom.findFirst({ where: { cancerTypeId }, orderBy: { roomNumber: 'desc' } });
    const roomNumber = (last?.roomNumber ?? 0) + 1;
    const room = await tx.chatRoom.create({
      data: {
        cancerTypeId,
        roomNumber,
        name: name ?? `${cancerType.name} Genel Sohbet #${roomNumber}`,
        description,
        maxMembers: maxMembers ?? last?.maxMembers ?? 500,
        isDefault: !last,
      },
    });
    await log(tx, { moderatorId: actor.id, action: 'CREATE_ROOM', metadata: { roomId: room.id, cancerTypeId } });
    return room;
  });
}

/**
 * Oda güncelleme. Oda kapatılırsa (isActive=false) üyeleri aynı kanser türünün
 * diğer aktif odalarına dağıtılır (gerekirse yeni oda açılır).
 */
async function updateRoom(actor, roomId, data) {
  const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
  if (!room) throw ApiError.notFound('Oda bulunamadı');
  const closing = data.isActive === false && room.isActive;

  const moves = await prisma.$transaction(
    async (tx) => {
      await tx.chatRoom.update({ where: { id: roomId }, data });
      const moved = [];

      if (closing) {
        const members = await tx.roomMembership.findMany({ where: { roomId }, select: { userId: true } });
        await tx.roomMembership.deleteMany({ where: { roomId } });
        await tx.chatRoom.update({ where: { id: roomId }, data: { memberCount: 0, isDefault: false } });

        // Varsayılan oda kapatıldıysa varsayılanlık başka aktif odaya geçer
        if (room.isDefault) {
          const next = await tx.chatRoom.findFirst({
            where: { cancerTypeId: room.cancerTypeId, isActive: true },
            orderBy: { roomNumber: 'asc' },
          });
          if (next) await tx.chatRoom.update({ where: { id: next.id }, data: { isDefault: true } });
        }

        for (const { userId } of members) {
          const { room: target } = await assignUserToRoom(tx, userId, room.cancerTypeId);
          moved.push({ userId, roomId: target.id });
        }
      }

      await log(tx, {
        moderatorId: actor.id,
        action: closing ? 'CLOSE_ROOM' : 'UPDATE_ROOM',
        metadata: { roomId, changes: data, movedMembers: moved.length },
      });
      return moved;
    },
    { timeout: 60_000 },
  );

  moves.forEach(({ userId, roomId: newRoomId }) => {
    realtime.removeUserFromRoom(userId, roomId);
    realtime.joinUserToRoom(userId, newRoomId);
  });

  return { ...(await prisma.chatRoom.findUnique({ where: { id: roomId } })), movedMembers: moves.length };
}

// --- Kanser türleri -----------------------------------------------------------------------------

async function createCancerType(actor, data) {
  return prisma.$transaction(async (tx) => {
    const cancerType = await tx.cancerType.create({ data });
    await tx.chatRoom.create({
      data: {
        cancerTypeId: cancerType.id,
        roomNumber: 1,
        name: `${cancerType.name} Genel Sohbet`,
        description: `${cancerType.name} ile mücadele eden ve bu hastalığı atlatmış kişilerin buluşma alanı.`,
        isDefault: true,
      },
    });
    await log(tx, { moderatorId: actor.id, action: 'CREATE_CANCER_TYPE', metadata: { cancerTypeId: cancerType.id, name: data.name } });
    return cancerType;
  });
}

async function updateCancerType(actor, id, data) {
  const existing = await prisma.cancerType.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Kanser türü bulunamadı');
  return prisma.$transaction(async (tx) => {
    const updated = await tx.cancerType.update({ where: { id }, data });
    await log(tx, { moderatorId: actor.id, action: 'UPDATE_CANCER_TYPE', metadata: { cancerTypeId: id, changes: data } });
    return updated;
  });
}

// --- Denetim kayıtları -------------------------------------------------------------------------------

async function listLogs({ targetUserId, cursor, limit }) {
  const rows = await prisma.moderationLog.findMany({
    where: targetUserId ? { targetUserId } : {},
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      moderator: { select: { id: true, username: true } },
      targetUser: { select: { id: true, username: true } },
    },
    ...cursorArgs(cursor, limit),
  });
  return toCursorPage(rows, limit);
}

module.exports = {
  stats,
  listReports,
  updateReport,
  setContentStatus,
  listUsers,
  suspendUser,
  unsuspendUser,
  warnUser,
  changeRole,
  listPendingSurvivors,
  setSurvivorVerification,
  silenceInRoom,
  listRooms,
  createRoom,
  updateRoom,
  createCancerType,
  updateCancerType,
  listLogs,
};
