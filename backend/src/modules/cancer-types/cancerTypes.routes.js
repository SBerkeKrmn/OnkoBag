// Kanser türleri — kayıt ekranında seçim listesi için herkese açık uç nokta
const { Router } = require('express');
const prisma = require('../../lib/prisma');
const asyncHandler = require('../../utils/asyncHandler');

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const cancerTypes = await prisma.cancerType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, description: true, iconName: true },
    });
    res.json({ data: cancerTypes });
  }),
);

module.exports = router;
