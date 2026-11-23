const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { api, prisma, resetDb, createUser, auth } = require('./helpers');
const push = require('../src/lib/push');

// sendToUsersSafe beklenmeden çalışır; kısa bir bekleme ile kayda düşmesi sağlanır
const settle = () => new Promise((r) => setTimeout(r, 80));

describe('Telefon bildirimleri (push)', () => {
  let ayse;
  let mert;
  const ayseToken = 'ExponentPushToken[ayse-cihaz-0001]';

  before(async () => {
    await resetDb();
    ayse = await createUser({ cancerTypeId: 1, status: 'ACTIVE_TREATMENT' });
    mert = await createUser({ cancerTypeId: 1, status: 'SURVIVOR' });
  });
  beforeEach(() => {
    push.sent.length = 0;
  });
  after(() => prisma.$disconnect());

  test('Cihaz kaydı', async () => {
    const res = await api().post('/api/v1/users/me/push-tokens').set(auth(ayse.accessToken)).send({ token: ayseToken, platform: 'IOS' });
    assert.equal(res.status, 204);
    const row = await prisma.pushToken.findUnique({ where: { token: ayseToken } });
    assert.equal(row.userId, ayse.id);
  });

  test('Özel mesaj alıcının telefonuna gider, gönderene gitmez', async () => {
    const conv = await api().post('/api/v1/conversations').set(auth(mert.accessToken)).send({ userId: ayse.id });
    await api().post(`/api/v1/conversations/${conv.body.data.id}/messages`).set(auth(mert.accessToken)).send({ content: 'Merhaba Ayşe' });
    await settle();
    assert.equal(push.sent.length, 1);
    assert.equal(push.sent[0].to, ayseToken);
    assert.equal(push.sent[0].body, 'Merhaba Ayşe');
    assert.equal(push.sent[0].data.url, `/conversation/${conv.body.data.id}`);
  });

  test('Sessize alınan sohbet bildirim göndermez', async () => {
    const conv = await api().post('/api/v1/conversations').set(auth(ayse.accessToken)).send({ userId: mert.id });
    await api().post(`/api/v1/conversations/${conv.body.data.id}/mute`).set(auth(ayse.accessToken)).send({ muted: true });
    await api().post(`/api/v1/conversations/${conv.body.data.id}/messages`).set(auth(mert.accessToken)).send({ content: 'Sessiz' });
    await settle();
    assert.equal(push.sent.length, 0);
  });

  test('Takip bildirimi telefona metinle gider; çıkışta token silinir', async () => {
    await api().post(`/api/v1/users/${ayse.id}/follow`).set(auth(mert.accessToken));
    await settle();
    assert.equal(push.sent.length, 1);
    assert.match(push.sent[0].body, /takip etmeye başladı/);
    assert.equal(push.sent[0].data.url, `/user/${mert.id}`);

    const del = await api().delete('/api/v1/users/me/push-tokens').set(auth(ayse.accessToken)).send({ token: ayseToken });
    assert.equal(del.status, 204);
    assert.equal(await prisma.pushToken.count({ where: { token: ayseToken } }), 0);
  });
});
