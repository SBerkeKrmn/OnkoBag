// Kanser türleri — kayıt ekranındaki seçim listesi herkese açıktır
const { Router } = require('express');
const { z } = require('zod');
const prisma = require('../../lib/prisma');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../utils/validate');
const ApiError = require('../../utils/ApiError');
const { requireAuth } = require('../../middlewares/auth');

const router = Router();

const publicSelect = { id: true, name: true, slug: true, description: true, iconName: true };

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const cancerTypes = await prisma.cancerType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: publicSelect,
    });
    res.json({ data: cancerTypes });
  }),
);

/** Topluluk özeti: aktif hasta / iyileşen sayıları, gönderi ve oda sayısı */
router.get(
  '/:id',
  requireAuth,
  validate({ params: z.object({ id: z.coerce.number().int().positive() }) }),
  asyncHandler(async (req, res) => {
    const cancerType = await prisma.cancerType.findFirst({
      where: { id: req.params.id, isActive: true },
      select: publicSelect,
    });
    if (!cancerType) throw ApiError.notFound('Kanser türü bulunamadı');

    const [byStatus, posts, rooms] = await Promise.all([
      prisma.userCancerProfile.groupBy({
        by: ['status'],
        where: { cancerTypeId: cancerType.id, user: { status: 'ACTIVE' } },
        _count: { _all: true },
      }),
      prisma.post.count({ where: { cancerTypeId: cancerType.id, status: 'PUBLISHED' } }),
      prisma.chatRoom.count({ where: { cancerTypeId: cancerType.id, isActive: true } }),
    ]);

    res.json({
      data: {
        ...cancerType,
        stats: {
          activeTreatment: byStatus.find((s) => s.status === 'ACTIVE_TREATMENT')?._count._all ?? 0,
          survivors: byStatus.find((s) => s.status === 'SURVIVOR')?._count._all ?? 0,
          posts,
          rooms,
        },
      },
    });
  }),
);

module.exports = router;
