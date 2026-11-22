// Test veritabanını (onkobag_test) hazırlar. Yıkıcı değildir:
//  1) Veritabanı yoksa oluşturur
//  2) Bekleyen migration'ları uygular (prisma migrate deploy)
//  3) Seed'i çalıştırır (idempotent: kanser türleri + varsayılan odalar)
// Testler her dosyanın başında kullanıcı verilerini kendileri temizler (tests/helpers.js).
// Kullanım: npm run test:db
const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

const root = path.resolve(__dirname, '..');
const { parsed } = dotenv.config({ path: path.join(root, '.env.test'), quiet: true, processEnv: {} });

const testUrl = new URL(parsed.DATABASE_URL);
const dbName = testUrl.pathname.slice(1);
if (!dbName.endsWith('_test')) {
  throw new Error(`Güvenlik: test veritabanı adı "_test" ile bitmeli (bulunan: ${dbName})`);
}

async function ensureDatabase() {
  const adminUrl = new URL(parsed.DATABASE_URL);
  adminUrl.pathname = '/postgres';
  const admin = new PrismaClient({ datasourceUrl: adminUrl.toString() });
  try {
    const rows = await admin.$queryRaw`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (rows.length === 0) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
      console.log(`Veritabanı oluşturuldu: ${dbName}`);
    }
  } finally {
    await admin.$disconnect();
  }
}

async function main() {
  await ensureDatabase();
  const env = { ...process.env, DATABASE_URL: parsed.DATABASE_URL, NODE_ENV: 'test' };
  execSync('npx prisma migrate deploy', { cwd: root, stdio: 'inherit', env });
  execSync('npx prisma db seed', { cwd: root, stdio: 'inherit', env });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
