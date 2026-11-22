const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../lib/prisma');
const env = require('../../config/env');
const mailer = require('../../lib/mailer');
const realtime = require('../../lib/realtime');
const ApiError = require('../../utils/ApiError');
const { sha256, randomToken, randomCode, safeEqual, signAccessToken } = require('../../utils/tokens');
const { assignUserToRoom } = require('../rooms/roomAssignment');
const { getMe } = require('../users/users.service');
const { verifiers } = require('./socialVerifiers');

const BCRYPT_ROUNDS = env.isTest ? 4 : 12;
const CODE_TTL_MINUTES = 15;
const MAX_CODE_ATTEMPTS = 5;

const hashPassword = (plain) => bcrypt.hash(plain, BCRYPT_ROUNDS);

// --- Oturum tokenları ---------------------------------------------------------

async function issueTokens(user, meta = {}) {
  const refreshToken = randomToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(refreshToken),
      deviceInfo: meta.userAgent?.slice(0, 255),
      ipAddress: meta.ip?.slice(0, 45),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return { accessToken: signAccessToken(user), refreshToken };
}

// --- Tek kullanımlık kodlar -----------------------------------------------------

const codeHash = (userId, type, code) => sha256(`${userId}:${type}:${code}`);

/** Kullanıcı için yeni kod üretir; aynı türdeki eski kodları siler */
async function createCode(db, userId, type) {
  await db.authToken.deleteMany({ where: { userId, type } });
  const code = randomCode();
  await db.authToken.create({
    data: {
      userId,
      type,
      tokenHash: codeHash(userId, type, code),
      expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000),
    },
  });
  return code;
}

/** Kodu doğrular ve kullanıldı olarak işaretler. Hatalı denemeler sayılır. */
async function consumeCode(userId, type, code) {
  const token = await prisma.authToken.findFirst({
    where: { userId, type, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!token || token.attempts >= MAX_CODE_ATTEMPTS) {
    throw ApiError.badRequest('Kod geçersiz veya süresi dolmuş, lütfen yeni kod isteyin', { code: 'CODE_EXPIRED' });
  }

  if (!safeEqual(token.tokenHash, codeHash(userId, type, code))) {
    await prisma.authToken.update({ where: { id: token.id }, data: { attempts: { increment: 1 } } });
    throw ApiError.badRequest('Kod hatalı', { code: 'CODE_INVALID' });
  }

  await prisma.authToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
}

// --- Kayıt ve giriş -------------------------------------------------------------

async function register(input, meta) {
  const [emailTaken, usernameTaken, cancerType] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
    prisma.user.findFirst({
      where: { username: { equals: input.username, mode: 'insensitive' } },
      select: { id: true },
    }),
    prisma.cancerType.findFirst({ where: { id: input.cancerProfile.cancerTypeId, isActive: true } }),
  ]);

  if (emailTaken) throw ApiError.conflict('Bu e-posta adresiyle kayıtlı bir hesap var', { code: 'EMAIL_TAKEN' });
  if (usernameTaken) throw ApiError.conflict('Bu kullanıcı adı alınmış', { code: 'USERNAME_TAKEN' });
  if (!cancerType) throw ApiError.badRequest('Geçersiz kanser türü', { code: 'INVALID_CANCER_TYPE' });

  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  // ageConfirmed şema tarafından zorunlu tutulur; onay anı termsAcceptedAt ile kaydedilir
  const { user, code, roomId } = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        username: input.username,
        displayName: input.displayName,
        kvkkConsentAt: now,
        termsAcceptedAt: now,
        cancerProfiles: { create: { ...input.cancerProfile, isPrimary: true } },
      },
    });
    const { room } = await assignUserToRoom(tx, created.id, cancerType.id);
    const verificationCode = await createCode(tx, created.id, 'EMAIL_VERIFICATION');
    return { user: created, code: verificationCode, roomId: room.id };
  });

  realtime.joinUserToRoom(user.id, roomId);
  await mailer.sendVerificationCode(user.email, code);

  const tokens = await issueTokens(user, meta);
  return { user: await getMe(user.id), ...tokens };
}

/** Askı kontrolü: süresi dolmuş askıyı kaldırır, devam ediyorsa 403 fırlatır */
async function assertCanSignIn(user) {
  if (user.status !== 'SUSPENDED') return;
  if (!user.suspendedUntil || user.suspendedUntil > new Date()) {
    throw ApiError.forbidden('Hesabınız askıya alınmıştır', {
      code: 'ACCOUNT_SUSPENDED',
      details: { suspendedUntil: user.suspendedUntil },
    });
  }
  // Askı süresi dolmuş: hesabı otomatik olarak yeniden etkinleştir
  await prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE', suspendedUntil: null } });
}

async function login({ email, password }, meta) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Kullanıcının var olup olmadığını sızdırmamak için tek tip hata mesajı.
  // Yalnızca Google/Apple ile kayıtlı (şifresiz) hesaplar da aynı hatayı alır.
  const invalid = ApiError.unauthorized('E-posta veya şifre hatalı', { code: 'INVALID_CREDENTIALS' });
  if (!user || user.status === 'DELETED' || !user.passwordHash) throw invalid;
  if (!(await bcrypt.compare(password, user.passwordHash))) throw invalid;

  await assertCanSignIn(user);
  await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
  const tokens = await issueTokens(user, meta);
  return { user: await getMe(user.id), ...tokens };
}

/**
 * Refresh token rotasyonu: eski token iptal edilir, yenisi verilir.
 * Daha önce iptal edilmiş bir token tekrar kullanılırsa (çalınma şüphesi)
 * kullanıcının tüm oturumları kapatılır.
 */
async function refresh({ refreshToken }, meta) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(refreshToken) },
    include: { user: true },
  });

  const invalid = ApiError.unauthorized('Oturum geçersiz, lütfen tekrar giriş yapın', { code: 'REFRESH_INVALID' });
  if (!stored) throw invalid;

  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw invalid;
  }

  if (stored.expiresAt < new Date() || stored.user.status !== 'ACTIVE') throw invalid;

  // Eşzamanlı iki yenileme isteğinden yalnızca biri başarılı olur
  const { count } = await prisma.refreshToken.updateMany({
    where: { id: stored.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) throw invalid;

  return issueTokens(stored.user, meta);
}

async function logout({ refreshToken }) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// --- E-posta doğrulama ------------------------------------------------------------

async function verifyEmail(userId, { code }) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.emailVerifiedAt) throw ApiError.badRequest('E-posta adresi zaten doğrulanmış', { code: 'ALREADY_VERIFIED' });

  await consumeCode(userId, 'EMAIL_VERIFICATION', code);
  await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return getMe(userId);
}

async function resendVerification(userId) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.emailVerifiedAt) throw ApiError.badRequest('E-posta adresi zaten doğrulanmış', { code: 'ALREADY_VERIFIED' });

  const code = await createCode(prisma, userId, 'EMAIL_VERIFICATION');
  await mailer.sendVerificationCode(user.email, code);
}

// --- Şifre işlemleri ----------------------------------------------------------------

async function forgotPassword({ email }) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Hesabın varlığını sızdırmamak için her durumda başarılı yanıt dönülür
  if (!user || user.status !== 'ACTIVE') return;

  const code = await createCode(prisma, user.id, 'PASSWORD_RESET');
  await mailer.sendPasswordResetCode(user.email, code);
}

async function revokeAllSessions(userId) {
  await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

async function resetPassword({ email, code, newPassword }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== 'ACTIVE') {
    throw ApiError.badRequest('Kod geçersiz veya süresi dolmuş, lütfen yeni kod isteyin', { code: 'CODE_EXPIRED' });
  }

  await consumeCode(user.id, 'PASSWORD_RESET', code);
  await prisma.user.update({
    where: { id: user.id },
    // Kodu e-postayla alabildiği için e-posta adresi de doğrulanmış sayılır
    data: { passwordHash: await hashPassword(newPassword), emailVerifiedAt: user.emailVerifiedAt ?? new Date() },
  });
  await revokeAllSessions(user.id);
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.passwordHash) {
    throw ApiError.badRequest('Hesabın Google/Apple ile oluşturulduğu için şifresi yok. “Şifremi unuttum” ile şifre belirleyebilirsin.', {
      code: 'NO_PASSWORD',
    });
  }
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw ApiError.badRequest('Mevcut şifre hatalı', { code: 'WRONG_PASSWORD' });
  }
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
  await revokeAllSessions(userId);
  return issueTokens(user);
}

// --- Google / Apple ile giriş ------------------------------------------------------

const PROVIDER_NAMES = { GOOGLE: 'Google', APPLE: 'Apple' };
const SIGNUP_TOKEN_TTL = '30m';

/**
 * Sosyal giriş.
 * 1) Sağlayıcı hesabı daha önce bağlanmışsa → oturum açılır
 * 2) Sağlayıcının doğruladığı e-posta mevcut bir hesaba aitse → hesaba bağlanır, oturum açılır
 * 3) Yeni kullanıcı → kısa ömürlü kayıt token'ı döner; istemci kullanıcı adı,
 *    kanser profili ve onayları alıp /auth/social/complete'e gönderir
 */
async function socialLogin({ provider, idToken, nonce, fullName }, meta) {
  const verified = await verifiers[provider](idToken, nonce);
  const profile = { ...verified, email: verified.email?.trim().toLowerCase() || null };
  if (!profile.email) {
    throw ApiError.badRequest(`${PROVIDER_NAMES[provider]} hesabının e-posta adresine erişilemedi`, { code: 'SOCIAL_EMAIL_MISSING' });
  }

  const identity = await prisma.authIdentity.findUnique({
    where: { provider_providerUserId: { provider, providerUserId: profile.providerUserId } },
    include: { user: true },
  });

  let user = identity?.user ?? null;

  if (!user && profile.emailVerified) {
    const existing = await prisma.user.findUnique({ where: { email: profile.email } });
    if (existing && existing.status !== 'DELETED') {
      await prisma.authIdentity.create({
        data: { userId: existing.id, provider, providerUserId: profile.providerUserId, email: profile.email },
      });
      if (!existing.emailVerifiedAt) {
        await prisma.user.update({ where: { id: existing.id }, data: { emailVerifiedAt: new Date() } });
      }
      user = existing;
    }
  }

  if (user) {
    if (user.status === 'DELETED') throw ApiError.unauthorized('Hesap bulunamadı', { code: 'ACCOUNT_NOT_FOUND' });
    await assertCanSignIn(user);
    await prisma.authIdentity.updateMany({
      where: { userId: user.id, provider },
      data: { lastUsedAt: new Date() },
    });
    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });
    const tokens = await issueTokens(user, meta);
    return { status: 'AUTHENTICATED', user: await getMe(user.id), ...tokens };
  }

  const name = fullName?.trim() || profile.name || null;
  const signupToken = jwt.sign(
    { typ: 'social-signup', provider, sub: profile.providerUserId, email: profile.email, emailVerified: profile.emailVerified, name },
    env.JWT_ACCESS_SECRET,
    { expiresIn: SIGNUP_TOKEN_TTL },
  );
  return { status: 'PROFILE_REQUIRED', signupToken, profile: { email: profile.email, displayName: name } };
}

function readSignupToken(token) {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (payload.typ !== 'social-signup') throw new Error('typ');
    return payload;
  } catch {
    throw ApiError.badRequest('Kayıt süresi doldu, lütfen tekrar Google/Apple ile devam et', { code: 'SIGNUP_TOKEN_INVALID' });
  }
}

/** Sosyal girişle gelen yeni kullanıcının kaydını tamamlar */
async function completeSocialSignup(input, meta) {
  const signup = readSignupToken(input.signupToken);

  const [emailTaken, usernameTaken, cancerType, linked] = await Promise.all([
    prisma.user.findUnique({ where: { email: signup.email }, select: { id: true } }),
    prisma.user.findFirst({ where: { username: { equals: input.username, mode: 'insensitive' } }, select: { id: true } }),
    prisma.cancerType.findFirst({ where: { id: input.cancerProfile.cancerTypeId, isActive: true } }),
    prisma.authIdentity.findUnique({
      where: { provider_providerUserId: { provider: signup.provider, providerUserId: signup.sub } },
      select: { id: true },
    }),
  ]);

  if (linked) throw ApiError.conflict('Bu hesap zaten kayıtlı, giriş yapabilirsin', { code: 'ALREADY_REGISTERED' });
  if (emailTaken) {
    throw ApiError.conflict('Bu e-posta adresiyle kayıtlı bir hesap var. E-posta ve şifrenle giriş yapabilirsin.', {
      code: 'EMAIL_TAKEN',
    });
  }
  if (usernameTaken) throw ApiError.conflict('Bu kullanıcı adı alınmış', { code: 'USERNAME_TAKEN' });
  if (!cancerType) throw ApiError.badRequest('Geçersiz kanser türü', { code: 'INVALID_CANCER_TYPE' });

  const now = new Date();
  const { user, code, roomId } = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: signup.email,
        passwordHash: null,
        username: input.username,
        displayName: input.displayName ?? signup.name ?? undefined,
        emailVerifiedAt: signup.emailVerified ? now : null,
        kvkkConsentAt: now,
        termsAcceptedAt: now,
        cancerProfiles: { create: { ...input.cancerProfile, isPrimary: true } },
        identities: { create: { provider: signup.provider, providerUserId: signup.sub, email: signup.email } },
      },
    });
    const { room } = await assignUserToRoom(tx, created.id, cancerType.id);
    const verificationCode = signup.emailVerified ? null : await createCode(tx, created.id, 'EMAIL_VERIFICATION');
    return { user: created, code: verificationCode, roomId: room.id };
  });

  realtime.joinUserToRoom(user.id, roomId);
  if (code) await mailer.sendVerificationCode(user.email, code);

  const tokens = await issueTokens(user, meta);
  return { status: 'AUTHENTICATED', user: await getMe(user.id), ...tokens };
}

module.exports = {
  socialLogin,
  completeSocialSignup,
  hashPassword,
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  revokeAllSessions,
};
