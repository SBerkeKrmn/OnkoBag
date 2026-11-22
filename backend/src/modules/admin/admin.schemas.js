const { z } = require('zod');
const { uuid, limit } = require('../../utils/schemas');

const reason = z.string().trim().min(3, 'Gerekçe en az 3 karakter olmalı').max(1000);
const futureDate = z.coerce.date().refine((d) => d > new Date(), { message: 'Tarih gelecekte olmalı' });

const listReports = z.object({
  status: z.enum(['PENDING', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']).optional(),
  targetType: z.enum(['USER', 'POST', 'COMMENT', 'ROOM_MESSAGE', 'DIRECT_MESSAGE']).optional(),
  cursor: uuid.optional(),
  limit: limit(100, 30),
});

const updateReport = z.object({
  status: z.enum(['IN_REVIEW', 'RESOLVED', 'DISMISSED']),
  resolutionNote: z.string().trim().max(1000).optional(),
});

const contentParams = z.object({
  targetType: z.enum(['POST', 'COMMENT', 'ROOM_MESSAGE', 'DIRECT_MESSAGE']),
  targetId: z.string().min(1).max(64),
});

const contentAction = z.object({ reason, reportId: uuid.optional() });

const suspend = z.object({
  /** Boş bırakılırsa süresiz askıya alma */
  until: futureDate.optional(),
  reason,
  reportId: uuid.optional(),
});

const warn = z.object({ reason, reportId: uuid.optional() });

const changeRole = z.object({ role: z.enum(['USER', 'MODERATOR', 'ADMIN']) });

const silence = z.object({ until: futureDate.nullable(), reason: reason.optional() });

const roomMemberParams = z.object({ roomId: uuid, userId: uuid });

const listUsers = z.object({
  q: z.string().trim().max(50).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']).optional(),
  role: z.enum(['USER', 'MODERATOR', 'ADMIN']).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: limit(100, 30),
});

const listRooms = z.object({ cancerTypeId: z.coerce.number().int().positive().optional() });

const createRoom = z.object({
  cancerTypeId: z.coerce.number().int().positive(),
  name: z.string().trim().min(3).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  maxMembers: z.coerce.number().int().min(2).max(10000).optional(),
});

const updateRoom = z
  .object({
    name: z.string().trim().min(3).max(100),
    description: z.string().trim().max(500).nullable(),
    maxMembers: z.coerce.number().int().min(2).max(10000),
    isActive: z.boolean(),
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'Güncellenecek en az bir alan gönderin' });

const createCancerType = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,100}$/, 'slug yalnızca küçük harf, rakam ve tire içerebilir'),
  description: z.string().trim().max(2000).optional(),
  iconName: z.string().trim().max(50).optional(),
  sortOrder: z.coerce.number().int().optional(),
});

const updateCancerType = createCancerType
  .omit({ slug: true })
  .extend({ isActive: z.boolean(), description: z.string().trim().max(2000).nullable() })
  .partial()
  .refine((o) => Object.keys(o).length > 0, { message: 'Güncellenecek en az bir alan gönderin' });

const listLogs = z.object({
  targetUserId: uuid.optional(),
  cursor: uuid.optional(),
  limit: limit(100, 50),
});

module.exports = {
  listReports,
  updateReport,
  contentParams,
  contentAction,
  suspend,
  warn,
  changeRole,
  silence,
  roomMemberParams,
  listUsers,
  listRooms,
  createRoom,
  updateRoom,
  createCancerType,
  updateCancerType,
  listLogs,
};
