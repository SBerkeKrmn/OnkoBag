// Medya yükleme ve içeriklere bağlama.
// Akış: istemci önce POST /media ile görseli yükler, dönen `id`'yi gönderi veya
// mesaj oluştururken `mediaIds` içinde gönderir. Bağlama sırasında medyanın
// yükleyene ait olduğu ve başka bir içeriğe bağlı olmadığı doğrulanır.
// Depolama STORAGE_DRIVER ile seçilir:
//  - disk (varsayılan, geliştirme): UPLOAD_DIR klasörüne yazılır
//  - database (bulut): görsel media_blobs tablosunda tutulur; sunucu yeniden
//    başlayınca diski sıfırlanan barındırma servislerinde görseller kaybolmaz
// Her iki durumda da URL aynıdır: {PUBLIC_URL}/uploads/{storageKey}
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

const useDatabase = env.STORAGE_DRIVER === 'database';
if (!useDatabase) fs.mkdirSync(env.uploadDir, { recursive: true });

const upload = multer({
  storage: useDatabase
    ? multer.memoryStorage()
    : multer.diskStorage({
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
function hasImageSignature(buf) {
  if (!buf || buf.length < 12) return false;
  const hex = buf.subarray(0, 12).toString('hex');
  return (
    hex.startsWith('ffd8ff') || // JPEG
    hex.startsWith('89504e47') || // PNG
    (hex.startsWith('52494646') && buf.toString('ascii', 8, 12) === 'WEBP') || // WEBP
    buf.toString('ascii', 4, 8) === 'ftyp' // HEIC/HEIF
  );
}

function readHead(filePath) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(12);
  fs.readSync(fd, buf, 0, 12, 0);
  fs.closeSync(fd);
  return buf;
}

async function createFromUpload(userId, file) {
  if (!file) throw ApiError.badRequest('"file" alanında bir görsel gönderin', { code: 'FILE_REQUIRED' });

  const head = useDatabase ? file.buffer : readHead(file.path);
  if (!hasImageSignature(head)) {
    if (!useDatabase) fs.rmSync(file.path, { force: true });
    throw ApiError.badRequest('Dosya geçerli bir görsel değil', { code: 'INVALID_FILE_TYPE' });
  }

  const storageKey = useDatabase ? `${crypto.randomUUID()}${ALLOWED_TYPES[file.mimetype]}` : file.filename;
  return prisma.media.create({
    data: {
      uploaderId: userId,
      storageKey,
      url: `${env.PUBLIC_URL}/uploads/${storageKey}`,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      ...(useDatabase ? { blob: { create: { data: file.buffer } } } : {}),
    },
    select: mediaSelect,
  });
}

/**
 * GET /uploads/:key — veritabanında tutulan görseli döner. Diskteki dosyalar
 * önce express.static ile sunulur; bulunamazsa buraya düşer.
 * Anahtarlar tahmin edilemez UUID'lerdir ve içerik değişmez (uzun önbellek).
 */
async function serveStored(req, res, next) {
  try {
    const media = await prisma.media.findUnique({
      where: { storageKey: req.params.key },
      select: { mimeType: true, blob: { select: { data: true } } },
    });
    if (!media?.blob) return next();
    res.set('Content-Type', media.mimeType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(Buffer.from(media.blob.data));
  } catch (err) {
    return next(err);
  }
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
  await prisma.media.delete({ where: { id: mediaId } }); // media_blobs satırı da silinir (cascade)
  if (!useDatabase) fs.rmSync(path.join(env.uploadDir, media.storageKey), { force: true });
}

module.exports = { upload, createFromUpload, attachMedia, remove, serveStored };
