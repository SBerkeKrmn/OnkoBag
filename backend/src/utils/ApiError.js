// İş kuralı hataları için HTTP durum koduyla birlikte fırlatılan hata sınıfı
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message = 'Geçersiz istek', details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Kimlik doğrulaması gerekli') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Bu işlem için yetkiniz yok') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Kaynak bulunamadı') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Kaynak zaten mevcut') {
    return new ApiError(409, message);
  }
}

module.exports = ApiError;
