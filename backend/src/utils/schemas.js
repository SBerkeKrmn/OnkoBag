// Modüller arasında paylaşılan zod şemaları
const { z } = require('zod');

const uuid = z.uuid({ message: 'Geçersiz kimlik' });

/** BIGINT mesaj kimlikleri istemciden string olarak gelir */
const bigintId = z
  .union([z.string().regex(/^\d+$/), z.number().int().nonnegative()])
  .transform((v) => BigInt(v));

const idParam = z.object({ id: uuid });

const limit = (max = 50, def = 20) => z.coerce.number().int().min(1).max(max).default(def);

/** Mesaj listeleri: ?before=<id>&limit= (daha eski mesajlara doğru) */
const messagePageQuery = z.object({
  before: bigintId.optional(),
  limit: limit(100, 30),
});

/** Genel cursor tabanlı listeler: ?cursor=<uuid>&limit= */
const cursorPageQuery = z.object({
  cursor: uuid.optional(),
  limit: limit(50, 20),
});

/** Offset tabanlı küçük listeler (takipçiler, üyeler) */
const offsetPageQuery = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: limit(100, 30),
});

const currentYear = () => new Date().getFullYear();
const year = z.coerce
  .number()
  .int()
  .min(1900)
  .refine((y) => y <= currentYear(), { message: 'Yıl gelecekte olamaz' });

const trimmedText = (max, min = 1) => z.string().trim().min(min).max(max);

const mediaIds = (max) => z.array(uuid).max(max).default([]);

module.exports = {
  uuid,
  bigintId,
  idParam,
  limit,
  messagePageQuery,
  cursorPageQuery,
  offsetPageQuery,
  year,
  trimmedText,
  mediaIds,
};
