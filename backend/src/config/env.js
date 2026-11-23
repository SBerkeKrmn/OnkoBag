// Ortam değişkenlerini yükler ve doğrular. Eksik/hatalı değer varsa uygulama başlamaz.
// NODE_ENV=test iken .env.test, aksi halde .env okunur.
const path = require('path');
const dotenv = require('dotenv');
const { z } = require('zod');

const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, '../../', envFile), quiet: true });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().nonnegative().default(3000),
  PUBLIC_URL: z.url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

  CORS_ORIGIN: z.string().default('*'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('OnkoBağ <no-reply@onkobag.local>'),

  // Google ile giriş: ID token'ın "aud" alanında kabul edilecek OAuth istemci kimlikleri (virgülle)
  GOOGLE_CLIENT_IDS: z.string().default(''),
  // Apple ile giriş: kabul edilecek "aud" değerleri. host.exp.Exponent = Expo Go ile geliştirme
  APPLE_AUDIENCES: z.string().default('com.onkobag.app,host.exp.Exponent'),

  // disk: UPLOAD_DIR klasörü (geliştirme) · database: görseller PostgreSQL'de (bulut, kalıcı disk yoksa)
  STORAGE_DRIVER: z.enum(['disk', 'database']).default('disk'),
  UPLOAD_DIR: z.string().default('uploads'),
  // Expo panelinde "Enhanced push security" açılırsa gerekir; aksi halde boş bırakılır
  EXPO_ACCESS_TOKEN: z.string().optional(),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(5),
});

// Render gibi servisler dış adresi kendisi verir; PUBLIC_URL ayrıca girilmediyse o kullanılır
const parsed = schema.safeParse({
  ...process.env,
  PUBLIC_URL: process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || undefined,
});

if (!parsed.success) {
  console.error('Geçersiz ortam değişkenleri:', JSON.stringify(z.treeifyError(parsed.error), null, 2));
  process.exit(1);
}

const env = parsed.data;

module.exports = {
  ...env,
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
  corsOrigins: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  uploadDir: path.resolve(__dirname, '../../', env.UPLOAD_DIR),
  googleClientIds: env.GOOGLE_CLIENT_IDS.split(',').map((s) => s.trim()).filter(Boolean),
  appleAudiences: env.APPLE_AUDIENCES.split(',').map((s) => s.trim()).filter(Boolean),
};
