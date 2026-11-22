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
router.use('/media', require('../modules/media/media.routes'));
router.use('/rooms', require('../modules/rooms/rooms.routes'));
router.use('/conversations', require('../modules/conversations/conversations.routes'));

const { posts, comments } = require('../modules/posts/posts.routes');

router.use('/posts', posts);
router.use('/comments', comments);

module.exports = router;
