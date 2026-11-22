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

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(5),
});

const parsed = schema.safeParse(process.env);

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
};
