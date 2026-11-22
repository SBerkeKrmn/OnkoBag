// Entegrasyon testleri için ortak yardımcılar.
// NODE_ENV=test → .env.test (onkobag_test veritabanı) kullanılır.
process.env.NODE_ENV = 'test';

const http = require('http');
const request = require('supertest');
const { io: ioClient } = require('socket.io-client');

const app = require('../src/app');
const prisma = require('../src/lib/prisma');
const mailer = require('../src/lib/mailer');
const { initSocket } = require('../src/sockets');

const api = () => request(app);

/** Kullanıcı kaynaklı tüm verileri siler; kanser türleri ve varsayılan odalar kalır */
async function resetDb() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE users, reports, moderation_logs, conversations, room_messages RESTART IDENTITY CASCADE
  `);
  // Testlerin eklediği kanser türleri (slug "test-" ile başlar) ve ek odalar silinir
  await prisma.chatRoom.deleteMany({
    where: { OR: [{ roomNumber: { gt: 1 } }, { cancerType: { slug: { startsWith: 'test-' } } }] },
  });
  await prisma.cancerType.deleteMany({ where: { slug: { startsWith: 'test-' } } });
  await prisma.chatRoom.updateMany({ data: { memberCount: 0, maxMembers: 500, isActive: true, isDefault: true } });
  mailer.outbox.length = 0;
}

let counter = 0;

/** Kayıt olur; verified=true ise e-posta kodunu outbox'tan okuyup doğrular */
async function createUser({ verified = true, cancerTypeId = 1, status = 'ACTIVE_TREATMENT', role, ...overrides } = {}) {
  counter += 1;
  const suffix = `${Date.now().toString(36)}${counter}`;
  const body = {
    email: `user${suffix}@test.local`,
    password: 'Sifre1234',
    username: `user_${suffix}`,
    ageConfirmed: true,
    kvkkConsent: true,
    termsAccepted: true,
    cancerProfile: { cancerTypeId, status },
    ...overrides,
  };

  const res = await api().post('/api/v1/auth/register').send(body);
  if (res.status !== 201) throw new Error(`Kayıt başarısız: ${JSON.stringify(res.body)}`);

  const { user, accessToken, refreshToken } = res.body.data;

  if (verified) {
    const code = lastCodeFor(body.email);
    const v = await api().post('/api/v1/auth/verify-email').set(auth(accessToken)).send({ code });
    if (v.status !== 200) throw new Error(`Doğrulama başarısız: ${JSON.stringify(v.body)}`);
  }

  if (role) await prisma.user.update({ where: { id: user.id }, data: { role } });

  return { ...user, password: body.password, accessToken, refreshToken };
}

/** Outbox'taki son e-postadan 6 haneli kodu çıkarır */
function lastCodeFor(email) {
  const mail = [...mailer.outbox].reverse().find((m) => m.to === email);
  if (!mail) throw new Error(`${email} için e-posta yok`);
  return mail.text.match(/\b(\d{6})\b/)[1];
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

// --- Soket testleri için gerçek HTTP sunucusu ---------------------------------------

async function startServer() {
  const server = http.createServer(app);
  const io = initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  const url = `http://localhost:${server.address().port}`;
  return {
    url,
    close: () =>
      new Promise((resolve) => {
        io.close();
        server.close(resolve);
      }),
  };
}

function connectSocket(url, token) {
  return new Promise((resolve, reject) => {
    const socket = ioClient(url, { auth: { token }, transports: ['websocket'], forceNew: true });
    socket.once('ready', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

/** Belirli bir olayı bekler (zaman aşımıyla) */
function waitFor(socket, event, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} olayı gelmedi`)), timeout);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** Ack'li soket olayı gönderir */
const emitAck = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

module.exports = {
  api,
  prisma,
  mailer,
  resetDb,
  createUser,
  lastCodeFor,
  auth,
  startServer,
  connectSocket,
  waitFor,
  emitAck,
};
