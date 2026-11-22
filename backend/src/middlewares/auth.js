// JWT access token doğrulama ve rol tabanlı yetkilendirme
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

/** Authorization: Bearer <token> başlığını doğrular, req.user = { id, role } */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized());
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(ApiError.unauthorized('Oturum geçersiz veya süresi dolmuş'));
  }
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

module.exports = { requireAuth, requireRole, verifyAccessToken };
