const { Prisma } = require('@prisma/client');
const { ZodError } = require('zod');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function notFound(req, res, next) {
  next(ApiError.notFound(`Bulunamadı: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: { message: err.message, details: err.details } });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({ error: { message: 'Doğrulama hatası', details: err.issues } });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: { message: 'Bu kayıt zaten mevcut', details: err.meta } });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { message: 'Kayıt bulunamadı' } });
    }
  }

  console.error(err);
  return res.status(500).json({
    error: { message: 'Sunucu hatası', ...(env.isProduction ? {} : { details: err.message }) },
  });
}

module.exports = { notFound, errorHandler };
