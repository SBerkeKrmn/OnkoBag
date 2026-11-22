const { Prisma } = require('@prisma/client');
const { ZodError } = require('zod');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function notFound(req, res, next) {
  next(ApiError.notFound(`Bulunamadı: ${req.method} ${req.originalUrl}`));
}

function formatZodIssues(error) {
  return error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, code: err.code, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { message: 'Doğrulama hatası', code: 'VALIDATION_ERROR', details: formatZodIssues(err) },
    });
  }

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Dosya boyutu çok büyük' : 'Dosya yüklenemedi';
    return res.status(400).json({ error: { message, code: err.code } });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: { message: 'Bu kayıt zaten mevcut', code: 'CONFLICT' } });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { message: 'Kayıt bulunamadı', code: 'NOT_FOUND' } });
    }
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Geçersiz JSON gövdesi', code: 'INVALID_JSON' } });
  }

  console.error(err);
  return res.status(500).json({
    error: { message: 'Sunucu hatası', code: 'INTERNAL', ...(env.isProduction ? {} : { details: err.message }) },
  });
}

module.exports = { notFound, errorHandler };
