const { Router } = require('express');
const { z } = require('zod');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../utils/validate');
const { idParam, uuid, limit } = require('../../utils/schemas');
const { requireAuth } = require('../../middlewares/auth');
const service = require('./notifications.service');

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  validate({
    query: z.object({
      cursor: uuid.optional(),
      limit: limit(50, 20),
      unreadOnly: z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => v === 'true'),
    }),
  }),
  asyncHandler(async (req, res) => {
    res.json(await service.list(req.user.id, req.query));
  }),
);

router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    res.json({ data: { count: await service.unreadCount(req.user.id) } });
  }),
);

router.post(
  '/read-all',
  asyncHandler(async (req, res) => {
    res.json({ data: { updated: await service.markAllRead(req.user.id) } });
  }),
);

router.post(
  '/:id/read',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.markRead(req.user.id, req.params.id);
    res.status(204).end();
  }),
);

module.exports = router;
