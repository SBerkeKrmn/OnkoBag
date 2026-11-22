const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const {
  api,
  prisma,
  resetDb,
  createUser,
  auth,
  startServer,
  connectSocket,
  waitFor,
  emitAck,
} = require('./helpers');

describe('Birebir özel mesajlaşma', () => {
  let server;
  let elif;
  let can;
  let deniz;

  before(async () => {
    await resetDb();
    server = await startServer();
    elif = await createUser({ cancerTypeId: 1, status: 'ACTIVE_TREATMENT' });
    can = await createUser({ cancerTypeId: 1, status: 'SURVIVOR' });
    deniz = await createUser({ cancerTypeId: 1, status: 'SURVIVOR' });
  });

  after(async () => {
    await server.close();
    await prisma.$disconnect();
  });

  const start = (from, to) => api().post('/api/v1/conversations').set(auth(from.accessToken)).send({ userId: to.id });

  test('Sohbet başlatma idempotenttir (iki taraf için tek sohbet)', async () => {
    const a = await start(elif, can);
    assert.equal(a.status, 200);
    assert.equal(a.body.data.otherUser.id, can.id);

    const b = await start(can, elif);
    assert.equal(b.body.data.id, a.body.data.id);
    assert.equal(await prisma.conversation.count(), 1);
  });

  test('Mesajı olmayan sohbet listede görünmez', async () => {
    const list = await api().get('/api/v1/conversations').set(auth(elif.accessToken));
    assert.equal(list.body.data.length, 0);
  });

  test('Socket.io: mesaj alıcıya anlık ulaşır, görüldü bilgisi göndericiye döner', async () => {
    const conv = (await start(elif, can)).body.data;
    const sElif = await connectSocket(server.url, elif.accessToken);
    const sCan = await connectSocket(server.url, can.accessToken);

    try {
      const incoming = waitFor(sCan, 'dm:message:new');
      const ack = await emitAck(sElif, 'dm:send', { conversationId: conv.id, content: 'Merhaba, hikayeni okudum. Sorabilir miyim?' });
      assert.equal(ack.ok, true, JSON.stringify(ack));

      const msg = await incoming;
      assert.equal(msg.content, 'Merhaba, hikayeni okudum. Sorabilir miyim?');
      assert.equal(msg.conversationId, conv.id);

      const typing = waitFor(sElif, 'dm:typing');
      await emitAck(sCan, 'dm:typing', { conversationId: conv.id });
      assert.equal((await typing).userId, can.id);

      const listBefore = await api().get('/api/v1/conversations').set(auth(can.accessToken));
      assert.equal(listBefore.body.data[0].unreadCount, 1);
      assert.equal(listBefore.body.data[0].lastMessage.id, msg.id);

      const seen = waitFor(sElif, 'dm:read');
      await emitAck(sCan, 'dm:read', { conversationId: conv.id, messageId: msg.id });
      assert.equal((await seen).messageId, msg.id);

      const listAfter = await api().get('/api/v1/conversations').set(auth(can.accessToken));
      assert.equal(listAfter.body.data[0].unreadCount, 0);
    } finally {
      sElif.disconnect();
      sCan.disconnect();
    }
  });

  test('Katılımcı olmayan kullanıcı sohbeti göremez', async () => {
    const conv = (await start(elif, can)).body.data;
    const res = await api().get(`/api/v1/conversations/${conv.id}/messages`).set(auth(deniz.accessToken));
    assert.equal(res.status, 404);

    const send = await api()
      .post(`/api/v1/conversations/${conv.id}/messages`)
      .set(auth(deniz.accessToken))
      .send({ content: 'araya girme' });
    assert.equal(send.status, 404);
  });

  test('DM izni: NOBODY ve FOLLOWING kuralları', async () => {
    await api().patch('/api/v1/users/me').set(auth(deniz.accessToken)).send({ dmPermission: 'NOBODY' });
    const blocked = await start(elif, deniz);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.error.code, 'DM_NOT_ALLOWED');

    await api().patch('/api/v1/users/me').set(auth(deniz.accessToken)).send({ dmPermission: 'FOLLOWING' });
    const notFollowed = await start(elif, deniz);
    assert.equal(notFollowed.status, 403);

    // Deniz, Elif'i takip edince Elif mesaj başlatabilir
    await api().post(`/api/v1/users/${elif.id}/follow`).set(auth(deniz.accessToken));
    const allowed = await start(elif, deniz);
    assert.equal(allowed.status, 200);
  });

  test('Engelleme sonrası mesaj gönderilemez ve yeni sohbet başlatılamaz', async () => {
    const conv = (await start(elif, can)).body.data;
    await api().post(`/api/v1/users/${elif.id}/block`).set(auth(can.accessToken));

    const send = await api()
      .post(`/api/v1/conversations/${conv.id}/messages`)
      .set(auth(elif.accessToken))
      .send({ content: 'merhaba?' });
    assert.equal(send.status, 403);
    assert.equal(send.body.error.code, 'BLOCKED');

    const again = await start(elif, can);
    assert.equal(again.status, 404);

    await api().delete(`/api/v1/users/${elif.id}/block`).set(auth(can.accessToken));
  });

  test('Sohbeti silme yalnızca silen kişiden gizler; yeni mesajla geri gelir', async () => {
    const conv = (await start(elif, can)).body.data;
    await api().post(`/api/v1/conversations/${conv.id}/messages`).set(auth(elif.accessToken)).send({ content: 'eski mesaj' });

    const del = await api().delete(`/api/v1/conversations/${conv.id}`).set(auth(can.accessToken));
    assert.equal(del.status, 204);

    const canList = await api().get('/api/v1/conversations').set(auth(can.accessToken));
    assert.ok(!canList.body.data.some((c) => c.id === conv.id));
    const elifList = await api().get('/api/v1/conversations').set(auth(elif.accessToken));
    assert.ok(elifList.body.data.some((c) => c.id === conv.id), 'karşı taraf etkilenmemeli');

    await new Promise((r) => setTimeout(r, 5));
    await api().post(`/api/v1/conversations/${conv.id}/messages`).set(auth(elif.accessToken)).send({ content: 'yeni mesaj' });
    const canList2 = await api().get('/api/v1/conversations').set(auth(can.accessToken));
    assert.ok(canList2.body.data.some((c) => c.id === conv.id));

    const msgs = await api().get(`/api/v1/conversations/${conv.id}/messages`).set(auth(can.accessToken));
    assert.deepEqual(
      msgs.body.data.map((m) => m.content),
      ['yeni mesaj'],
      'silme öncesi mesajlar gösterilmemeli',
    );
  });

  test('Mesaj silme yalnızca gönderene açık', async () => {
    const conv = (await start(elif, can)).body.data;
    const sent = await api()
      .post(`/api/v1/conversations/${conv.id}/messages`)
      .set(auth(elif.accessToken))
      .send({ content: 'yanlış kişiye' });

    const foreign = await api()
      .delete(`/api/v1/conversations/${conv.id}/messages/${sent.body.data.id}`)
      .set(auth(can.accessToken));
    assert.equal(foreign.status, 403);

    const own = await api()
      .delete(`/api/v1/conversations/${conv.id}/messages/${sent.body.data.id}`)
      .set(auth(elif.accessToken));
    assert.equal(own.status, 204);
  });
});
