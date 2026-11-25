// KVKK m. 11 — ilgili kişinin kendi verilerine erişim hakkı.
// Kullanıcının hesabına ait tüm kişisel verileri tek bir JSON belgesi olarak
// toplar. Yalnızca kullanıcının kendi verileri yer alır: başkalarının e-postası,
// başkalarının mesaj metni vb. eklenmez (özel mesajlarda yalnızca kendi
// gönderdiği mesajlar bulunur).
const prisma = require('../../lib/prisma');
const mailer = require('../../lib/mailer');
const ApiError = require('../../utils/ApiError');

async function buildExport(userId) {
  const [user, profiles, posts, comments, roomMessages, directMessages, following, blocks, reports, media, sessions, devices, identities] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
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
          status: true,
          dmPermission: true,
          emailVerifiedAt: true,
          kvkkConsentAt: true,
          termsAcceptedAt: true,
          createdAt: true,
          lastSeenAt: true,
        },
      }),
      prisma.userCancerProfile.findMany({
        where: { userId },
        select: { status: true, diagnosisYear: true, remissionYear: true, isPrimary: true, isVerified: true, createdAt: true, cancerType: { select: { name: true } } },
      }),
      prisma.post.findMany({
        where: { authorId: userId, status: { not: 'DELETED' } },
        select: { id: true, category: true, title: true, content: true, likeCount: true, commentCount: true, status: true, createdAt: true, editedAt: true, cancerType: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.comment.findMany({
        where: { authorId: userId, status: { not: 'DELETED' } },
        select: { id: true, postId: true, content: true, status: true, createdAt: true, editedAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.roomMessage.findMany({
        where: { senderId: userId, status: { not: 'DELETED' } },
        select: { id: true, content: true, status: true, createdAt: true, room: { select: { name: true } } },
        orderBy: { id: 'asc' },
      }),
      prisma.directMessage.findMany({
        where: { senderId: userId, status: { not: 'DELETED' } },
        select: { id: true, conversationId: true, content: true, status: true, createdAt: true },
        orderBy: { id: 'asc' },
      }),
      prisma.follow.findMany({ where: { followerId: userId }, select: { createdAt: true, following: { select: { username: true } } } }),
      prisma.block.findMany({ where: { blockerId: userId }, select: { createdAt: true, blocked: { select: { username: true } } } }),
      prisma.report.findMany({
        where: { reporterId: userId },
        select: { targetType: true, reason: true, description: true, status: true, createdAt: true },
      }),
      prisma.media.findMany({ where: { uploaderId: userId }, select: { url: true, mimeType: true, sizeBytes: true, createdAt: true } }),
      prisma.refreshToken.findMany({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
        select: { createdAt: true, expiresAt: true, deviceInfo: true, ipAddress: true },
      }),
      prisma.pushToken.findMany({ where: { userId }, select: { platform: true, createdAt: true } }),
      prisma.authIdentity.findMany({ where: { userId }, select: { provider: true, email: true, createdAt: true } }),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    notice:
      'Bu dosya OnkoBağ hesabınıza ait kişisel verilerin kopyasıdır (KVKK m. 11). Sağlık verisi içerir; güvenli saklayın.',
    account: user,
    linkedAccounts: identities,
    cancerProfiles: profiles.map(({ cancerType, ...p }) => ({ cancerType: cancerType.name, ...p })),
    posts: posts.map(({ cancerType, ...p }) => ({ community: cancerType.name, ...p })),
    comments,
    roomMessages: roomMessages.map(({ room, ...m }) => ({ room: room.name, ...m })),
    directMessagesSent: directMessages,
    following: following.map((f) => ({ username: f.following.username, since: f.createdAt })),
    blocked: blocks.map((b) => ({ username: b.blocked.username, since: b.createdAt })),
    reportsMade: reports,
    uploadedMedia: media,
    activeSessions: sessions,
    notificationDevices: devices,
  };
}

/** Verilerin kopyasını kullanıcının e-posta adresine ek olarak gönderir */
async function emailExport(userId) {
  const data = await buildExport(userId);
  if (!data.account.emailVerifiedAt) {
    throw ApiError.forbidden('Verilerinin gönderilebilmesi için önce e-posta adresini doğrulamalısın', { code: 'EMAIL_NOT_VERIFIED' });
  }
  const json = JSON.stringify(data, (key, value) => (typeof value === 'bigint' ? value.toString() : value), 2);
  try {
    await mailer.sendDataExport(data.account.email, json);
  } catch (err) {
    console.error('Veri dışa aktarma e-postası gönderilemedi:', err.message);
    throw new ApiError(502, 'E-posta gönderilemedi, lütfen daha sonra tekrar deneyin', { code: 'MAIL_FAILED' });
  }
}

module.exports = { buildExport, emailExport };
