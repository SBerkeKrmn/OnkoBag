// İmzalı, süreli görsel bağlantıları.
//
// Görseller herkese açık bir adreste durmaz: /uploads/<anahtar> yalnızca geçerli
// bir imza (s) ve süre (e) ile açılır. İmzalı bağlantıyı yalnızca API üretir ve
// API bir içeriği zaten yalnızca görmeye yetkili kişiye döner:
//   - gönderi görselleri  → giriş yapmış her kullanıcı
//   - oda mesajı görselleri → yalnızca o odanın üyeleri (o kanser türü profili olanlar)
//   - özel mesaj görselleri → yalnızca sohbetin iki tarafı
//   - profil fotoğrafı     → giriş yapmış her kullanıcı
// Böylece bağlantı tahmin edilse ya da eski bir bağlantı ele geçirilse bile süresi
// dolunca açılmaz; imzasız adres hiç açılmaz.
//
// Süre penceresi: bağlantılar 6 saatlik dilimlerle üretilir ve en az 6, en çok 12
// saat geçerlidir. Aynı dilimde aynı görsel için aynı bağlantı üretildiğinden
// telefondaki görsel önbelleği çalışmaya devam eder.
const crypto = require('crypto');
const env = require('../config/env');

const WINDOW_SECONDS = 6 * 60 * 60;
const KEY_PATTERN = /^[A-Za-z0-9-]{8,80}\.(jpg|png|webp|heic)$/;

// Ayrı bir ortam değişkeni gerektirmemek için JWT anahtarından türetilir
const signingKey = crypto.createHmac('sha256', env.JWT_ACCESS_SECRET).update('onkobag-media-url-v1').digest();

const signature = (key, exp) =>
  crypto.createHmac('sha256', signingKey).update(`${key}.${exp}`).digest('base64url').slice(0, 32);

const isValidKey = (key) => typeof key === 'string' && KEY_PATTERN.test(key);

function currentExpiry(now = Date.now()) {
  const nowSec = Math.floor(now / 1000);
  return (Math.floor(nowSec / WINDOW_SECONDS) + 2) * WINDOW_SECONDS;
}

/** Depolama anahtarından imzalı bağlantı üretir */
function signedUploadUrl(key, now = Date.now()) {
  const exp = currentExpiry(now);
  return `${env.PUBLIC_URL}/uploads/${key}?e=${exp}&s=${signature(key, exp)}`;
}

/** Veritabanındaki imzasız adresi (…/uploads/<anahtar>) imzalı bağlantıya çevirir */
function signUploadUrl(url) {
  if (!url) return url;
  const match = /\/uploads\/([^/?#]+)$/.exec(url);
  if (!match || !isValidKey(match[1])) return url;
  return signedUploadUrl(match[1]);
}

/** Medya nesnesinin (mediaSelect) adresini imzalar */
const signMedia = (m) => (m ? { ...m, url: signUploadUrl(m.url) } : m);

/** İmzayı ve süreyi doğrular */
function verifySignature(key, exp, sig, now = Date.now()) {
  const e = Number(exp);
  if (!isValidKey(key) || !Number.isInteger(e) || typeof sig !== 'string') return false;
  if (e * 1000 < now) return false;
  // Uzak gelecekli süre üretilemez (en çok 2 pencere)
  if (e > currentExpiry(now)) return false;
  const expected = Buffer.from(signature(key, e));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

module.exports = { signedUploadUrl, signUploadUrl, signMedia, verifySignature, isValidKey, currentExpiry };
