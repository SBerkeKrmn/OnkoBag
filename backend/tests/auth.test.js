const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, prisma, resetDb, createUser, lastCodeFor, auth } = require('./helpers');

const validBody = (overrides = {}) => ({
  email: 'Ayse@Test.Local',
  password: 'Sifre1234',
  username: 'ayse_k',
  kvkkConsent: true,
  termsAccepted: true,
  cancerProfile: { cancerTypeId: 1, status: 'SURVIVOR', diagnosisYear: 2019, remissionYear: 2021 },
  ...overrides,
});

describe('Kimlik doğrulama', () => {
  before(resetDb);
  after(() => prisma.$disconnect());

  test('KVKK onayı olmadan kayıt reddedilir', async () => {
    const res = await api().post('/api/v1/auth/register').send(validBody({ kvkkConsent: false }));
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  test('Zayıf şifre reddedilir', async () => {
    const res = await api().post('/api/v1/auth/register').send(validBody({ password: 'sadeceharf' }));
    assert.equal(res.status, 400);
  });

  test('Aktif hasta remisyon yılı giremez', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send(validBody({ cancerProfile: { cancerTypeId: 1, status: 'ACTIVE_TREATMENT', remissionYear: 2020 } }));
    assert.equal(res.status, 400);
  });

  test('Başarılı kayıt: token, profil ve oda ataması', async () => {
    const res = await api().post('/api/v1/auth/register').send(validBody());
    assert.equal(res.status, 201);

    const { user, accessToken, refreshToken } = res.body.data;
    assert.ok(accessToken && refreshToken);
    assert.equal(user.email, 'ayse@test.local', 'e-posta küçük harfe çevrilmeli');
    assert.equal(user.emailVerified, false);
    assert.equal(user.passwordHash, undefined, 'şifre hash yanıtta olmamalı');
    assert.equal(user.cancerProfiles.length, 1);
    assert.equal(user.cancerProfiles[0].isPrimary, true);
    assert.equal(user.cancerProfiles[0].status, 'SURVIVOR');

    const membership = await prisma.roomMembership.findFirst({ where: { userId: user.id }, include: { room: true } });
    assert.equal(membership.room.cancerTypeId, 1);
    assert.equal(membership.room.memberCount, 1);
  });

  test('Aynı e-posta ve kullanıcı adı tekrar kullanılamaz', async () => {
    const byEmail = await api().post('/api/v1/auth/register').send(validBody({ username: 'baska_ad' }));
    assert.equal(byEmail.status, 409);
    assert.equal(byEmail.body.error.code, 'EMAIL_TAKEN');

    const byUsername = await api()
      .post('/api/v1/auth/register')
      .send(validBody({ email: 'baska@test.local', username: 'AYSE_K' }));
    assert.equal(byUsername.status, 409);
    assert.equal(byUsername.body.error.code, 'USERNAME_TAKEN');
  });

  test('Giriş: hatalı şifre 401, doğru şifre token döner', async () => {
    const wrong = await api().post('/api/v1/auth/login').send({ email: 'ayse@test.local', password: 'Yanlis123' });
    assert.equal(wrong.status, 401);

    const ok = await api().post('/api/v1/auth/login').send({ email: 'AYSE@test.local', password: 'Sifre1234' });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.data.accessToken);
  });

  test('E-posta doğrulama: hatalı kod, 5 deneme sınırı ve doğru kod', async () => {
    const user = await createUser({ verified: false });
    const code = lastCodeFor(user.email);
    const wrongCode = code === '000000' ? '111111' : '000000';

    const bad = await api().post('/api/v1/auth/verify-email').set(auth(user.accessToken)).send({ code: wrongCode });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.error.code, 'CODE_INVALID');

    const good = await api().post('/api/v1/auth/verify-email').set(auth(user.accessToken)).send({ code });
    assert.equal(good.status, 200);
    assert.equal(good.body.data.emailVerified, true);

    // Kaba kuvvet koruması: yeni kullanıcıda 5 hatalı denemeden sonra doğru kod da geçmez
    const other = await createUser({ verified: false });
    const otherCode = lastCodeFor(other.email);
    const otherWrong = otherCode === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i += 1) {
      await api().post('/api/v1/auth/verify-email').set(auth(other.accessToken)).send({ code: otherWrong });
    }
    const locked = await api().post('/api/v1/auth/verify-email').set(auth(other.accessToken)).send({ code: otherCode });
    assert.equal(locked.status, 400);
    assert.equal(locked.body.error.code, 'CODE_EXPIRED');
  });

  test('Refresh token rotasyonu ve tekrar kullanım tespiti', async () => {
    const user = await createUser();

    const first = await api().post('/api/v1/auth/refresh').send({ refreshToken: user.refreshToken });
    assert.equal(first.status, 200);
    const newRefresh = first.body.data.refreshToken;
    assert.notEqual(newRefresh, user.refreshToken);

    // Eski token tekrar kullanılırsa reddedilir ve tüm oturumlar kapanır
    const reuse = await api().post('/api/v1/auth/refresh').send({ refreshToken: user.refreshToken });
    assert.equal(reuse.status, 401);

    const afterReuse = await api().post('/api/v1/auth/refresh').send({ refreshToken: newRefresh });
    assert.equal(afterReuse.status, 401, 'yeni token da iptal edilmiş olmalı');
  });

  test('Çıkış yapınca refresh token geçersiz olur', async () => {
    const user = await createUser();
    const out = await api().post('/api/v1/auth/logout').send({ refreshToken: user.refreshToken });
    assert.equal(out.status, 204);
    const res = await api().post('/api/v1/auth/refresh').send({ refreshToken: user.refreshToken });
    assert.equal(res.status, 401);
  });

  test('Şifre sıfırlama akışı', async () => {
    const user = await createUser();

    const unknown = await api().post('/api/v1/auth/forgot-password').send({ email: 'yok@test.local' });
    assert.equal(unknown.status, 200, 'hesap varlığı sızdırılmamalı');

    await api().post('/api/v1/auth/forgot-password').send({ email: user.email });
    const code = lastCodeFor(user.email);

    const reset = await api()
      .post('/api/v1/auth/reset-password')
      .send({ email: user.email, code, newPassword: 'YeniSifre99' });
    assert.equal(reset.status, 200);

    const oldLogin = await api().post('/api/v1/auth/login').send({ email: user.email, password: user.password });
    assert.equal(oldLogin.status, 401);
    const newLogin = await api().post('/api/v1/auth/login').send({ email: user.email, password: 'YeniSifre99' });
    assert.equal(newLogin.status, 200);

    const oldSession = await api().post('/api/v1/auth/refresh').send({ refreshToken: user.refreshToken });
    assert.equal(oldSession.status, 401, 'şifre değişince eski oturumlar kapanmalı');
  });

  test('Token olmadan korumalı uç nokta 401 döner', async () => {
    const res = await api().get('/api/v1/users/me');
    assert.equal(res.status, 401);
  });
});
