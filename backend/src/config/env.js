// Ortam değişkenlerini yükler ve doğrular. Eksik/hatalı değer varsa uygulama başlamaz.
require('dotenv').config({ quiet: true });
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  CORS_ORIGIN: z.string().default('*'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Geçersiz ortam değişkenleri:', z.treeifyError(parsed.error));
  process.exit(1);
}

const env = parsed.data;

module.exports = {
  ...env,
  isProduction: env.NODE_ENV === 'production',
  corsOrigins: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
};
