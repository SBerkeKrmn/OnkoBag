// Uygulama kapalıyken telefona bildirim (Expo Push Service).
// - Cihaz kimlikleri (Expo push token) push_tokens tablosunda tutulur; uygulama
//   giriş yapınca POST /users/me/push-tokens ile kaydeder
// - Gönderim ana işlemi beklemez ve bozmaz; hata yalnızca loglanır
// - Expo "DeviceNotRegistered" derse (uygulama silinmiş vb.) token silinir
// - Test ortamında ağa çıkılmaz; gönderilenler `sent` dizisine eklenir
// Belge: https://docs.expo.dev/push-notifications/sending-notifications/
const prisma = require('./prisma');
const env = require('../config/env');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

/** Testler için gönderim kaydı */
const sent = [];

async function postToExpo(messages) {
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'accept-encoding': 'gzip, deflate',
      'content-type': 'application/json',
      ...(env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
    },
    body: JSON.stringify(messages),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Expo Push ${res.status}: ${JSON.stringify(body?.errors ?? body)}`);
  return body?.data ?? [];
}

/**
 * Kullanıcıların tüm cihazlarına bildirim gönderir.
 * @param {string[]} userIds
 * @param {{ title: string, body: string, data?: object }} message
 */
async function sendToUsers(userIds, { title, body, data = {} }) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return;

  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: ids }, user: { status: 'ACTIVE' } },
    select: { token: true },
  });
  if (!tokens.length) return;

  const messages = tokens.map(({ token }) => ({
    to: token,
    title,
    body: body.length > 180 ? `${body.slice(0, 177)}…` : body,
    data,
    sound: 'default',
    channelId: 'default',
    priority: 'high',
  }));

  if (env.isTest) {
    sent.push(...messages);
    return;
  }

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const tickets = await postToExpo(batch);
    const dead = tickets
      .map((t, idx) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? batch[idx].to : null))
      .filter(Boolean);
    if (dead.length) await prisma.pushToken.deleteMany({ where: { token: { in: dead } } });
  }
}

/** Ana işlemi bekletmeden gönderir */
function sendToUsersSafe(userIds, message) {
  sendToUsers(userIds, message).catch((err) => console.error('Push bildirimi gönderilemedi:', err.message));
}

module.exports = { sendToUsers, sendToUsersSafe, sent };
