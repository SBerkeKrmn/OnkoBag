// İş kuralı hataları için HTTP durum koduyla birlikte fırlatılan hata sınıfı.
// `code` alanı mobil istemcinin hatayı programatik olarak ayırt etmesi içindir.
class ApiError extends Error {
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Geçersiz istek', opts) {
    return new ApiError(400, message, opts);
  }

  static unauthorized(message = 'Kimlik doğrulaması gerekli', opts) {
    return new ApiError(401, message, opts);
  }

  static forbidden(message = 'Bu işlem için yetkiniz yok', opts) {
    return new ApiError(403, message, opts);
  }

  static notFound(message = 'Kaynak bulunamadı', opts) {
    return new ApiError(404, message, opts);
  }

  static conflict(message = 'Kaynak zaten mevcut', opts) {
    return new ApiError(409, message, opts);
  }

  static tooMany(message = 'Çok fazla deneme yaptınız, lütfen daha sonra tekrar deneyin', opts) {
    return new ApiError(429, message, opts);
  }
}

module.exports = ApiError;
