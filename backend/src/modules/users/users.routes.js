const { Router } = require('express');
const { z } = require('zod');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../utils/validate');
const { idParam, offsetPageQuery } = require('../../utils/schemas');
const { requireAuth } = require('../../middlewares/auth');
const schemas = require('./users.schemas');
const service = require('./users.service');
const { emailExport } = require('./dataExport');
const { limiter } = require('../../lib/rateLimits');

const router = Router();
router.use(requireAuth);

// --- /users/me ---------------------------------------------------------------

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json({ data: await service.getMe(req.user.id) });
  }),
);

router.patch(
  '/me',
  validate({ body: schemas.updateMe }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.updateMe(req.user.id, req.body) });
  }),
);

// KVKK m. 11: verilerin kopyası kullanıcının doğrulanmış e-posta adresine gönderilir
// (uygulamaya değil: oturumu ele geçiren biri verileri doğrudan indiremesin)
const exportLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  keyGenerator: (req) => `export:${req.user.id}`,
  message: 'Verilerinin kopyası kısa süre önce gönderildi; lütfen bir saat sonra tekrar dene',
});

router.post(
  '/me/export',
  exportLimiter,
  asyncHandler(async (req, res) => {
    await emailExport(req.user.id);
    res.json({ data: { message: 'Verilerinin kopyası e-posta adresine gönderildi' } });
  }),
);

router.delete(
  '/me',
  validate({ body: schemas.deleteMe }),
  asyncHandler(async (req, res) => {
    await service.deleteMe(req.user.id, req.body);
    res.status(204).end();
  }),
);

router.post(
  '/me/cancer-profiles',
  validate({ body: schemas.createCancerProfile }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.addCancerProfile(req.user.id, req.body) });
  }),
);

router.patch(
  '/me/cancer-profiles/:id',
  validate({ params: idParam, body: schemas.updateCancerProfile }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.updateCancerProfile(req.user.id, req.params.id, req.body) });
  }),
);

router.delete(
  '/me/cancer-profiles/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.removeCancerProfile(req.user.id, req.params.id) });
  }),
);

router.get(
  '/me/suggestions',
  validate({ query: schemas.suggestions }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.suggestions(req.user.id, req.query) });
  }),
);

router.get(
  '/me/blocks',
  asyncHandler(async (req, res) => {
    res.json({ data: await service.listBlocks(req.user.id) });
  }),
);

router.post(
  '/me/push-tokens',
  validate({ body: schemas.pushToken }),
  asyncHandler(async (req, res) => {
    await service.registerPushToken(req.user.id, req.body);
    res.status(204).end();
  }),
);

router.delete(
  '/me/push-tokens',
  validate({ body: z.object({ token: z.string().min(1).max(255) }) }),
  asyncHandler(async (req, res) => {
    await service.removePushToken(req.user.id, req.body.token);
    res.status(204).end();
  }),
);

// --- Arama ve başka kullanıcılar ---------------------------------------------------

router.get(
  '/search',
  validate({ query: schemas.search }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.search(req.user.id, req.query) });
  }),
);

router.get(
  '/username/:username',
  validate({ params: schemas.usernameParam }),
  asyncHandler(async (req, res) => {
    const where = { username: { equals: req.params.username, mode: 'insensitive' } };
    res.json({ data: await service.getProfile(req.user.id, where) });
  }),
);

router.get(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.getProfile(req.user.id, { id: req.params.id }) });
  }),
);

router.get(
  '/:id/followers',
  validate({ params: idParam, query: offsetPageQuery }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.listFollows(req.user.id, req.params.id, 'followers', req.query) });
  }),
);

router.get(
  '/:id/following',
  validate({ params: idParam, query: offsetPageQuery }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.listFollows(req.user.id, req.params.id, 'following', req.query) });
  }),
);

router.post(
  '/:id/follow',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.follow(req.user.id, req.params.id);
    res.status(204).end();
  }),
);

router.delete(
  '/:id/follow',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.unfollow(req.user.id, req.params.id);
    res.status(204).end();
  }),
);

router.post(
  '/:id/block',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.block(req.user.id, req.params.id);
    res.status(204).end();
  }),
);

router.delete(
  '/:id/block',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.unblock(req.user.id, req.params.id);
    res.status(204).end();
  }),
);

module.exports = router;
