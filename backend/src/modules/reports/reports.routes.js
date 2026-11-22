// Kullanıcı şikayetleri. İnceleme ve sonuçlandırma /admin altında yapılır.
const { Router } = require('express');
const { z } = require('zod');
const prisma = require('../../lib/prisma');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../utils/validate');
const ApiError = require('../../utils/ApiError');
const { emitToUser } = require('../../lib/realtime');
const { requireAuth } = require('../../middlewares/auth');
const { loadTarget } = require('./reportTargets');

const router = Router();
router.use(requireAuth);

const createReport = z.object({
  targetType: z.enum(['USER', 'POST', 'COMMENT', 'ROOM_MESSAGE', 'DIRECT_MESSAGE']),
  targetId: z.string().trim().min(1).max(64),
  reason: z.enum(['SPAM', 'HARASSMENT', 'MISINFORMATION', 'SELF_HARM', 'INAPPROPRIATE_CONTENT', 'IMPERSONATION', 'OTHER']),
  description: z.string().trim().max(1000).optional(),
});

/** Kullanıcı yalnızca erişebildiği içeriği şikayet edebilir */
async function assertCanSee(userId, targetType, record) {
  if (targetType === 'DIRECT_MESSAGE') {
    const isParticipant = await prisma.conversationParticipant.count({
      where: { conversationId: record.conversationId, userId },
    });
    if (!isParticipant) throw ApiError.notFound('Şikayet edilen içerik bulunamadı');
  }
  if (targetType === 'ROOM_MESSAGE') {
    const isMember = await prisma.roomMembership.count({ where: { roomId: record.roomId, userId } });
    if (!isMember) throw ApiError.notFound('Şikayet edilen içerik bulunamadı');
  }
}

router.post(
  '/',
  validate({ body: createReport }),
  asyncHandler(async (req, res) => {
    const { targetType, targetId, reason, description } = req.body;
    const { record, ownerId } = await loadTarget(targetType, targetId);
    await assertCanSee(req.user.id, targetType, record);
    if (ownerId === req.user.id) throw ApiError.badRequest('Kendi içeriğinizi şikayet edemezsiniz');

    // Aynı kullanıcının aynı hedef için bekleyen şikayeti varsa tekrar oluşturulmaz
    const existing = await prisma.report.findFirst({
      where: { reporterId: req.user.id, targetType, targetId, status: { in: ['PENDING', 'IN_REVIEW'] } },
      select: { id: true, status: true, createdAt: true },
    });
    if (existing) return res.json({ data: existing });

    const report = await prisma.report.create({
      data: { reporterId: req.user.id, targetType, targetId, reason, description },
      select: { id: true, status: true, createdAt: true },
    });

    // Kendine zarar riski içeren şikayetler moderatörlere anlık bildirilir
    if (reason === 'SELF_HARM') {
      const staff = await prisma.user.findMany({
        where: { role: { in: ['MODERATOR', 'ADMIN'] }, status: 'ACTIVE' },
        select: { id: true },
      });
      staff.forEach((s) => emitToUser(s.id, 'moderation:urgent-report', { reportId: report.id, reason }));
    }

    return res.status(201).json({ data: report });
  }),
);

/** Kullanıcının kendi şikayetleri ve durumları */
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const reports = await prisma.report.findMany({
      where: { reporterId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, targetType: true, targetId: true, reason: true, status: true, createdAt: true, reviewedAt: true },
    });
    res.json({ data: reports });
  }),
);

module.exports = router;
