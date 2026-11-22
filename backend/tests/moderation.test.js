const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, prisma, resetDb, createUser, auth, startServer, connectSocket, waitFor } = require('./helpers');

describe('Bildirimler, şikayet ve moderasyon', () => {
  let admin;
  let mod;
  let user;
  let troll;
  let postId;

  before(async () => {
    await resetDb();
    admin = await createUser({ role: 'ADMIN', cancerTypeId: 1 });
    mod = await createUser({ role: 'MODERATOR', cancerTypeId: 1 });
    user = await createUser({ cancerTypeId: 1, status: 'SURVIVOR' });
    troll = await createUser({ cancerTypeId: 1 });

    const post = await api()
      .post('/api/v1/posts')
      .set(auth(troll.accessToken))
      .send({ cancerTypeId: 1, content: 'Kemoterapiye gerek yok, şu bitki çayı her şeyi iyileştirir!' });
    postId = post.body.data.id;
  });
  after(() => prisma.$disconnect());

  test('Normal kullanıcı yönetim paneline erişemez', async () => {
    const res = await api().get('/api/v1/admin/stats').set(auth(user.accessToken));
    assert.equal(res.status, 403);
  });

  test('Şikayet oluşturma: tekrar şikayet aynı kaydı döner, kendi içeriği şikayet edilemez', async () => {
    const body = { targetType: 'POST', targetId: postId, reason: 'MISINFORMATION', description: 'Tedaviyi bırakmaya teşvik ediyor' };
    const first = await api().post('/api/v1/reports').set(auth(user.accessToken)).send(body);
    assert.equal(first.status, 201);

    const again = await api().post('/api/v1/reports').set(auth(user.accessToken)).send(body);
    assert.equal(again.status, 200);
    assert.equal(again.body.data.id, first.body.data.id);

    const own = await api().post('/api/v1/reports').set(auth(troll.accessToken)).send(body);
    assert.equal(own.status, 400);

    const bad = await api()
      .post('/api/v1/reports')
      .set(auth(user.accessToken))
      .send({ ...body, targetType: 'ROOM_MESSAGE', targetId: 'abc' });
    assert.equal(bad.status, 400);
  });

  test('Moderatör şikayeti görür, içeriği gizler; şikayet sonuçlanır ve şikayetçi bilgilendirilir', async () => {
    const list = await api().get('/api/v1/admin/reports?status=PENDING').set(auth(mod.accessToken));
    assert.equal(list.status, 200);
    const report = list.body.data[0];
    assert.equal(report.target.exists, true);
    assert.equal(report.target.owner.id, troll.id);
    assert.match(report.target.text, /bitki çayı/);

    const hide = await api()
      .post(`/api/v1/admin/content/POST/${postId}/hide`)
      .set(auth(mod.accessToken))
      .send({ reason: 'Tehlikeli tıbbi yanlış bilgi', reportId: report.id });
    assert.equal(hide.status, 204);

    const view = await api().get(`/api/v1/posts/${postId}`).set(auth(user.accessToken));
    assert.equal(view.status, 404, 'gizlenen gönderi görünmemeli');

    const updated = await prisma.report.findUnique({ where: { id: report.id } });
    assert.equal(updated.status, 'RESOLVED');
    assert.equal(updated.reviewedById, mod.id);

    // Şikayet ID'si ile hide çağrıldığı için otomatik çözüldü; REPORT_RESOLVED bildirimi PATCH ile gönderilir
    const resolve = await api()
      .patch(`/api/v1/admin/reports/${report.id}`)
      .set(auth(mod.accessToken))
      .send({ status: 'RESOLVED', resolutionNote: 'Gönderi gizlendi' });
    assert.equal(resolve.status, 200);
    assert.equal(await prisma.notification.count({ where: { userId: user.id, type: 'REPORT_RESOLVED' } }), 1);

    const restore = await api()
      .post(`/api/v1/admin/content/POST/${postId}/restore`)
      .set(auth(mod.accessToken))
      .send({ reason: 'Test için geri alındı' });
    assert.equal(restore.status, 204);
    const visible = await api().get(`/api/v1/posts/${postId}`).set(auth(user.accessToken));
    assert.equal(visible.status, 200);
  });

  test('Kendine zarar riski şikayeti moderatörlere anlık iletilir', async () => {
    const server = await startServer();
    const s = await connectSocket(server.url, mod.accessToken);
    try {
      const urgent = waitFor(s, 'moderation:urgent-report');
      await api()
        .post('/api/v1/reports')
        .set(auth(user.accessToken))
        .send({ targetType: 'USER', targetId: troll.id, reason: 'SELF_HARM' });
      const event = await urgent;
      assert.equal(event.reason, 'SELF_HARM');
    } finally {
      s.disconnect();
      await server.close();
    }
  });

  test('Uyarı ve askıya alma: kullanıcı giriş yapamaz, mevcut token geçersiz olur', async () => {
    const warn = await api()
      .post(`/api/v1/admin/users/${troll.id}/warn`)
      .set(auth(mod.accessToken))
      .send({ reason: 'Yanlış tıbbi bilgi paylaşımı' });
    assert.equal(warn.status, 204);
    assert.equal(await prisma.notification.count({ where: { userId: troll.id, type: 'SYSTEM' } }), 1);

    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const suspend = await api()
      .post(`/api/v1/admin/users/${troll.id}/suspend`)
      .set(auth(mod.accessToken))
      .send({ until, reason: 'Tekrarlayan ihlal' });
    assert.equal(suspend.status, 204);

    const me = await api().get('/api/v1/users/me').set(auth(troll.accessToken));
    assert.equal(me.status, 403);
    assert.equal(me.body.error.code, 'ACCOUNT_SUSPENDED');

    const login = await api().post('/api/v1/auth/login').send({ email: troll.email, password: troll.password });
    assert.equal(login.status, 403);

    const refresh = await api().post('/api/v1/auth/refresh').send({ refreshToken: troll.refreshToken });
    assert.equal(refresh.status, 401);

    const unsuspend = await api().post(`/api/v1/admin/users/${troll.id}/unsuspend`).set(auth(mod.accessToken)).send({});
    assert.equal(unsuspend.status, 204);
    const login2 = await api().post('/api/v1/auth/login').send({ email: troll.email, password: troll.password });
    assert.equal(login2.status, 200);
  });

  test('Süresi dolan askı girişte otomatik kalkar', async () => {
    await prisma.user.update({
      where: { id: troll.id },
      data: { status: 'SUSPENDED', suspendedUntil: new Date(Date.now() - 1000) },
    });
    const login = await api().post('/api/v1/auth/login').send({ email: troll.email, password: troll.password });
    assert.equal(login.status, 200);
    assert.equal((await prisma.user.findUnique({ where: { id: troll.id } })).status, 'ACTIVE');
  });

  test('Moderatör yetkili hesapları askıya alamaz, rol değiştiremez; admin değiştirebilir', async () => {
    const res = await api()
      .post(`/api/v1/admin/users/${admin.id}/suspend`)
      .set(auth(mod.accessToken))
      .send({ reason: 'deneme' });
    assert.equal(res.status, 403);

    const role = await api().patch(`/api/v1/admin/users/${user.id}/role`).set(auth(mod.accessToken)).send({ role: 'MODERATOR' });
    assert.equal(role.status, 403);

    const ok = await api().patch(`/api/v1/admin/users/${user.id}/role`).set(auth(admin.accessToken)).send({ role: 'MODERATOR' });
    assert.equal(ok.status, 204);
    await api().patch(`/api/v1/admin/users/${user.id}/role`).set(auth(admin.accessToken)).send({ role: 'USER' });
  });

  test('İyileşen doğrulaması: bekleyen listesi, onay, bildirim ve rozet', async () => {
    const pending = await api().get('/api/v1/admin/survivor-verifications').set(auth(mod.accessToken));
    const item = pending.body.data.find((p) => p.user.id === user.id);
    assert.ok(item);

    const verify = await api().post(`/api/v1/admin/cancer-profiles/${item.id}/verify`).set(auth(mod.accessToken)).send({});
    assert.equal(verify.status, 204);

    const me = await api().get('/api/v1/users/me').set(auth(user.accessToken));
    assert.equal(me.body.data.cancerProfiles[0].isVerified, true);
    assert.equal(await prisma.notification.count({ where: { userId: user.id, type: 'SURVIVOR_VERIFIED' } }), 1);

    // Aktif hasta profili doğrulanamaz
    const patient = await prisma.userCancerProfile.findFirst({ where: { userId: troll.id } });
    const bad = await api().post(`/api/v1/admin/cancer-profiles/${patient.id}/verify`).set(auth(mod.accessToken)).send({});
    assert.equal(bad.status, 400);
  });

  test('Odada susturma: susturulan kullanıcı mesaj gönderemez', async () => {
    const room = await prisma.chatRoom.findFirst({ where: { cancerTypeId: 1, roomNumber: 1 } });
    const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const silence = await api()
      .post(`/api/v1/admin/rooms/${room.id}/members/${troll.id}/silence`)
      .set(auth(mod.accessToken))
      .send({ until, reason: 'Odada spam' });
    assert.equal(silence.status, 204);

    const login = await api().post('/api/v1/auth/login').send({ email: troll.email, password: troll.password });
    const msg = await api()
      .post(`/api/v1/rooms/${room.id}/messages`)
      .set(auth(login.body.data.accessToken))
      .send({ content: 'spam' });
    assert.equal(msg.status, 403);
    assert.equal(msg.body.error.code, 'SILENCED');
  });

  test('Oda kapatılınca üyeler aynı türdeki başka odaya taşınır', async () => {
    const created = await api().post('/api/v1/admin/rooms').set(auth(mod.accessToken)).send({ cancerTypeId: 1 });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.roomNumber, 2);

    const room1 = await prisma.chatRoom.findFirst({ where: { cancerTypeId: 1, roomNumber: 1 } });
    const memberCount = room1.memberCount;

    const close = await api().patch(`/api/v1/admin/rooms/${room1.id}`).set(auth(mod.accessToken)).send({ isActive: false });
    assert.equal(close.status, 200);
    assert.equal(close.body.data.movedMembers, memberCount);

    const room2 = await prisma.chatRoom.findUnique({ where: { id: created.body.data.id } });
    assert.equal(room2.memberCount, memberCount);
    assert.equal(room2.isDefault, true, 'varsayılanlık yeni odaya geçmeli');

    const myRooms = await api().get('/api/v1/rooms/me').set(auth(user.accessToken));
    assert.equal(myRooms.body.data[0].id, room2.id);
  });

  test('Admin yeni kanser türü ekler; varsayılan odası otomatik açılır', async () => {
    const body = { name: 'Test Göz Kanseri', slug: 'test-goz-kanseri', sortOrder: 99 };
    const forbidden = await api().post('/api/v1/admin/cancer-types').set(auth(mod.accessToken)).send(body);
    assert.equal(forbidden.status, 403);

    const res = await api().post('/api/v1/admin/cancer-types').set(auth(admin.accessToken)).send(body);
    assert.equal(res.status, 201);
    const rooms = await prisma.chatRoom.findMany({ where: { cancerTypeId: res.body.data.id } });
    assert.equal(rooms.length, 1);
    assert.equal(rooms[0].isDefault, true);

    const list = await api().get('/api/v1/cancer-types');
    assert.ok(list.body.data.some((c) => c.slug === 'test-goz-kanseri'));
  });

  test('Denetim kayıtları ve panel istatistikleri', async () => {
    const logs = await api().get(`/api/v1/admin/logs?targetUserId=${troll.id}`).set(auth(mod.accessToken));
    const actions = logs.body.data.map((l) => l.action);
    for (const a of ['HIDE_CONTENT', 'WARN_USER', 'SUSPEND_USER', 'UNSUSPEND_USER', 'SILENCE_IN_ROOM']) {
      assert.ok(actions.includes(a), `${a} kaydı olmalı`);
    }

    const stats = await api().get('/api/v1/admin/stats').set(auth(mod.accessToken));
    assert.equal(stats.status, 200);
    assert.ok(stats.body.data.users >= 4);
  });

  test('Bildirim listesi, okunmamış sayısı ve okundu işaretleme', async () => {
    const count = await api().get('/api/v1/notifications/unread-count').set(auth(user.accessToken));
    assert.ok(count.body.data.count >= 2);

    const list = await api().get('/api/v1/notifications?limit=1').set(auth(user.accessToken));
    assert.equal(list.body.data.length, 1);
    assert.ok(list.body.nextCursor);

    await api().post(`/api/v1/notifications/${list.body.data[0].id}/read`).set(auth(user.accessToken));
    const unread = await api().get('/api/v1/notifications?unreadOnly=true').set(auth(user.accessToken));
    assert.ok(!unread.body.data.some((n) => n.id === list.body.data[0].id));

    await api().post('/api/v1/notifications/read-all').set(auth(user.accessToken));
    const after0 = await api().get('/api/v1/notifications/unread-count').set(auth(user.accessToken));
    assert.equal(after0.body.data.count, 0);

    // Başkasının bildirimi okunamaz
    const other = await prisma.notification.findFirst({ where: { userId: troll.id } });
    const forbidden = await api().post(`/api/v1/notifications/${other.id}/read`).set(auth(user.accessToken));
    assert.equal(forbidden.status, 404);
  });
});
