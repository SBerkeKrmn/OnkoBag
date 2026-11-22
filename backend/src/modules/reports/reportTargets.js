// Şikayet ve moderasyon işlemlerinde kullanılan polimorfik hedef çözümleyici.
// targetType + targetId (metin) → ilgili tablo, kimlik tipi ve içerik sahibi.
const { z } = require('zod');
const prisma = require('../../lib/prisma');
const ApiError = require('../../utils/ApiError');

const uuidSchema = z.uuid();
const bigintSchema = z.string().regex(/^\d{1,19}$/);

const TARGETS = {
  USER: { model: 'user', idType: 'uuid', ownerField: 'id' },
  POST: { model: 'post', idType: 'uuid', ownerField: 'authorId' },
  COMMENT: { model: 'comment', idType: 'uuid', ownerField: 'authorId' },
  ROOM_MESSAGE: { model: 'roomMessage', idType: 'bigint', ownerField: 'senderId' },
  DIRECT_MESSAGE: { model: 'directMessage', idType: 'bigint', ownerField: 'senderId' },
};

/** targetId'yi doğrular ve veritabanı tipine çevirir */
function parseTargetId(targetType, targetId) {
  const def = TARGETS[targetType];
  const ok = def.idType === 'uuid' ? uuidSchema.safeParse(targetId).success : bigintSchema.safeParse(targetId).success;
  if (!ok) throw ApiError.badRequest('Geçersiz hedef kimliği', { code: 'INVALID_TARGET' });
  return def.idType === 'bigint' ? BigInt(targetId) : targetId;
}

/** Hedef kaydı getirir; yoksa 404 */
async function loadTarget(targetType, targetId) {
  const def = TARGETS[targetType];
  const id = parseTargetId(targetType, targetId);
  const record = await prisma[def.model].findUnique({ where: { id } });
  if (!record) throw ApiError.notFound('Şikayet edilen içerik bulunamadı');
  return { record, id, ownerId: record[def.ownerField], def };
}

/** Moderatör paneli için hedefin kısa önizlemesi */
async function previewTarget(targetType, targetId) {
  try {
    const { record, ownerId } = await loadTarget(targetType, targetId);
    const owner = ownerId
      ? await prisma.user.findUnique({ where: { id: ownerId }, select: { id: true, username: true, status: true } })
      : null;
    const text =
      targetType === 'USER'
        ? record.bio
        : targetType === 'POST'
          ? [record.title, record.content].filter(Boolean).join(' — ')
          : record.content;
    return {
      exists: true,
      owner,
      status: record.status,
      text: text ? text.slice(0, 500) : null,
      createdAt: record.createdAt,
      ...(targetType === 'COMMENT' ? { postId: record.postId } : {}),
      ...(targetType === 'ROOM_MESSAGE' ? { roomId: record.roomId } : {}),
    };
  } catch {
    return { exists: false };
  }
}

module.exports = { TARGETS, parseTargetId, loadTarget, previewTarget };
