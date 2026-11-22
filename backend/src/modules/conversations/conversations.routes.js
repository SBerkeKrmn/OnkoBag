const { Router } = require('express');
const { z } = require('zod');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../utils/validate');
const { idParam, messagePageQuery } = require('../../utils/schemas');
const { requireAuth, requireVerified } = require('../../middlewares/auth');
const schemas = require('./conversations.schemas');
const service = require('./conversations.service');

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ data: await service.listConversations(req.user.id) });
  }),
);

/** Sohbet başlatır veya mevcut sohbeti döner */
router.post(
  '/',
  requireVerified,
  validate({ body: schemas.start }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.startConversation(req.user.id, req.body.userId) });
  }),
);

router.get(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.getConversation(req.user.id, req.params.id) });
  }),
);

/** Sohbeti kullanıcının listesinden kaldırır (karşı taraf etkilenmez) */
router.delete(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.hideConversation(req.user.id, req.params.id);
    res.status(204).end();
  }),
);

router.get(
  '/:id/messages',
  validate({ params: idParam, query: messagePageQuery }),
  asyncHandler(async (req, res) => {
    res.json(await service.listMessages(req.user.id, req.params.id, req.query));
  }),
);

// Gerçek zamanlı gönderim için Socket.io (`dm:send`) tercih edilir; bu uç nokta yedektir
router.post(
  '/:id/messages',
  requireVerified,
  validate({ params: idParam, body: schemas.sendMessage }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.sendMessage(req.user.id, req.params.id, req.body) });
  }),
);

router.delete(
  '/:id/messages/:messageId',
  validate({ params: schemas.messageParams }),
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
  validate({ params: idParam, body: z.object({ muted: z.boolean() }) }),
  asyncHandler(async (req, res) => {
    await service.setMuted(req.user.id, req.params.id, req.body.muted);
    res.status(204).end();
  }),
);

module.exports = router;
