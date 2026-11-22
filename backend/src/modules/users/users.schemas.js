const { z } = require('zod');
const { year, uuid } = require('../../utils/schemas');
const { cancerProfileInput } = require('../auth/auth.schemas');

const nullableText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v === '' ? null : v));

const updateMe = z
  .object({
    displayName: nullableText(60),
    bio: nullableText(500),
    birthYear: year.nullable(),
    gender: z.enum(['FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY']).nullable(),
    city: nullableText(40),
    dmPermission: z.enum(['EVERYONE', 'FOLLOWING', 'NOBODY']),
    /** /media ile yüklenmiş görselin kimliği; null → avatarı kaldır */
    avatarMediaId: uuid.nullable(),
  })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, { message: 'Güncellenecek en az bir alan gönderin' });

const deleteMe = z.object({ password: z.string().min(1).max(72) });

const createCancerProfile = cancerProfileInput.and(z.object({ isPrimary: z.boolean().default(false) }));

const updateCancerProfile = z
  .object({
    status: z.enum(['ACTIVE_TREATMENT', 'SURVIVOR']),
    diagnosisYear: year.nullable(),
    remissionYear: year.nullable(),
    isPrimary: z.literal(true),
  })
  .partial();

const pushToken = z.object({
  token: z.string().trim().min(10).max(255),
  platform: z.enum(['ANDROID', 'IOS']),
});

const search = z.object({
  q: z.string().trim().min(2, 'En az 2 karakter girin').max(50),
  limit: z.coerce.number().int().min(1).max(30).default(20),
});

const suggestions = z.object({
  status: z.enum(['ACTIVE_TREATMENT', 'SURVIVOR']).default('SURVIVOR'),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

const usernameParam = z.object({ username: z.string().trim().min(3).max(30) });

module.exports = {
  updateMe,
  deleteMe,
  createCancerProfile,
  updateCancerProfile,
  pushToken,
  search,
  suggestions,
  usernameParam,
};
