const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, prisma, resetDb, createUser, auth } = require('./helpers');
const { verifiers } = require('../src/modules/auth/socialVerifiers');

// Ağ erişimi olmadan test: doğrulayıcılar "sahte" token'ı çözen fonksiyonlarla değiştirilir.
// Token biçimi: JSON.stringify({ sub, email, emailVerified, name })
const original = { ...verifiers };
const fakeVerifier = async (token) => {
  const p = JSON.parse(token);
  if (p.invalid) {
    const ApiError = require('../src/utils/ApiError');
    throw ApiError.unauthorized('geçersiz', { code: 'SOCIAL_TOKEN_INVALID' });
  }
  return { providerUserId: p.sub, email: p.email ?? null, emailVerified: p.emailVerified ?? true, name: p.name ?? null };
};
const token = (obj) => JSON.stringify({ pad: 'x'.repeat(20), ...obj });

const completeBody = (signupToken, overrides = {}) => ({
  signupToken,
  username: 'google_kullanici',
  ageConfirmed: true,
  termsAccepted: true,
  kvkkConsent: true,
  cancerProfile: { cancerTypeId: 1, status: 'SURVIVOR', remissionYear: 2022 },
  ...overrides,
});

describe('Google / Apple ile giriş', () => {
  before(async () => {
    await resetDb();
  });
  after(async () => {
    Object.assign(verifiers, original);
    await prisma.$disconnect();
  });

  test('Gerçek doğrulayıcı: Google yapılandırılmamışsa anlamlı hata, bozuk Apple token reddedilir', async () => {
    const google = await api().post('/api/v1/auth/social').send({ provider: 'GOOGLE', idToken: 'x'.repeat(40) });
    assert.equal(google.status, 400);
    assert.equal(google.body.error.code, 'PROVIDER_NOT_CONFIGURED');

    const apple = await api()
      .post('/api/v1/auth/social')
      .send({ provider: 'APPLE', idToken: 'bozuk.token.degeri-bozuk-token', nonce: 'n'.repeat(32) });
    assert.equal(apple.status, 401);
    assert.equal(apple.body.error.code, 'SOCIAL_TOKEN_INVALID');
  });

  test('Yeni kullanıcı: PROFILE_REQUIRED → kayıt tamamlama → oturum', async () => {
    Object.assign(verifiers, { GOOGLE: fakeVerifier, APPLE: fakeVerifier });

    const first = await api()
      .post('/api/v1/auth/social')
      .send({ provider: 'GOOGLE', idToken: token({ sub: 'g-123', email: 'Yeni@Gmail.com', name: 'Yeni Kişi' }) });
    assert.equal(first.status, 200);
    assert.equal(first.body.data.status, 'PROFILE_REQUIRED');
    assert.equal(first.body.data.profile.email, 'yeni@gmail.com');
    assert.equal(first.body.data.profile.displayName, 'Yeni Kişi');
    assert.equal(first.body.data.accessToken, undefined, 'profil tamamlanmadan oturum verilmemeli');

    const noConsent = await api()
      .post('/api/v1/auth/social/complete')
      .send(completeBody(first.body.data.signupToken, { kvkkConsent: false }));
    assert.equal(noConsent.status, 400);

    const done = await api().post('/api/v1/auth/social/complete').send(completeBody(first.body.data.signupToken));
    assert.equal(done.status, 201);
    const { user, accessToken } = done.body.data;
    assert.ok(accessToken);
    assert.equal(user.email, 'yeni@gmail.com');
    assert.equal(user.displayName, 'Yeni Kişi');
    assert.equal(user.emailVerified, true, 'Google e-postası doğrulanmış sayılır');
    assert.equal(user.hasPassword, false);
    assert.deepEqual(user.linkedProviders, ['GOOGLE']);
    assert.equal(await prisma.roomMembership.count({ where: { userId: user.id } }), 1);

    // Aynı kayıt token'ı ikinci kez kullanılamaz
    const again = await api().post('/api/v1/auth/social/complete').send(completeBody(first.body.data.signupToken, { username: 'baska_ad' }));
    assert.equal(again.status, 409);

    // Sonraki girişte doğrudan oturum açılır
    const second = await api().post('/api/v1/auth/social').send({ provider: 'GOOGLE', idToken: token({ sub: 'g-123', email: 'yeni@gmail.com' }) });
    assert.equal(second.body.data.status, 'AUTHENTICATED');
    assert.equal(second.body.data.user.id, user.id);
  });

  test('Şifresiz hesap e-posta/şifre ile giremez, şifre değiştiremez; onayla silinebilir', async () => {
    const login = await api().post('/api/v1/auth/login').send({ email: 'yeni@gmail.com', password: 'herhangi1' });
    assert.equal(login.status, 401);

    const social = await api().post('/api/v1/auth/social').send({ provider: 'GOOGLE', idToken: token({ sub: 'g-123', email: 'yeni@gmail.com' }) });
    const t = social.body.data.accessToken;

    const change = await api().post('/api/v1/auth/change-password').set(auth(t)).send({ currentPassword: 'x', newPassword: 'YeniSifre1' });
    assert.equal(change.status, 400);
    assert.equal(change.body.error.code, 'NO_PASSWORD');

    const noConfirm = await api().delete('/api/v1/users/me').set(auth(t)).send({});
    assert.equal(noConfirm.status, 400);

    const del = await api().delete('/api/v1/users/me').set(auth(t)).send({ confirm: true });
    assert.equal(del.status, 204);
    assert.equal(await prisma.authIdentity.count({ where: { providerUserId: 'g-123' } }), 0);

    // Silinen hesabın Google hesabıyla yeniden kayıt olunabilir
    const fresh = await api().post('/api/v1/auth/social').send({ provider: 'GOOGLE', idToken: token({ sub: 'g-123', email: 'yeni@gmail.com' }) });
    assert.equal(fresh.body.data.status, 'PROFILE_REQUIRED');
  });

  test('Doğrulanmış e-posta mevcut hesaba bağlanır; doğrulanmamışsa bağlanmaz', async () => {
    const existing = await createUser({ verified: false });

    const unverified = await api()
      .post('/api/v1/auth/social')
      .send({ provider: 'APPLE', idToken: token({ sub: 'a-1', email: existing.email, emailVerified: false }), nonce: 'n'.repeat(32) });
    assert.equal(unverified.body.data.status, 'PROFILE_REQUIRED', 'doğrulanmamış e-posta ile hesap ele geçirilemez');

    const linked = await api()
      .post('/api/v1/auth/social')
      .send({ provider: 'APPLE', idToken: token({ sub: 'a-2', email: existing.email }), nonce: 'n'.repeat(32) });
    assert.equal(linked.body.data.status, 'AUTHENTICATED');
    assert.equal(linked.body.data.user.id, existing.id);
    assert.deepEqual(linked.body.data.user.linkedProviders, ['APPLE']);
    assert.equal(linked.body.data.user.emailVerified, true, 'sağlayıcı doğruladığı için e-posta da doğrulanmış olur');
    assert.equal(linked.body.data.user.hasPassword, true);
  });

  test('Kayıt tamamlamada mevcut e-posta, alınmış kullanıcı adı ve geçersiz token reddedilir', async () => {
    const other = await createUser();
    const start = await api()
      .post('/api/v1/auth/social')
      .send({ provider: 'GOOGLE', idToken: token({ sub: 'g-9', email: 'baska@gmail.com' }) });

    const taken = await api()
      .post('/api/v1/auth/social/complete')
      .send(completeBody(start.body.data.signupToken, { username: other.username }));
    assert.equal(taken.status, 409);
    assert.equal(taken.body.error.code, 'USERNAME_TAKEN');

    const forged = await api().post('/api/v1/auth/social/complete').send(completeBody('a'.repeat(60)));
    assert.equal(forged.status, 400);
    assert.equal(forged.body.error.code, 'SIGNUP_TOKEN_INVALID');

    // Access token kayıt token'ı yerine kullanılamaz
    const misuse = await api().post('/api/v1/auth/social/complete').send(completeBody(other.accessToken));
    assert.equal(misuse.status, 400);
  });

  test('Askıya alınmış kullanıcı sosyal girişle de giremez', async () => {
    const start = await api().post('/api/v1/auth/social').send({ provider: 'GOOGLE', idToken: token({ sub: 'g-s', email: 'askida@gmail.com' }) });
    const done = await api().post('/api/v1/auth/social/complete').send(completeBody(start.body.data.signupToken, { username: 'askida_k' }));
    await prisma.user.update({ where: { id: done.body.data.user.id }, data: { status: 'SUSPENDED' } });

    const res = await api().post('/api/v1/auth/social').send({ provider: 'GOOGLE', idToken: token({ sub: 'g-s', email: 'askida@gmail.com' }) });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'ACCOUNT_SUSPENDED');
  });

  test('Sağlayıcı doğrulaması başarısızsa 401', async () => {
    const res = await api().post('/api/v1/auth/social').send({ provider: 'GOOGLE', idToken: token({ invalid: true }) });
    assert.equal(res.status, 401);
  });
});
