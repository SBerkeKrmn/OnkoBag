// Güvenlik testleri: yetki yükseltme, sahte token, başkasının verisine erişim (IDOR),
// veri sızıntısı, askıya alma ve KVKK (silme / veri kopyası). Her test bir saldırı
// denemesidir ve reddedilmesi beklenir.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { api, prisma, resetDb, createUser, auth, lastCodeFor } = require('./helpers');
const env = require('../src/config/env');
const mailer = require('../src/lib/mailer');
const { clientIp } = require('../src/lib/rateLimits');

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

describe('Güvenlik', () => {
  let ali; // normal kullanıcı (saldırgan)
  let zeynep; // normal kullanıcı (kurban)
  let mod; // moderatör
  let admin; // yönetici

  before(async () => {
    await resetDb();
    ali = await createUser({ cancerTypeId: 1 });
    zeynep = await createUser({ cancerTypeId: 1, status: 'SURVIVOR' });
    mod = await createUser({ cancerTypeId: 2, role: 'MODERATOR' });
    admin = await createUser({ cancerTypeId: 2, role: 'ADMIN' });
  });
  after(() => prisma.$disconnect());

  // --- Yetki yükseltme -------------------------------------------------------------------

  describe('Kullanıcı kendini moderatör/yönetici yapamaz', () => {
    test('Profil güncellemesinde role/status/email alanları yok sayılır', async () => {
      const res = await api()
        .patch('/api/v1/users/me')
        .set(auth(ali.accessToken))
        .send({ bio: 'merhaba', role: 'ADMIN', status: 'ACTIVE', email: 'x@y.com', emailVerifiedAt: null });
      assert.equal(res.status, 200);
      const row = await prisma.user.findUnique({ where: { id: ali.id } });
      assert.equal(row.role, 'USER');
      assert.notEqual(row.email, 'x@y.com');
    });

    test('Kayıt olurken role: ADMIN gönderilse de USER olarak oluşturulur', async () => {
      const res = await api()
        .post('/api/v1/auth/register')
        .send({
          email: `rol${Date.now()}@test.local`,
          password: 'Sifre1234',
          username: `rol_${Date.now().toString(36)}`,
          role: 'ADMIN',
          ageConfirmed: true,
          kvkkConsent: true,
          termsAccepted: true,
          cancerProfile: { cancerTypeId: 1, status: 'ACTIVE_TREATMENT' },
        });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.user.role, 'USER');
    });

    test('Normal kullanıcı yönetim uç noktalarına erişemez', async () => {
      for (const [method, path] of [
        ['get', '/api/v1/admin/stats'],
        ['get', '/api/v1/admin/reports'],
        ['get', '/api/v1/admin/users'],
        ['patch', `/api/v1/admin/users/${ali.id}/role`],
        ['post', `/api/v1/admin/users/${zeynep.id}/suspend`],
      ]) {
        const res = await api()[method](path).set(auth(ali.accessToken)).send({ role: 'ADMIN', reason: 'deneme' });
        assert.equal(res.status, 403, `${method.toUpperCase()} ${path}`);
      }
      assert.equal((await prisma.user.findUnique({ where: { id: ali.id } })).role, 'USER');
    });

    test('Moderatör rol değiştiremez, yönetici hesabına işlem yapamaz', async () => {
      const promote = await api().patch(`/api/v1/admin/users/${mod.id}/role`).set(auth(mod.accessToken)).send({ role: 'ADMIN' });
      assert.equal(promote.status, 403);
      const other = await api().patch(`/api/v1/admin/users/${ali.id}/role`).set(auth(mod.accessToken)).send({ role: 'MODERATOR' });
      assert.equal(other.status, 403);
      const suspendAdmin = await api()
        .post(`/api/v1/admin/users/${admin.id}/suspend`)
        .set(auth(mod.accessToken))
        .send({ reason: 'deneme gerekçe' });
      assert.equal(suspendAdmin.status, 403);
    });

    test('Yönetici kendi rolünü değiştiremez/kendini askıya alamaz', async () => {
      const res = await api().patch(`/api/v1/admin/users/${admin.id}/role`).set(auth(admin.accessToken)).send({ role: 'USER' });
      assert.equal(res.status, 400);
    });

    test('Rol düşürülen yöneticinin eski token\'ı yetki vermez (rol her istekte DB\'den okunur)', async () => {
      const temp = await createUser({ cancerTypeId: 3, role: 'ADMIN' });
      await prisma.user.update({ where: { id: temp.id }, data: { role: 'USER' } });
      const res = await api().get('/api/v1/admin/stats').set(auth(temp.accessToken));
      assert.equal(res.status, 403);
    });
  });

  // --- Sahte / değiştirilmiş token ---------------------------------------------------------

  describe('Sahte token kabul edilmez', () => {
    test('Başka anahtarla imzalanmış, role: ADMIN içeren token', async () => {
      const forged = jwt.sign({ role: 'ADMIN' }, 'saldirganin-anahtari-1234567890', { subject: ali.id, issuer: 'onkobag-api' });
      const res = await api().get('/api/v1/users/me').set(auth(forged));
      assert.equal(res.status, 401);
    });

    test('"alg: none" token', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const body = Buffer.from(JSON.stringify({ sub: admin.id, role: 'ADMIN', iss: 'onkobag-api' })).toString('base64url');
      const res = await api().get('/api/v1/users/me').set(auth(`${header}.${body}.`));
      assert.equal(res.status, 401);
    });

    test('Doğru anahtarla imzalı ama oturum token\'ı olmayan (sosyal kayıt) token', async () => {
      const signup = jwt.sign({ typ: 'social-signup', sub: admin.id }, env.JWT_ACCESS_SECRET, {
        audience: 'onkobag-social-signup',
      });
      const res = await api().get('/api/v1/users/me').set(auth(signup));
      assert.equal(res.status, 401);
    });

    test('Süresi dolmuş token', async () => {
      const expired = jwt.sign({ role: 'USER' }, env.JWT_ACCESS_SECRET, {
        subject: ali.id,
        issuer: 'onkobag-api',
        expiresIn: -10,
      });
      const res = await api().get('/api/v1/users/me').set(auth(expired));
      assert.equal(res.status, 401);
    });
  });

  // --- Başkasının verisine erişim (IDOR) ----------------------------------------------------

  describe('Başkasının verisine erişilemez', () => {
    let conversationId;
    let zeynepPostId;
    let zeynepCommentId;

    before(async () => {
      const conv = await api().post('/api/v1/conversations').set(auth(zeynep.accessToken)).send({ userId: mod.id });
      conversationId = conv.body.data.id;
      await api().post(`/api/v1/conversations/${conversationId}/messages`).set(auth(zeynep.accessToken)).send({ content: 'Gizli mesaj' });
      const post = await api()
        .post('/api/v1/posts')
        .set(auth(zeynep.accessToken))
        .send({ cancerTypeId: 1, category: 'EXPERIENCE', content: 'Zeynep gönderisi' });
      zeynepPostId = post.body.data.id;
      const c = await api().post(`/api/v1/posts/${zeynepPostId}/comments`).set(auth(zeynep.accessToken)).send({ content: 'yorum' });
      zeynepCommentId = c.body.data.id;
    });

    test('Taraf olmadığı özel sohbetin mesajları okunamaz, sohbete yazılamaz', async () => {
      const read = await api().get(`/api/v1/conversations/${conversationId}/messages`).set(auth(ali.accessToken));
      assert.equal(read.status, 404);
      const detail = await api().get(`/api/v1/conversations/${conversationId}`).set(auth(ali.accessToken));
      assert.equal(detail.status, 404);
      const write = await api().post(`/api/v1/conversations/${conversationId}/messages`).set(auth(ali.accessToken)).send({ content: 'sızma' });
      assert.equal(write.status, 404);
    });

    test('Üyesi olmadığı odanın mesajları okunamaz', async () => {
      const room = await prisma.chatRoom.findFirst({ where: { cancerTypeId: 2 } });
      const res = await api().get(`/api/v1/rooms/${room.id}/messages`).set(auth(ali.accessToken));
      assert.equal(res.status, 403);
      const send = await api().post(`/api/v1/rooms/${room.id}/messages`).set(auth(ali.accessToken)).send({ content: 'x' });
      assert.equal(send.status, 403);
    });

    test('Başkasının gönderisi/yorumu düzenlenemez veya silinemez', async () => {
      assert.equal((await api().patch(`/api/v1/posts/${zeynepPostId}`).set(auth(ali.accessToken)).send({ content: 'değişti' })).status, 403);
      assert.equal((await api().delete(`/api/v1/posts/${zeynepPostId}`).set(auth(ali.accessToken))).status, 403);
      assert.equal((await api().patch(`/api/v1/comments/${zeynepCommentId}`).set(auth(ali.accessToken)).send({ content: 'x' })).status, 403);
      assert.equal((await api().delete(`/api/v1/comments/${zeynepCommentId}`).set(auth(ali.accessToken))).status, 403);
    });

    test('Başkasının yüklediği görsel kendi gönderisine eklenemez', async () => {
      const up = await api().post('/api/v1/media').set(auth(zeynep.accessToken)).attach('file', PNG, { filename: 'a.png', contentType: 'image/png' });
      const res = await api()
        .post('/api/v1/posts')
        .set(auth(ali.accessToken))
        .send({ cancerTypeId: 1, category: 'OTHER', content: 'çalıntı görsel', mediaIds: [up.body.data.id] });
      assert.equal(res.status, 400);
    });

    test('Başkasının bildirimi okundu yapılamaz', async () => {
      const n = await prisma.notification.create({ data: { userId: zeynep.id, type: 'SYSTEM', message: 'özel' } });
      const res = await api().post(`/api/v1/notifications/${n.id}/read`).set(auth(ali.accessToken));
      assert.equal(res.status, 404);
    });
  });

  // --- Veri sızıntısı ---------------------------------------------------------------------

  describe('Kişisel veri sızmaz', () => {
    test('Profil, arama, gönderi ve öneri yanıtlarında e-posta, şifre, doğum yılı yok', async () => {
      const responses = [
        await api().get(`/api/v1/users/${zeynep.id}`).set(auth(ali.accessToken)),
        await api().get(`/api/v1/users/search?q=${zeynep.username.slice(0, 6)}`).set(auth(ali.accessToken)),
        await api().get('/api/v1/posts/feed').set(auth(ali.accessToken)),
        await api().get('/api/v1/users/me/suggestions').set(auth(ali.accessToken)),
      ];
      for (const res of responses) {
        assert.equal(res.status, 200);
        const body = JSON.stringify(res.body);
        assert.ok(!body.includes(zeynep.email ?? '@test.local'), 'e-posta sızdı');
        assert.ok(!/passwordHash|password_hash|\$2[aby]\$/.test(body), 'şifre hash\'i sızdı');
        assert.ok(!/"birthYear"/.test(body), 'doğum yılı sızdı');
        assert.ok(!/kvkkConsentAt|refreshToken|tokenHash/.test(body), 'iç alan sızdı');
      }
    });

    test('Moderatör e-posta göremez, yönetici görür', async () => {
      const asMod = await api().get(`/api/v1/admin/users?q=${zeynep.username}`).set(auth(mod.accessToken));
      assert.equal(asMod.body.data[0].email, undefined);
      const asAdmin = await api().get(`/api/v1/admin/users?q=${zeynep.username}`).set(auth(admin.accessToken));
      assert.ok(asAdmin.body.data[0].email);
    });

    test('Üretim modunda sunucu hatası iç ayrıntı (hata mesajı, SQL) göstermez', () => {
      const { errorHandler } = require('../src/middlewares/errorHandler');
      const original = env.isProduction;
      const originalError = console.error;
      let body;
      const res = { status: () => res, json: (b) => { body = b; } };
      try {
        env.isProduction = true;
        console.error = () => {};
        errorHandler(new Error('Invalid `prisma.user.findMany()` invocation: secret detail'), {}, res, () => {});
      } finally {
        env.isProduction = original;
        console.error = originalError;
      }
      assert.equal(body.error.code, 'INTERNAL');
      assert.equal(body.error.details, undefined);
      assert.ok(!JSON.stringify(body).includes('prisma'));
    });
  });

  // --- Askıya alma ------------------------------------------------------------------------

  test('Askıya alınan kullanıcının mevcut oturumu hemen geçersiz olur', async () => {
    const victim = await createUser({ cancerTypeId: 1 });
    const res = await api().post(`/api/v1/admin/users/${victim.id}/suspend`).set(auth(admin.accessToken)).send({ reason: 'kural ihlali' });
    assert.equal(res.status, 204);
    const me = await api().get('/api/v1/users/me').set(auth(victim.accessToken));
    assert.equal(me.status, 403);
    assert.equal(me.body.error.code, 'ACCOUNT_SUSPENDED');
    const refresh = await api().post('/api/v1/auth/refresh').send({ refreshToken: victim.refreshToken });
    assert.notEqual(refresh.status, 200);
  });

  // --- Kimlik doğrulama -------------------------------------------------------------------

  test('Giriş hatası hesabın var olup olmadığını söylemez', async () => {
    const wrongPass = await api().post('/api/v1/auth/login').send({ email: ali.email, password: 'YanlisSifre1' });
    const noUser = await api().post('/api/v1/auth/login').send({ email: 'yok@test.local', password: 'YanlisSifre1' });
    assert.equal(wrongPass.status, 401);
    assert.equal(noUser.status, 401);
    assert.deepEqual(wrongPass.body, noUser.body);
  });

  test('Doğrulama kodu 5 hatalı denemeden sonra geçersiz olur', async () => {
    const u = await createUser({ verified: false });
    for (let i = 0; i < 5; i++) {
      await api().post('/api/v1/auth/verify-email').set(auth(u.accessToken)).send({ code: '000000' });
    }
    const correct = lastCodeFor(u.email);
    const res = await api().post('/api/v1/auth/verify-email').set(auth(u.accessToken)).send({ code: correct });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'CODE_EXPIRED');
  });

  test('Cloudflare arkasında gerçek istemci IP\'si kullanılır; kapalıyken başlık yok sayılır', () => {
    const req = { ip: '10.0.0.1', headers: { 'cf-connecting-ip': '203.0.113.7' } };
    const original = env.trustCloudflareIp;
    env.trustCloudflareIp = true;
    assert.equal(clientIp(req), '203.0.113.7');
    env.trustCloudflareIp = false;
    assert.equal(clientIp(req), '10.0.0.1');
    env.trustCloudflareIp = original;
  });

  // --- KVKK ------------------------------------------------------------------------------

  describe('KVKK', () => {
    test('Verilerin kopyası (m. 11) yalnızca kendi verilerini içerir ve e-postaya gider', async () => {
      const conv = await api().post('/api/v1/conversations').set(auth(ali.accessToken)).send({ userId: zeynep.id });
      await api().post(`/api/v1/conversations/${conv.body.data.id}/messages`).set(auth(ali.accessToken)).send({ content: 'Ali yazdı' });
      await api().post(`/api/v1/conversations/${conv.body.data.id}/messages`).set(auth(zeynep.accessToken)).send({ content: 'Zeynep yazdı' });

      mailer.outbox.length = 0;
      const res = await api().post('/api/v1/users/me/export').set(auth(ali.accessToken));
      assert.equal(res.status, 200);
      const mail = mailer.outbox.find((m) => m.to === ali.email);
      assert.ok(mail?.attachments?.length, 'ekli dosya gönderilmeli');
      const data = JSON.parse(mail.attachments[0].content);
      assert.equal(data.account.id, ali.id);
      assert.ok(data.cancerProfiles.length >= 1);
      assert.ok(data.directMessagesSent.some((m) => m.content === 'Ali yazdı'));
      const dump = JSON.stringify(data);
      assert.ok(!dump.includes('Zeynep yazdı'), 'karşı tarafın mesajı dışa aktarılmamalı');
      assert.ok(!dump.includes(zeynep.email), 'başkasının e-postası dışa aktarılmamalı');
      assert.ok(!/passwordHash|tokenHash/.test(dump));
    });

    test('Silinen mesaj, gönderi ve yorumun metni veritabanında kalmaz', async () => {
      const conv = await api().post('/api/v1/conversations').set(auth(zeynep.accessToken)).send({ userId: ali.id });
      const m = await api().post(`/api/v1/conversations/${conv.body.data.id}/messages`).set(auth(zeynep.accessToken)).send({ content: 'Silinecek özel mesaj' });
      await api().delete(`/api/v1/conversations/${conv.body.data.id}/messages/${m.body.data.id}`).set(auth(zeynep.accessToken));
      assert.equal(await prisma.directMessage.count({ where: { content: 'Silinecek özel mesaj' } }), 0);

      const room = await prisma.roomMembership.findFirst({ where: { userId: zeynep.id } });
      const rm = await api().post(`/api/v1/rooms/${room.roomId}/messages`).set(auth(zeynep.accessToken)).send({ content: 'Silinecek oda mesajı' });
      await api().delete(`/api/v1/rooms/${room.roomId}/messages/${rm.body.data.id}`).set(auth(zeynep.accessToken));
      assert.equal(await prisma.roomMessage.count({ where: { content: 'Silinecek oda mesajı' } }), 0);

      const up = await api().post('/api/v1/media').set(auth(zeynep.accessToken)).attach('file', PNG, { filename: 'a.png', contentType: 'image/png' });
      const p = await api()
        .post('/api/v1/posts')
        .set(auth(zeynep.accessToken))
        .send({ cancerTypeId: 1, category: 'OTHER', content: 'Silinecek gönderi', mediaIds: [up.body.data.id] });
      const c = await api().post(`/api/v1/posts/${p.body.data.id}/comments`).set(auth(zeynep.accessToken)).send({ content: 'Silinecek yorum' });
      await api().delete(`/api/v1/comments/${c.body.data.id}`).set(auth(zeynep.accessToken));
      await api().delete(`/api/v1/posts/${p.body.data.id}`).set(auth(zeynep.accessToken));
      assert.equal(await prisma.post.count({ where: { content: 'Silinecek gönderi' } }), 0);
      assert.equal(await prisma.comment.count({ where: { content: 'Silinecek yorum' } }), 0);
      assert.equal(await prisma.media.count({ where: { id: up.body.data.id } }), 0);
    });

    test('Hesap silinince mesaj metinleri, görseller ve bildirimler de silinir', async () => {
      const leaver = await createUser({ cancerTypeId: 1 });
      const room = await prisma.roomMembership.findFirst({ where: { userId: leaver.id } });
      await api().post(`/api/v1/rooms/${room.roomId}/messages`).set(auth(leaver.accessToken)).send({ content: 'Kemoterapi 3. kür' });
      const conv = await api().post('/api/v1/conversations').set(auth(leaver.accessToken)).send({ userId: zeynep.id });
      await api().post(`/api/v1/conversations/${conv.body.data.id}/messages`).set(auth(leaver.accessToken)).send({ content: 'Tanım: evre 2' });
      const up = await api().post('/api/v1/media').set(auth(leaver.accessToken)).attach('file', PNG, { filename: 'a.png', contentType: 'image/png' });
      await api().post(`/api/v1/users/${zeynep.id}/follow`).set(auth(leaver.accessToken));

      const del = await api().delete('/api/v1/users/me').set(auth(leaver.accessToken)).send({ password: leaver.password });
      assert.equal(del.status, 204);

      assert.equal(await prisma.roomMessage.count({ where: { content: 'Kemoterapi 3. kür' } }), 0);
      assert.equal(await prisma.directMessage.count({ where: { content: 'Tanım: evre 2' } }), 0);
      assert.equal(await prisma.media.count({ where: { id: up.body.data.id } }), 0);
      assert.equal(await prisma.notification.count({ where: { actorId: leaver.id } }), 0);
      assert.equal(await prisma.userCancerProfile.count({ where: { userId: leaver.id } }), 0);
      const row = await prisma.user.findUnique({ where: { id: leaver.id } });
      assert.equal(row.status, 'DELETED');
      assert.ok(!row.email.includes('test.local'));
      assert.equal(row.passwordHash, null);

      const login = await api().post('/api/v1/auth/login').send({ email: leaver.email, password: leaver.password });
      assert.equal(login.status, 401);
    });
  });
});
