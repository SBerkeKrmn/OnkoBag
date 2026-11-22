// /api/v1 altındaki tüm modül router'ları burada bağlanır
const { Router } = require('express');
const prisma = require('../lib/prisma');
const asyncHandler = require('../utils/asyncHandler');

const cancerTypesRoutes = require('../modules/cancer-types/cancerTypes.routes');

const router = Router();

router.get(
  '/health',
  asyncHandler(async (req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'ok', time: new Date().toISOString() });
  }),
);

router.use('/cancer-types', cancerTypesRoutes);

// Backend aşamasında eklenecek modüller:
// router.use('/auth', authRoutes);
// router.use('/users', usersRoutes);
// router.use('/rooms', roomsRoutes);
// router.use('/conversations', conversationsRoutes);
// router.use('/posts', postsRoutes);
// router.use('/reports', reportsRoutes);
// router.use('/notifications', notificationsRoutes);
// router.use('/admin', adminRoutes);

module.exports = router;
