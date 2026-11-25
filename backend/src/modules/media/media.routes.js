const { Router } = require('express');
const { limiter } = require('../../lib/rateLimits');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../utils/validate');
const { idParam } = require('../../utils/schemas');
const { requireAuth, requireVerified } = require('../../middlewares/auth');
const service = require('./media.service');

const router = Router();
router.use(requireAuth, requireVerified);

const uploadLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  keyGenerator: (req) => `upload:${req.user.id}`,
  message: 'Çok fazla görsel yüklediniz, lütfen biraz sonra tekrar deneyin',
});

/** multipart/form-data, alan adı: file */
router.post(
  '/',
  uploadLimiter,
  service.upload.single('file'),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.createFromUpload(req.user.id, req.file) });
  }),
);

router.delete(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.remove(req.user.id, req.params.id);
    res.status(204).end();
  }),
);

module.exports = router;
