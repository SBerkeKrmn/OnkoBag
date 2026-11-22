// JWT doğrulama, hesap durumu kontrolü ve rol tabanlı yetkilendirme.
// Hesap askıya alınırsa veya rol değişirse token süresini beklemeden etkili olsun
// diye her istekte kullanıcının güncel durumu veritabanından okunur.
const prisma = require('../lib/prisma');
const ApiError = require('../utils/ApiError');
const { verifyAccessToken } = require('../utils/tokens');

const authUserSelect = { id: true, role: true, status: true, suspendedUntil: true, emailVerifiedAt: true };

/** Token'dan kullanıcıyı çözer, hesap durumunu kontrol eder. Hata durumunda ApiError fırlatır. */
async function authenticateToken(token) {
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Oturum geçersiz veya süresi dolmuş', { code: 'TOKEN_INVALID' });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: authUserSelect });

  if (!user || user.status === 'DELETED') {
    throw ApiError.unauthorized('Hesap bulunamadı', { code: 'ACCOUNT_NOT_FOUND' });
  }

  if (user.status === 'SUSPENDED' && (!user.suspendedUntil || user.suspendedUntil > new Date())) {
    throw ApiError.forbidden('Hesabınız askıya alınmıştır', {
      code: 'ACCOUNT_SUSPENDED',
      details: { suspendedUntil: user.suspendedUntil },
    });
  }

  return { id: user.id, role: user.role, emailVerified: Boolean(user.emailVerifiedAt) };
}

/** Authorization: Bearer <token> başlığını doğrular → req.user = { id, role, emailVerified } */
async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized());
  }

  try {
    req.user = await authenticateToken(token);
    return next();
  } catch (err) {
    return next(err);
  }
}

/** İçerik üretme (gönderi, mesaj, yorum) için e-posta doğrulaması şartı */
function requireVerified(req, res, next) {
  if (!req.user?.emailVerified) {
    return next(ApiError.forbidden('Bu işlem için e-posta adresinizi doğrulamanız gerekiyor', { code: 'EMAIL_NOT_VERIFIED' }));
  }
  return next();
}

/** Yalnızca belirtilen sistem rollerine izin verir: requireRole('MODERATOR', 'ADMIN') */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden());
    }
    return next();
  };
}

const isStaff = (user) => user?.role === 'MODERATOR' || user?.role === 'ADMIN';

module.exports = { requireAuth, requireVerified, requireRole, authenticateToken, isStaff };
