// Prisma select tanımları ve API yanıt biçimlendiricileri.
// Şifre hash'i, e-posta gibi alanlar hiçbir zaman başka kullanıcılara dönmez.

const cancerTypeSelect = { id: true, name: true, slug: true };

/** Başka kullanıcılara gösterilen asgari kullanıcı bilgisi + ana kanser profili */
const publicUserSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  status: true,
  cancerProfiles: {
    where: { isPrimary: true },
    take: 1,
    select: { status: true, isVerified: true, cancerType: { select: cancerTypeSelect } },
  },
};

/**
 * publicUserSelect ile çekilen kullanıcıyı düz bir nesneye çevirir.
 * Silinmiş kullanıcılar ve null gönderenler için `null` döner.
 */
function formatPublicUser(user) {
  if (!user || user.status === 'DELETED') return null;
  const primary = user.cancerProfiles?.[0];
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    primaryCancer: primary
      ? { status: primary.status, isVerified: primary.isVerified, cancerType: primary.cancerType }
      : null,
  };
}

const mediaSelect = { id: true, url: true, mimeType: true, width: true, height: true };

module.exports = { cancerTypeSelect, publicUserSelect, formatPublicUser, mediaSelect };
