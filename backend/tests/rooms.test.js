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

// 1x1 piksel PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

describe('Genel sohbet odaları', () => {
  let server;
  let hasta;
  let iyilesen;
  let room;

  before(async () => {
    await resetDb();
    server = await startServer();
    hasta = await createUser({ cancerTypeId: 1, status: 'ACTIVE_TREATMENT' });
    iyilesen = await createUser({ cancerTypeId: 1, status: 'SURVIVOR' });
    room = await prisma.chatRoom.findFirst({ where: { cancerTypeId: 1, roomNumber: 1 } });
  });

  after(async () => {
    await server.close();
    await prisma.$disconnect();
  });

  test('Kullanıcının odaları ve oda özeti (hasta/iyileşen dağılımı)', async () => {
    const list = await api().get('/api/v1/rooms/me').set(auth(hasta.accessToken));
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].id, room.id);
    assert.equal(list.body.data[0].memberCount, 2);

    const detail = await api().get(`/api/v1/rooms/${room.id}`).set(auth(hasta.accessToken));
    assert.deepEqual(detail.body.data.members, { activeTreatment: 1, survivors: 1 });
  });

  test('Üye olmayan kullanıcı odaya erişemez', async () => {
    const other = await createUser({ cancerTypeId: 2 });
    const res = await api().get(`/api/v1/rooms/${room.id}/messages`).set(auth(other.accessToken));
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'NOT_ROOM_MEMBER');
  });

  test('E-postası doğrulanmamış kullanıcı mesaj gönderemez', async () => {
    const unverified = await createUser({ cancerTypeId: 1, verified: false });
    const res = await api()
      .post(`/api/v1/rooms/${room.id}/messages`)
      .set(auth(unverified.accessToken))
      .send({ content: 'Merhaba' });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'EMAIL_NOT_VERIFIED');
  });

  test('Socket.io: mesaj odadaki diğer üyeye anlık ulaşır, okunmamış sayısı artar', async () => {
    const s1 = await connectSocket(server.url, hasta.accessToken);
    const s2 = await connectSocket(server.url, iyilesen.accessToken);

    try {
      const incoming = waitFor(s2, 'room:message:new');
      const ack = await emitAck(s1, 'room:send', { roomId: room.id, content: 'Kemoterapinin 2. kürü bugün, biraz endişeliyim' });
      assert.equal(ack.ok, true, JSON.stringify(ack));

      const msg = await incoming;
      assert.equal(msg.content, 'Kemoterapinin 2. kürü bugün, biraz endişeliyim');
      assert.equal(msg.sender.id, hasta.id);
      assert.equal(msg.sender.primaryCancer.status, 'ACTIVE_TREATMENT');

      const rooms = await api().get('/api/v1/rooms/me').set(auth(iyilesen.accessToken));
      assert.equal(rooms.body.data[0].unreadCount, 1);
      assert.equal(rooms.body.data[0].lastMessage.id, msg.id);

      // Yanıt + okundu
      const reply = await emitAck(s2, 'room:send', { roomId: room.id, content: 'Geçecek, ben de oradaydım 💜', replyToId: msg.id });
      assert.equal(reply.ok, true);
      assert.equal(reply.data.replyTo.id, msg.id);

      await emitAck(s2, 'room:read', { roomId: room.id, messageId: reply.data.id });
      const after = await api().get('/api/v1/rooms/me').set(auth(iyilesen.accessToken));
      assert.equal(after.body.data[0].unreadCount, 0);

      // Geçersiz veri ack ile hata döner
      const invalid = await emitAck(s1, 'room:send', { roomId: room.id, content: '' });
      assert.equal(invalid.ok, false);
    } finally {
      s1.disconnect();
      s2.disconnect();
    }
  });

  test('Geçersiz token ile soket bağlantısı reddedilir', async () => {
    await assert.rejects(connectSocket(server.url, 'gecersiz-token'));
  });

  test('Mesaj geçmişi sayfalama (eskiden yeniye, before cursor)', async () => {
    for (let i = 1; i <= 5; i += 1) {
      await api().post(`/api/v1/rooms/${room.id}/messages`).set(auth(hasta.accessToken)).send({ content: `mesaj ${i}` });
    }
    const page1 = await api().get(`/api/v1/rooms/${room.id}/messages?limit=3`).set(auth(iyilesen.accessToken));
    assert.equal(page1.body.data.length, 3);
    assert.equal(page1.body.data[2].content, 'mesaj 5');
    assert.ok(page1.body.nextCursor);

    const page2 = await api()
      .get(`/api/v1/rooms/${room.id}/messages?limit=3&before=${page1.body.nextCursor}`)
      .set(auth(iyilesen.accessToken));
    assert.equal(page2.body.data[2].content, 'mesaj 2');
  });

  test('Mesaj düzenleme ve silme yalnızca sahibine açık', async () => {
    const sent = await api().post(`/api/v1/rooms/${room.id}/messages`).set(auth(hasta.accessToken)).send({ content: 'yazım hatsı' });
    const id = sent.body.data.id;

    const foreign = await api()
      .patch(`/api/v1/rooms/${room.id}/messages/${id}`)
      .set(auth(iyilesen.accessToken))
      .send({ content: 'değiştir' });
    assert.equal(foreign.status, 403);

    const edit = await api()
      .patch(`/api/v1/rooms/${room.id}/messages/${id}`)
      .set(auth(hasta.accessToken))
      .send({ content: 'yazım hatası' });
    assert.equal(edit.body.data.content, 'yazım hatası');
    assert.ok(edit.body.data.editedAt);

    const del = await api().delete(`/api/v1/rooms/${room.id}/messages/${id}`).set(auth(hasta.accessToken));
    assert.equal(del.status, 204);

    const list = await api().get(`/api/v1/rooms/${room.id}/messages?limit=1`).set(auth(hasta.accessToken));
    assert.equal(list.body.data[0].status, 'DELETED');
    assert.equal(list.body.data[0].content, null, 'silinen mesajın içeriği dönmemeli');
  });

  test('Görsel yükleme ve mesaja ekleme; sahte görsel reddedilir', async () => {
    const fake = await api()
      .post('/api/v1/media')
      .set(auth(hasta.accessToken))
      .attach('file', Buffer.from('bu bir görsel değil'), { filename: 'x.png', contentType: 'image/png' });
    assert.equal(fake.status, 400);

    const upload = await api()
      .post('/api/v1/media')
      .set(auth(hasta.accessToken))
      .attach('file', PNG, { filename: 'foto.png', contentType: 'image/png' });
    assert.equal(upload.status, 201);

    const msg = await api()
      .post(`/api/v1/rooms/${room.id}/messages`)
      .set(auth(hasta.accessToken))
      .send({ mediaIds: [upload.body.data.id] });
    assert.equal(msg.status, 201);
    assert.equal(msg.body.data.type, 'IMAGE');
    assert.equal(msg.body.data.media.length, 1);

    // Aynı medya ikinci kez kullanılamaz; başkasının medyası da kullanılamaz
    const reuse = await api()
      .post(`/api/v1/rooms/${room.id}/messages`)
      .set(auth(iyilesen.accessToken))
      .send({ mediaIds: [upload.body.data.id] });
    assert.equal(reuse.status, 400);
  });

  test('Engellenen kullanıcının mesajları görünmez', async () => {
    await api().post(`/api/v1/rooms/${room.id}/messages`).set(auth(hasta.accessToken)).send({ content: 'engel testi' });
    await api().post(`/api/v1/users/${hasta.id}/block`).set(auth(iyilesen.accessToken));

    const list = await api().get(`/api/v1/rooms/${room.id}/messages?limit=100`).set(auth(iyilesen.accessToken));
    assert.ok(!list.body.data.some((m) => m.sender?.id === hasta.id));

    await api().delete(`/api/v1/users/${hasta.id}/block`).set(auth(iyilesen.accessToken));
  });

  test('Ölçeklenebilirlik: oda dolunca aynı türde yeni oda açılır', async () => {
    await prisma.chatRoom.update({ where: { id: room.id }, data: { maxMembers: 3 } });

    const third = await createUser({ cancerTypeId: 1 });
    const fourth = await createUser({ cancerTypeId: 1 });
    const fifth = await createUser({ cancerTypeId: 1 });

    const roomOf = async (u) =>
      (await prisma.roomMembership.findFirst({ where: { userId: u.id }, include: { room: true } })).room;

    // Önceki testlerden 1 doğrulanmamış kullanıcı da odada; 3. kullanıcı ile oda doldu sayılır
    const r3 = await roomOf(third);
    const r4 = await roomOf(fourth);
    const r5 = await roomOf(fifth);

    assert.equal(r4.roomNumber, 2, 'kapasite dolunca #2 açılmalı');
    assert.equal(r4.name, `${(await prisma.cancerType.findUnique({ where: { id: 1 } })).name} Genel Sohbet #2`);
    assert.equal(r4.maxMembers, 3, 'yeni oda kapasiteyi devralmalı');
    assert.equal(r5.id, r4.id, 'boş yer varsa aynı ek odaya girmeli');
    assert.ok(r3.roomNumber >= 1);

    const rooms = await prisma.chatRoom.findMany({ where: { cancerTypeId: 1 } });
    assert.equal(rooms.filter((r) => r.isDefault).length, 1, 'tek varsayılan oda olmalı');
  });

  test('Eşzamanlı kayıtlarda kapasite aşılmaz (advisory lock)', async () => {
    const r = await prisma.chatRoom.findFirst({ where: { cancerTypeId: 7, roomNumber: 1 } });
    await prisma.chatRoom.update({ where: { id: r.id }, data: { maxMembers: 2 } });

    await Promise.all(Array.from({ length: 6 }, () => createUser({ cancerTypeId: 7, verified: false })));

    const rooms = await prisma.chatRoom.findMany({ where: { cancerTypeId: 7 }, orderBy: { roomNumber: 'asc' } });
    assert.equal(rooms.length, 3);
    for (const x of rooms) {
      const actual = await prisma.roomMembership.count({ where: { roomId: x.id } });
      assert.equal(x.memberCount, actual, 'sayaç gerçek üye sayısıyla eşleşmeli');
      assert.ok(actual <= 2, 'kapasite aşılmamalı');
    }
  });
});
