// Google ve Apple kimlik token'larının (ID token) doğrulanması.
// Token imzası sağlayıcının açık anahtarlarıyla, "iss" ve "aud" alanları
// yapılandırmayla, süresi ve (Apple'da) tekrar oynatmaya karşı nonce kontrol edilir.
// Dönen değer: { providerUserId, email, emailVerified, name }
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');

const invalid = (provider) =>
  ApiError.unauthorized(`${provider} oturumu doğrulanamadı, lütfen tekrar deneyin`, { code: 'SOCIAL_TOKEN_INVALID' });

const googleClient = new OAuth2Client();

async function verifyGoogle(idToken) {
  if (!env.googleClientIds.length) {
    throw ApiError.badRequest('Google ile giriş henüz yapılandırılmadı', { code: 'PROVIDER_NOT_CONFIGURED' });
  }
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: env.googleClientIds });
    payload = ticket.getPayload();
  } catch {
    throw invalid('Google');
  }
  return {
    providerUserId: payload.sub,
    email: payload.email?.toLowerCase() ?? null,
    emailVerified: payload.email_verified === true,
    name: payload.name ?? null,
  };
}

const APPLE_ISSUER = 'https://appleid.apple.com';
let appleKeySet = null;

async function verifyApple(identityToken, rawNonce) {
  // jose yalnızca ESM olarak dağıtılır
  const { createRemoteJWKSet, jwtVerify } = await import('jose');
  appleKeySet ??= createRemoteJWKSet(new URL(`${APPLE_ISSUER}/auth/keys`));

  let payload;
  try {
    ({ payload } = await jwtVerify(identityToken, appleKeySet, {
      issuer: APPLE_ISSUER,
      audience: env.appleAudiences,
    }));
  } catch {
    throw invalid('Apple');
  }

  // İstemci Apple'a nonce'un SHA-256 özetini gönderir; token'daki değer ham nonce'un özetiyle eşleşmeli
  const expected = rawNonce ? crypto.createHash('sha256').update(rawNonce).digest('hex') : null;
  if (!expected || payload.nonce !== expected) throw invalid('Apple');

  return {
    providerUserId: payload.sub,
    email: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
    emailVerified: payload.email_verified === true || payload.email_verified === 'true',
    name: null, // Apple adı token'da değil, yalnızca ilk girişte istemciye verir
  };
}

/** Testlerde ağ erişimi olmadan sahte doğrulayıcı takılabilmesi için nesne olarak dışa aktarılır */
const verifiers = { GOOGLE: verifyGoogle, APPLE: verifyApple };

module.exports = { verifiers };
