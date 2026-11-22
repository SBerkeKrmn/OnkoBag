const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../../config/env');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../utils/validate');
const { requireAuth } = require('../../middlewares/auth');
const schemas = require('./auth.schemas');
const service = require('./auth.service');

const router = Router();

// Kaba kuvvet saldırılarına karşı kimlik doğrulama uç noktalarında sıkı limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { error: { message: 'Çok fazla deneme yaptınız, lütfen 15 dakika sonra tekrar deneyin', code: 'RATE_LIMITED' } },
});

const meta = (req) => ({ userAgent: req.get('user-agent'), ip: req.ip });

router.post(
  '/register',
  authLimiter,
  validate({ body: schemas.register }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.register(req.body, meta(req)) });
  }),
);

router.post(
  '/login',
  authLimiter,
  validate({ body: schemas.login }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.login(req.body, meta(req)) });
  }),
);

/** Google / Apple ile giriş. Yanıt: AUTHENTICATED (oturum açıldı) veya PROFILE_REQUIRED (kayıt tamamlanmalı) */
router.post(
  '/social',
  authLimiter,
  validate({ body: schemas.social }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.socialLogin(req.body, meta(req)) });
  }),
);

router.post(
  '/social/complete',
  authLimiter,
  validate({ body: schemas.socialComplete }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.completeSocialSignup(req.body, meta(req)) });
  }),
);

router.post(
  '/refresh',
  validate({ body: schemas.refresh }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.refresh(req.body, meta(req)) });
  }),
);

router.post(
  '/logout',
  validate({ body: schemas.refresh }),
  asyncHandler(async (req, res) => {
    await service.logout(req.body);
    res.status(204).end();
  }),
);

router.post(
  '/verify-email',
  authLimiter,
  requireAuth,
  validate({ body: schemas.verifyEmail }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.verifyEmail(req.user.id, req.body) });
  }),
);

router.post(
  '/resend-verification',
  authLimiter,
  requireAuth,
  asyncHandler(async (req, res) => {
    await service.resendVerification(req.user.id);
    res.json({ data: { message: 'Doğrulama kodu e-posta adresinize gönderildi' } });
  }),
);

router.post(
  '/forgot-password',
  authLimiter,
  validate({ body: schemas.forgotPassword }),
  asyncHandler(async (req, res) => {
    await service.forgotPassword(req.body);
    res.json({ data: { message: 'Hesap mevcutsa şifre sıfırlama kodu e-posta adresine gönderildi' } });
  }),
);

router.post(
  '/reset-password',
  authLimiter,
  validate({ body: schemas.resetPassword }),
  asyncHandler(async (req, res) => {
    await service.resetPassword(req.body);
    res.json({ data: { message: 'Şifreniz güncellendi, lütfen tekrar giriş yapın' } });
  }),
);

router.post(
  '/change-password',
  requireAuth,
  validate({ body: schemas.changePassword }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.changePassword(req.user.id, req.body) });
  }),
);

module.exports = router;
