// İstek sınırlayıcılar (kaba kuvvet ve kötüye kullanıma karşı).
//
// Gerçek istemci IP'si: Render önünde Cloudflare vardır; Express'in gördüğü
// req.ip her istekte değişebilen bir ara sunucu adresidir. Bu yüzden IP'ye göre
// sınırlama fiilen çalışmıyordu (her istek farklı "IP" sayılıyordu). Cloudflare,
// istemcinin gönderdiği değeri ezerek CF-Connecting-IP başlığını kendisi koyar;
// TRUST_CLOUDFLARE_IP=true iken bu başlık kullanılır. Doğrudan erişilen (Cloudflare
// olmayan) bir sunucuda bu ayar açılmamalıdır, çünkü başlık o zaman taklit edilebilir.
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const env = require('../config/env');

function clientIp(req) {
  if (env.trustCloudflareIp) {
    const cf = req.headers['cf-connecting-ip'];
    if (typeof cf === 'string' && cf.length > 0 && cf.length < 64) return cf.trim();
  }
  return req.ip;
}

const byIp = (req) => ipKeyGenerator(clientIp(req));

const json = (message) => ({ error: { message, code: 'RATE_LIMITED' } });

function limiter({ windowMs, limit, keyGenerator = byIp, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit,
    keyGenerator,
    skipSuccessfulRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.isTest,
    message: json(message),
    // Anahtarı kendimiz ürettiğimiz için kütüphanenin IP doğrulama uyarıları kapatılır
    validate: { xForwardedForHeader: false, keyGeneratorIpFallback: false },
  });
}

/** Tüm API: IP başına 15 dakikada 1000 istek */
const apiLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  message: 'Çok fazla istek gönderdiniz, lütfen biraz sonra tekrar deneyin',
});

/** Giriş, kayıt, kod doğrulama: IP başına 15 dakikada 20 deneme */
const authLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: 'Çok fazla deneme yaptınız, lütfen 15 dakika sonra tekrar deneyin',
});

/**
 * Hesap başına başarısız giriş sınırı: saldırgan IP değiştirse de aynı hesaba
 * 15 dakikada en fazla 10 hatalı şifre denenebilir (başarılı girişler sayılmaz).
 */
const loginPerAccountLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `login:${String(req.body?.email ?? '').trim().toLowerCase()}`,
  message: 'Bu hesap için çok fazla hatalı giriş denemesi yapıldı, lütfen 15 dakika sonra tekrar deneyin',
});

/** Kod doğrulama/şifre sıfırlama: e-posta başına 15 dakikada 10 deneme */
const codePerAccountLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => `code:${String(req.body?.email ?? req.user?.id ?? '').trim().toLowerCase()}`,
  message: 'Çok fazla kod denemesi yapıldı, lütfen 15 dakika sonra tekrar deneyin',
});

module.exports = { clientIp, apiLimiter, authLimiter, loginPerAccountLimiter, codePerAccountLimiter, limiter };
