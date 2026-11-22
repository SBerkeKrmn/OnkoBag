const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const realtime = require('../../lib/realtime');
const ApiError = require('../../utils/ApiError');
const { getBlockedUserIds, isBlockedBetween } = require('../../lib/blocks');
const { publicUserSelect, formatPublicUser, cancerTypeSelect } = require('../../lib/selects');
const { assignUserToRoom, removeUserFromCancerTypeRooms } = require('../rooms/roomAssignment');
const notifications = require('../notifications/notifications.service');

const cancerProfileSelect = {
  id: true,
  status: true,
  diagnosisYear: true,
  remissionYear: true,
  isPrimary: true,
  isVerified: true,
  verifiedAt: true,
  cancerType: { select: cancerTypeSelect },
};

// --- Kendi profilim ----------------------------------------------------------------

async function getMe(userId) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      birthYear: true,
      gender: true,
      city: true,
      role: true,
      dmPermission: true,
      emailVerifiedAt: true,
      createdAt: true,
      passwordHash: true,
      identities: { select: { provider: true } },
      cancerProfiles: { select: cancerProfileSelect, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] },
      _count: { select: { followers: true, following: true, posts: { where: { status: 'PUBLISHED' } } } },
    },
  });

  const { _count, emailVerifiedAt, passwordHash, identities, ...rest } = user;
  return {
    ...rest,
    emailVerified: Boolean(emailVerifiedAt),
    hasPassword: Boolean(passwordHash),
    linkedProviders: identities.map((i) => i.provider),
    stats: { followers: _count.followers, following: _count.following, posts: _count.posts },
  };
}

async function updateMe(userId, input) {
  const { avatarMediaId, ...data } = input;

  if (avatarMediaId !== undefined) {
    if (avatarMediaId === null) {
      data.avatarUrl = null;
    } else {
      const media = await prisma.media.findFirst({
        where: { id: avatarMediaId, uploaderId: userId, postId: null, roomMessageId: null, directMessageId: null },
      });
      if (!media) throw ApiError.badRequest('Geçersiz profil fotoğrafı', { code: 'INVALID_MEDIA' });
      data.avatarUrl = media.url;
    }
  }

  await prisma.user.update({ where: { id: userId }, data });
  return getMe(userId);
}

/**
 * Hesap silme (KVKK): kişisel veriler anonimleştirilir, içerikler kaldırılır,
 * oturumlar kapatılır. Kayıt, moderasyon geçmişinin bütünlüğü için fiziksel
 * olarak silinmez; `status = DELETED` olur.
 */
async function deleteMe(userId, { password, confirm }) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.passwordHash) {
    if (!password || !(await bcrypt.compare(password, user.passwordHash))) {
      throw ApiError.badRequest('Şifre hatalı', { code: 'WRONG_PASSWORD' });
    }
  } else if (confirm !== true) {
    // Yalnızca Google/Apple ile giriş yapan kullanıcılar şifre yerine açık onay verir
    throw ApiError.badRequest('Hesap silme işlemini onaylaman gerekiyor', { code: 'CONFIRM_REQUIRED' });
  }

  const anonymous = `deleted_${userId.replace(/-/g, '').slice(0, 20)}`;
  const memberships = await prisma.roomMembership.findMany({ where: { userId }, select: { roomId: true } });

  await prisma.$transaction(async (tx) => {
    for (const { roomId } of memberships) {
      await tx.roomMembership.delete({ where: { roomId_userId: { roomId, userId } } });
      await tx.chatRoom.update({ where: { id: roomId }, data: { memberCount: { decrement: 1 } } });
    }
    await tx.post.updateMany({ where: { authorId: userId }, data: { status: 'DELETED' } });
    await tx.comment.updateMany({ where: { authorId: userId }, data: { status: 'DELETED' } });
    await tx.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } });
    await tx.refreshToken.deleteMany({ where: { userId } });
    await tx.pushToken.deleteMany({ where: { userId } });
    await tx.authToken.deleteMany({ where: { userId } });
    // Bağlı Google/Apple hesapları kaldırılır; aynı hesapla yeniden kayıt olunabilir
    await tx.authIdentity.deleteMany({ where: { userId } });
    await tx.userCancerProfile.deleteMany({ where: { userId } });
    await tx.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        email: `${anonymous}@deleted.onkobag.local`,
        username: anonymous,
        displayName: null,
        bio: null,
        avatarUrl: null,
        birthYear: null,
        gender: null,
        city: null,
        passwordHash: null,
      },
    });
  });

  realtime.disconnectUser(userId);
}

// --- Kanser profilleri -----------------------------------------------------------------

async function addCancerProfile(userId, input) {
  const { isPrimary, ...profile } = input;
  const cancerType = await prisma.cancerType.findFirst({ where: { id: profile.cancerTypeId, isActive: true } });
  if (!cancerType) throw ApiError.badRequest('Geçersiz kanser türü', { code: 'INVALID_CANCER_TYPE' });

  const exists = await prisma.userCancerProfile.findUnique({
    where: { userId_cancerTypeId: { userId, cancerTypeId: profile.cancerTypeId } },
  });
  if (exists) throw ApiError.conflict('Bu kanser türü zaten profilinizde var', { code: 'PROFILE_EXISTS' });

  const roomId = await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.userCancerProfile.updateMany({ where: { userId }, data: { isPrimary: false } });
    }
    await tx.userCancerProfile.create({ data: { ...profile, userId, isPrimary } });
    const { room } = await assignUserToRoom(tx, userId, profile.cancerTypeId);
    return room.id;
  });

  realtime.joinUserToRoom(userId, roomId);
  return getMe(userId);
}

async function updateCancerProfile(userId, profileId, input) {
  const profile = await prisma.userCancerProfile.findFirst({ where: { id: profileId, userId } });
  if (!profile) throw ApiError.notFound('Profil bulunamadı');

  const status = input.status ?? profile.status;
  const diagnosisYear = input.diagnosisYear !== undefined ? input.diagnosisYear : profile.diagnosisYear;
  let remissionYear = input.remissionYear !== undefined ? input.remissionYear : profile.remissionYear;

  if (status === 'ACTIVE_TREATMENT') remissionYear = null;
  if (diagnosisYear && remissionYear && remissionYear < diagnosisYear) {
    throw ApiError.badRequest('Remisyon yılı tanı yılından önce olamaz');
  }

  const statusChanged = status !== profile.status;

  await prisma.$transaction(async (tx) => {
    if (input.isPrimary) {
      await tx.userCancerProfile.updateMany({ where: { userId, id: { not: profileId } }, data: { isPrimary: false } });
    }
    await tx.userCancerProfile.update({
      where: { id: profileId },
      data: {
        status,
        diagnosisYear,
        remissionYear,
        ...(input.isPrimary ? { isPrimary: true } : {}),
        // Durum değişirse iyileşen doğrulaması yeniden yapılmalı
        ...(statusChanged ? { isVerified: false, verifiedAt: null, verifiedById: null } : {}),
      },
    });
  });

  return getMe(userId);
}

async function removeCancerProfile(userId, profileId) {
  const profiles = await prisma.userCancerProfile.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  const profile = profiles.find((p) => p.id === profileId);
  if (!profile) throw ApiError.notFound('Profil bulunamadı');
  if (profiles.length === 1) {
    throw ApiError.badRequest('En az bir kanser profiliniz olmalı', { code: 'LAST_PROFILE' });
  }

  const removedRoomIds = await prisma.$transaction(async (tx) => {
    await tx.userCancerProfile.delete({ where: { id: profileId } });
    if (profile.isPrimary) {
      const next = profiles.find((p) => p.id !== profileId);
      await tx.userCancerProfile.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
    return removeUserFromCancerTypeRooms(tx, userId, profile.cancerTypeId);
  });

  removedRoomIds.forEach((roomId) => realtime.removeUserFromRoom(userId, roomId));
  return getMe(userId);
}

// --- Başka kullanıcıların profilleri ----------------------------------------------------

async function assertVisible(viewerId, targetId) {
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, status: true } });
  if (!target || target.status === 'DELETED') throw ApiError.notFound('Kullanıcı bulunamadı');
  if (viewerId !== targetId && (await isBlockedBetween(viewerId, targetId))) {
    throw ApiError.notFound('Kullanıcı bulunamadı');
  }
  return target;
}

async function getProfile(viewerId, where) {
  const user = await prisma.user.findFirst({
    where: { ...where, status: { not: 'DELETED' } },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      city: true,
      gender: true,
      dmPermission: true,
      createdAt: true,
      cancerProfiles: {
        select: { status: true, isPrimary: true, isVerified: true, diagnosisYear: true, remissionYear: true, cancerType: { select: cancerTypeSelect } },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
      _count: { select: { followers: true, following: true, posts: { where: { status: 'PUBLISHED' } } } },
    },
  });
  if (!user) throw ApiError.notFound('Kullanıcı bulunamadı');
  await assertVisible(viewerId, user.id);

  const [following, followsMe, blockedByMe] = await Promise.all([
    prisma.follow.count({ where: { followerId: viewerId, followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id, followingId: viewerId } }),
    prisma.block.count({ where: { blockerId: viewerId, blockedId: user.id } }),
  ]);

  const { _count, dmPermission, gender, ...rest } = user;
  const isSelf = viewerId === user.id;
  return {
    ...rest,
    // Cinsiyet profilde görünür; "Belirtmek istemiyorum" seçildiyse başkalarına gönderilmez
    gender: gender === 'PREFER_NOT_TO_SAY' ? null : gender,
    stats: { followers: _count.followers, following: _count.following, posts: _count.posts },
    relationship: {
      isSelf,
      isFollowing: Boolean(following),
      followsMe: Boolean(followsMe),
      isBlocked: Boolean(blockedByMe),
      canMessage:
        !isSelf && dmPermission !== 'NOBODY' && (dmPermission === 'EVERYONE' || Boolean(followsMe)),
    },
  };
}

async function search(viewerId, { q, limit }) {
  const blocked = await getBlockedUserIds(viewerId);
  const users = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      id: { notIn: [viewerId, ...blocked] },
      OR: [
        { username: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: publicUserSelect,
    orderBy: { username: 'asc' },
    take: limit,
  });
  return users.map(formatPublicUser);
}

/**
 * Hasta–iyileşen eşleşmesi: kullanıcının kanser türlerinde, istenen durumdaki
 * (varsayılan: iyileşen) kişileri önerir. Doğrulanmış iyileşenler önce gelir;
 * zaten takip edilenler ve engelli kullanıcılar hariç tutulur.
 */
async function suggestions(userId, { status, limit }) {
  const [myProfiles, blocked, following] = await Promise.all([
    prisma.userCancerProfile.findMany({ where: { userId }, select: { cancerTypeId: true } }),
    getBlockedUserIds(userId),
    prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
  ]);

  const excluded = [userId, ...blocked, ...following.map((f) => f.followingId)];

  const profiles = await prisma.userCancerProfile.findMany({
    where: {
      cancerTypeId: { in: myProfiles.map((p) => p.cancerTypeId) },
      status,
      userId: { notIn: excluded },
      user: { status: 'ACTIVE' },
    },
    orderBy: [{ isVerified: 'desc' }, { user: { lastSeenAt: { sort: 'desc', nulls: 'last' } } }],
    distinct: ['userId'],
    take: limit,
    select: {
      status: true,
      isVerified: true,
      remissionYear: true,
      cancerType: { select: cancerTypeSelect },
      user: { select: publicUserSelect },
    },
  });

  return profiles.map((p) => ({
    user: formatPublicUser(p.user),
    matchedOn: { cancerType: p.cancerType, status: p.status, isVerified: p.isVerified, remissionYear: p.remissionYear },
  }));
}

// --- Takip -----------------------------------------------------------------------------------

async function follow(userId, targetId) {
  if (userId === targetId) throw ApiError.badRequest('Kendinizi takip edemezsiniz');
  await assertVisible(userId, targetId);

  const result = await prisma.follow.createMany({
    data: [{ followerId: userId, followingId: targetId }],
    skipDuplicates: true,
  });

  if (result.count > 0) {
    await notifications.notify({ userId: targetId, actorId: userId, type: 'NEW_FOLLOWER', entityId: userId });
  }
}

async function unfollow(userId, targetId) {
  await prisma.follow.deleteMany({ where: { followerId: userId, followingId: targetId } });
}

async function listFollows(viewerId, userId, direction, { offset, limit }) {
  await assertVisible(viewerId, userId);
  const blocked = await getBlockedUserIds(viewerId);
  const isFollowers = direction === 'followers';

  const rows = await prisma.follow.findMany({
    where: isFollowers
      ? { followingId: userId, followerId: { notIn: blocked }, follower: { status: 'ACTIVE' } }
      : { followerId: userId, followingId: { notIn: blocked }, following: { status: 'ACTIVE' } },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    select: isFollowers ? { follower: { select: publicUserSelect } } : { following: { select: publicUserSelect } },
  });

  return rows.map((r) => formatPublicUser(isFollowers ? r.follower : r.following));
}

// --- Engelleme ---------------------------------------------------------------------------------

async function block(userId, targetId) {
  if (userId === targetId) throw ApiError.badRequest('Kendinizi engelleyemezsiniz');
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) throw ApiError.notFound('Kullanıcı bulunamadı');

  await prisma.$transaction([
    prisma.block.createMany({ data: [{ blockerId: userId, blockedId: targetId }], skipDuplicates: true }),
    prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: userId, followingId: targetId },
          { followerId: targetId, followingId: userId },
        ],
      },
    }),
  ]);
}

async function unblock(userId, targetId) {
  await prisma.block.deleteMany({ where: { blockerId: userId, blockedId: targetId } });
}

async function listBlocks(userId) {
  const rows = await prisma.block.findMany({
    where: { blockerId: userId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true, blocked: { select: publicUserSelect } },
  });
  return rows.map((r) => ({ user: formatPublicUser(r.blocked), blockedAt: r.createdAt }));
}

// --- Push token ----------------------------------------------------------------------------------

async function registerPushToken(userId, { token, platform }) {
  await prisma.pushToken.upsert({
    where: { token },
    update: { userId, platform, lastUsedAt: new Date() },
    create: { userId, token, platform },
  });
}

async function removePushToken(userId, token) {
  await prisma.pushToken.deleteMany({ where: { userId, token } });
}

module.exports = {
  getMe,
  updateMe,
  deleteMe,
  addCancerProfile,
  updateCancerProfile,
  removeCancerProfile,
  getProfile,
  search,
  suggestions,
  follow,
  unfollow,
  listFollows,
  block,
  unblock,
  listBlocks,
  registerPushToken,
  removePushToken,
  assertVisible,
};
