// Medya yükleme ve içeriklere bağlama.
// Akış: istemci önce POST /media ile görseli yükler, dönen `id`'yi gönderi veya
// mesaj oluştururken `mediaIds` içinde gönderir. Bağlama sırasında medyanın
// yükleyene ait olduğu ve başka bir içeriğe bağlı olmadığı doğrulanır.
// Depolama şu an yerel disktir; ileride S3/Cloudinary'ye geçiş için yalnızca
// bu dosyadaki multer storage ve URL üretimi değişir.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const prisma = require('../../lib/prisma');
const env = require('../../config/env');
const ApiError = require('../../utils/ApiError');
const { mediaSelect } = require('../../lib/selects');

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
};

fs.mkdirSync(env.uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: env.uploadDir,
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED_TYPES[file.mimetype]}`),
  }),
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    return cb(ApiError.badRequest('Yalnızca JPEG, PNG, WEBP veya HEIC görseller yüklenebilir', { code: 'INVALID_FILE_TYPE' }));
  },
});

/** Dosya imzasını (magic bytes) kontrol eder: uzantısı değiştirilmiş zararlı dosyalara karşı */
function hasImageSignature(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  const hex = buf.toString('hex');
  return (
    hex.startsWith('ffd8ff') || // JPEG
    hex.startsWith('89504e47') || // PNG
    (hex.startsWith('52494646') && buf.toString('ascii', 8, 12) === 'WEBP') || // WEBP
    buf.toString('ascii', 4, 8) === 'ftyp' // HEIC/HEIF
  );
}

async function createFromUpload(userId, file) {
  if (!file) throw ApiError.badRequest('"file" alanında bir görsel gönderin', { code: 'FILE_REQUIRED' });

  if (!hasImageSignature(file.path)) {
    fs.rmSync(file.path, { force: true });
    throw ApiError.badRequest('Dosya geçerli bir görsel değil', { code: 'INVALID_FILE_TYPE' });
  }

  return prisma.media.create({
    data: {
      uploaderId: userId,
      storageKey: file.filename,
      url: `${env.PUBLIC_URL}/uploads/${file.filename}`,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    },
    select: mediaSelect,
  });
}

/**
 * Yüklenmiş medyaları bir içeriğe bağlar.
 * @param target { postId } | { roomMessageId } | { directMessageId }
 */
async function attachMedia(tx, userId, mediaIds, target) {
  if (!mediaIds?.length) return;
  const unique = [...new Set(mediaIds)];

  const owned = await tx.media.findMany({
    where: { id: { in: unique }, uploaderId: userId, postId: null, roomMessageId: null, directMessageId: null },
    select: { id: true },
  });
  if (owned.length !== unique.length) {
    throw ApiError.badRequest('Geçersiz veya daha önce kullanılmış medya', { code: 'INVALID_MEDIA' });
  }

  for (const [index, id] of unique.entries()) {
    await tx.media.update({ where: { id }, data: { ...target, sortOrder: index } });
  }
}

/** Bağlanmamış (henüz kullanılmamış) kendi medyasını siler */
async function remove(userId, mediaId) {
  const media = await prisma.media.findFirst({
    where: { id: mediaId, uploaderId: userId, postId: null, roomMessageId: null, directMessageId: null },
  });
  if (!media) throw ApiError.notFound('Medya bulunamadı');
  await prisma.media.delete({ where: { id: mediaId } });
  fs.rmSync(path.join(env.uploadDir, media.storageKey), { force: true });
}

module.exports = { upload, createFromUpload, attachMedia, remove };
