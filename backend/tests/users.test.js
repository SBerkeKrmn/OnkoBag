const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, prisma, resetDb, createUser, auth } = require('./helpers');

describe('Kullanıcılar, profil, takip ve engelleme', () => {
  let ali;
  let zeynep;
  let mert;

  before(async () => {
    await resetDb();
    ali = await createUser({ cancerTypeId: 1, status: 'ACTIVE_TREATMENT' });
    zeynep = await createUser({ cancerTypeId: 1, status: 'SURVIVOR' });
    mert = await createUser({ cancerTypeId: 2, status: 'SURVIVOR' });
  });
  after(() => prisma.$disconnect());

  test('Profil güncelleme', async () => {
    const res = await api()
      .patch('/api/v1/users/me')
      .set(auth(ali.accessToken))
      .send({ displayName: 'Ali', bio: 'Tedavimin 3. ayındayım', city: 'İstanbul', dmPermission: 'FOLLOWING' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.displayName, 'Ali');
    assert.equal(res.body.data.dmPermission, 'FOLLOWING');
  });

  test('İkinci kanser profili eklenince ilgili odaya da katılır', async () => {
    const res = await api()
      .post('/api/v1/users/me/cancer-profiles')
      .set(auth(zeynep.accessToken))
      .send({ cancerTypeId: 3, status: 'ACTIVE_TREATMENT' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.cancerProfiles.length, 2);

    const rooms = await prisma.roomMembership.count({ where: { userId: zeynep.id } });
    assert.equal(rooms, 2);

    const dup = await api()
      .post('/api/v1/users/me/cancer-profiles')
      .set(auth(zeynep.accessToken))
      .send({ cancerTypeId: 3, status: 'SURVIVOR' });
    assert.equal(dup.status, 409);
  });

  test('Profil silinince odadan çıkar; son profil silinemez', async () => {
    const me = await api().get('/api/v1/users/me').set(auth(zeynep.accessToken));
    const second = me.body.data.cancerProfiles.find((p) => p.cancerType.id === 3);

    const del = await api().delete(`/api/v1/users/me/cancer-profiles/${second.id}`).set(auth(zeynep.accessToken));
    assert.equal(del.status, 200);
    assert.equal(await prisma.roomMembership.count({ where: { userId: zeynep.id } }), 1);

    const last = del.body.data.cancerProfiles[0];
    const res = await api().delete(`/api/v1/users/me/cancer-profiles/${last.id}`).set(auth(zeynep.accessToken));
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'LAST_PROFILE');
  });

  test('Hasta–iyileşen önerisi: aynı kanser türündeki iyileşenler', async () => {
    const res = await api().get('/api/v1/users/me/suggestions').set(auth(ali.accessToken));
    assert.equal(res.status, 200);
    const ids = res.body.data.map((s) => s.user.id);
    assert.ok(ids.includes(zeynep.id), 'aynı türdeki iyileşen önerilmeli');
    assert.ok(!ids.includes(mert.id), 'farklı türdeki iyileşen önerilmemeli');
  });

  test('Takip etme bildirim üretir ve profil ilişkisine yansır', async () => {
    const res = await api().post(`/api/v1/users/${zeynep.id}/follow`).set(auth(ali.accessToken));
    assert.equal(res.status, 204);

    const profile = await api().get(`/api/v1/users/${zeynep.id}`).set(auth(ali.accessToken));
    assert.equal(profile.body.data.relationship.isFollowing, true);
    assert.equal(profile.body.data.stats.followers, 1);
    assert.equal(profile.body.data.email, undefined, 'e-posta başkalarına gösterilmemeli');

    const notif = await prisma.notification.findFirst({ where: { userId: zeynep.id, type: 'NEW_FOLLOWER' } });
    assert.ok(notif);

    const followers = await api().get(`/api/v1/users/${zeynep.id}/followers`).set(auth(mert.accessToken));
    assert.equal(followers.body.data[0].id, ali.id);
  });

  test('Kullanıcı arama', async () => {
    const res = await api().get(`/api/v1/users/search?q=${zeynep.username.slice(0, 8)}`).set(auth(ali.accessToken));
    assert.equal(res.status, 200);
    assert.ok(res.body.data.some((u) => u.id === zeynep.id));
  });

  test('Engelleme: takip kalkar, profil görünmez olur, aramada çıkmaz', async () => {
    const res = await api().post(`/api/v1/users/${ali.id}/block`).set(auth(zeynep.accessToken));
    assert.equal(res.status, 204);

    assert.equal(await prisma.follow.count({ where: { followerId: ali.id, followingId: zeynep.id } }), 0);

    const profile = await api().get(`/api/v1/users/${zeynep.id}`).set(auth(ali.accessToken));
    assert.equal(profile.status, 404);

    const search = await api().get(`/api/v1/users/search?q=${zeynep.username}`).set(auth(ali.accessToken));
    assert.ok(!search.body.data.some((u) => u.id === zeynep.id));

    const follow = await api().post(`/api/v1/users/${zeynep.id}/follow`).set(auth(ali.accessToken));
    assert.equal(follow.status, 404);

    await api().delete(`/api/v1/users/${ali.id}/block`).set(auth(zeynep.accessToken));
    const again = await api().get(`/api/v1/users/${zeynep.id}`).set(auth(ali.accessToken));
    assert.equal(again.status, 200);
  });

  test('Hesap silme: veriler anonimleşir, giriş yapılamaz, oda sayacı düşer', async () => {
    const user = await createUser({ cancerTypeId: 5 });
    const room = await prisma.chatRoom.findFirst({ where: { cancerTypeId: 5, roomNumber: 1 } });
    assert.equal(room.memberCount, 1);

    const wrong = await api().delete('/api/v1/users/me').set(auth(user.accessToken)).send({ password: 'yanlis' });
    assert.equal(wrong.status, 400);

    const res = await api().delete('/api/v1/users/me').set(auth(user.accessToken)).send({ password: user.password });
    assert.equal(res.status, 204);

    const deleted = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(deleted.status, 'DELETED');
    assert.notEqual(deleted.email, user.email);

    const login = await api().post('/api/v1/auth/login').send({ email: user.email, password: user.password });
    assert.equal(login.status, 401);

    const roomAfter = await prisma.chatRoom.findUnique({ where: { id: room.id } });
    assert.equal(roomAfter.memberCount, 0);

    const me = await api().get('/api/v1/users/me').set(auth(user.accessToken));
    assert.equal(me.status, 401);
  });
});
