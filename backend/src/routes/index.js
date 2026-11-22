// /api/v1 altındaki tüm modül router'ları burada bağlanır
const { Router } = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');

const router = Router();

router.get(
  '/health',
  asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'ok', time: new Date().toISOString() });
  }),
);

router.use('/auth', require('../modules/auth/auth.routes'));
router.use('/users', require('../modules/users/users.routes'));
router.use('/cancer-types', require('../modules/cancer-types/cancerTypes.routes'));

module.exports = router;
