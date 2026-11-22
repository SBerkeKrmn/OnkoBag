const { Router } = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../utils/validate');
const { idParam, messagePageQuery, offsetPageQuery } = require('../../utils/schemas');
const { requireAuth, requireVerified } = require('../../middlewares/auth');
const schemas = require('./rooms.schemas');
const service = require('./rooms.service');

const router = Router();
router.use(requireAuth);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json({ data: await service.listMyRooms(req.user.id) });
  }),
);

router.get(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.getRoom(req.user.id, req.params.id) });
  }),
);

router.get(
  '/:id/members',
  validate({ params: idParam, query: offsetPageQuery }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.listMembers(req.user.id, req.params.id, req.query) });
  }),
);

router.get(
  '/:id/messages',
  validate({ params: idParam, query: messagePageQuery }),
  asyncHandler(async (req, res) => {
    res.json(await service.listMessages(req.user.id, req.params.id, req.query));
  }),
);

// Gerçek zamanlı gönderim için Socket.io (`room:send`) tercih edilir; bu uç nokta yedektir
router.post(
  '/:id/messages',
  requireVerified,
  validate({ params: idParam, body: schemas.sendMessage }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.sendMessage(req.user.id, req.params.id, req.body) });
  }),
);

router.patch(
  '/:id/messages/:messageId',
  requireVerified,
  validate({ params: schemas.roomMessageParams, body: schemas.editMessage }),
  asyncHandler(async (req, res) => {
    const { id, messageId } = req.params;
    res.json({ data: await service.editMessage(req.user.id, id, messageId, req.body) });
  }),
);

router.delete(
  '/:id/messages/:messageId',
  validate({ params: schemas.roomMessageParams }),
  asyncHandler(async (req, res) => {
    await service.deleteMessage(req.user.id, req.params.id, req.params.messageId);
    res.status(204).end();
  }),
);

router.post(
  '/:id/read',
  validate({ params: idParam, body: schemas.markRead }),
  asyncHandler(async (req, res) => {
    await service.markRead(req.user.id, req.params.id, req.body.messageId);
    res.status(204).end();
  }),
);

router.post(
  '/:id/mute',
  validate({ params: idParam, body: schemas.mute }),
  asyncHandler(async (req, res) => {
    await service.setMuted(req.user.id, req.params.id, req.body.muted);
    res.status(204).end();
  }),
);

module.exports = router;
