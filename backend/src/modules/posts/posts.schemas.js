const { z } = require('zod');
const { uuid, limit, mediaIds } = require('../../utils/schemas');

const category = z.enum(['QUESTION', 'EXPERIENCE', 'TREATMENT', 'SIDE_EFFECTS', 'MOTIVATION', 'DAILY_LIFE', 'OTHER']);

const createPost = z.object({
  cancerTypeId: z.coerce.number().int().positive(),
  category: category.default('EXPERIENCE'),
  title: z.string().trim().min(1).max(150).optional(),
  content: z.string().trim().min(1, 'Gönderi boş olamaz').max(5000),
  mediaIds: mediaIds(4),
});

const updatePost = z
  .object({
    category,
    title: z.string().trim().max(150).nullable(),
    content: z.string().trim().min(1).max(5000),
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, { message: 'Güncellenecek en az bir alan gönderin' });

const listPosts = z.object({
  cancerTypeId: z.coerce.number().int().positive().optional(),
  category: category.optional(),
  authorId: uuid.optional(),
  cursor: uuid.optional(),
  limit: limit(50, 20),
});

const feed = z.object({ cursor: uuid.optional(), limit: limit(50, 20) });

const createComment = z.object({
  content: z.string().trim().min(1, 'Yorum boş olamaz').max(2000),
  parentId: uuid.optional(),
});

const updateComment = z.object({ content: z.string().trim().min(1).max(2000) });

module.exports = { category, createPost, updatePost, listPosts, feed, createComment, updateComment };
