// Token ve kod üretimi / hash yardımcıları
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

/** Opak refresh token (URL güvenli, 384 bit) */
const randomToken = () => crypto.randomBytes(48).toString('base64url');

/** 6 haneli doğrulama kodu */
const randomCode = () => crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

/** Zamanlama saldırısına dayanıklı hash karşılaştırması */
const safeEqual = (a, b) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
};

// Algoritma sabitlenir: "alg: none" veya başka algoritmayla imzalanmış token kabul edilmez.
// Token içindeki "role" yalnızca bilgi amaçlıdır; yetki her istekte veritabanından okunur.
const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = 'onkobag-api';

const signAccessToken = (user) =>
  jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    algorithm: JWT_ALGORITHM,
    issuer: JWT_ISSUER,
  });

const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [JWT_ALGORITHM], issuer: JWT_ISSUER });
  // Sosyal kayıt token'ı gibi aynı anahtarla imzalanan başka türdeki token'lar oturum yerine kullanılamaz
  if (typeof payload.sub !== 'string' || payload.typ) throw new Error('Geçersiz token türü');
  return payload;
};

module.exports = { sha256, randomToken, randomCode, safeEqual, signAccessToken, verifyAccessToken };
