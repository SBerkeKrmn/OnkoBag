// Moderasyon ve yönetim paneli uç noktaları.
// MODERATOR ve ADMIN erişebilir; rol değiştirme ve kanser türü yönetimi yalnızca ADMIN.
const { Router } = require('express');
const { z } = require('zod');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../utils/validate');
const { idParam, offsetPageQuery } = require('../../utils/schemas');
const { requireAuth, requireRole } = require('../../middlewares/auth');
const schemas = require('./admin.schemas');
const service = require('./admin.service');

const router = Router();
router.use(requireAuth, requireRole('MODERATOR', 'ADMIN'));

const adminOnly = requireRole('ADMIN');
const optionalReason = z.object({ reason: z.string().trim().max(1000).optional() });

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    res.json({ data: await service.stats() });
  }),
);

// --- Şikayetler ----------------------------------------------------------------------
router.get(
  '/reports',
  validate({ query: schemas.listReports }),
  asyncHandler(async (req, res) => {
    res.json(await service.listReports(req.query));
  }),
);

router.patch(
  '/reports/:id',
  validate({ params: idParam, body: schemas.updateReport }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.updateReport(req.user.id, req.params.id, req.body) });
  }),
);

// --- İçerik ----------------------------------------------------------------------------
router.post(
  '/content/:targetType/:targetId/hide',
  validate({ params: schemas.contentParams, body: schemas.contentAction }),
  asyncHandler(async (req, res) => {
    await service.setContentStatus(req.user.id, req.params, req.body, true);
    res.status(204).end();
  }),
);

router.post(
  '/content/:targetType/:targetId/restore',
  validate({ params: schemas.contentParams, body: schemas.contentAction }),
  asyncHandler(async (req, res) => {
    await service.setContentStatus(req.user.id, req.params, req.body, false);
    res.status(204).end();
  }),
);

// --- Kullanıcılar ------------------------------------------------------------------------
router.get(
  '/users',
  validate({ query: schemas.listUsers }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.listUsers(req.user, req.query) });
  }),
);

router.post(
  '/users/:id/suspend',
  validate({ params: idParam, body: schemas.suspend }),
  asyncHandler(async (req, res) => {
    await service.suspendUser(req.user, req.params.id, req.body);
    res.status(204).end();
  }),
);

router.post(
  '/users/:id/unsuspend',
  validate({ params: idParam, body: optionalReason }),
  asyncHandler(async (req, res) => {
    await service.unsuspendUser(req.user, req.params.id, req.body);
    res.status(204).end();
  }),
);

router.post(
  '/users/:id/warn',
  validate({ params: idParam, body: schemas.warn }),
  asyncHandler(async (req, res) => {
    await service.warnUser(req.user, req.params.id, req.body);
    res.status(204).end();
  }),
);

router.patch(
  '/users/:id/role',
  adminOnly,
  validate({ params: idParam, body: schemas.changeRole }),
  asyncHandler(async (req, res) => {
    await service.changeRole(req.user, req.params.id, req.body);
    res.status(204).end();
  }),
);

// --- İyileşen doğrulaması -------------------------------------------------------------------
router.get(
  '/survivor-verifications',
  validate({ query: offsetPageQuery }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.listPendingSurvivors(req.query) });
  }),
);

router.post(
  '/cancer-profiles/:id/verify',
  validate({ params: idParam, body: optionalReason }),
  asyncHandler(async (req, res) => {
    await service.setSurvivorVerification(req.user, req.params.id, true, req.body.reason);
    res.status(204).end();
  }),
);

router.post(
  '/cancer-profiles/:id/revoke',
  validate({ params: idParam, body: optionalReason }),
  asyncHandler(async (req, res) => {
    await service.setSurvivorVerification(req.user, req.params.id, false, req.body.reason);
    res.status(204).end();
  }),
);

// --- Odalar -----------------------------------------------------------------------------------
router.get(
  '/rooms',
  validate({ query: schemas.listRooms }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.listRooms(req.query) });
  }),
);

router.post(
  '/rooms',
  validate({ body: schemas.createRoom }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.createRoom(req.user, req.body) });
  }),
);

router.patch(
  '/rooms/:id',
  validate({ params: idParam, body: schemas.updateRoom }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.updateRoom(req.user, req.params.id, req.body) });
  }),
);

router.post(
  '/rooms/:roomId/members/:userId/silence',
  validate({ params: schemas.roomMemberParams, body: schemas.silence }),
  asyncHandler(async (req, res) => {
    await service.silenceInRoom(req.user, req.params, req.body);
    res.status(204).end();
  }),
);

// --- Kanser türleri (yalnızca ADMIN) -------------------------------------------------------------
router.post(
  '/cancer-types',
  adminOnly,
  validate({ body: schemas.createCancerType }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.createCancerType(req.user, req.body) });
  }),
);

router.patch(
  '/cancer-types/:id',
  adminOnly,
  validate({ params: z.object({ id: z.coerce.number().int().positive() }), body: schemas.updateCancerType }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.updateCancerType(req.user, req.params.id, req.body) });
  }),
);

// --- Denetim kayıtları ------------------------------------------------------------------------------
router.get(
  '/logs',
  validate({ query: schemas.listLogs }),
  asyncHandler(async (req, res) => {
    res.json(await service.listLogs(req.query));
  }),
);

module.exports = router;
