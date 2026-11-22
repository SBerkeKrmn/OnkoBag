// Soket olay işleyicileri için ortak sarmalayıcı.
// - Gelen veriyi zod şemasıyla doğrular
// - Hataları istemciye ack({ ok: false, error }) olarak döner
// - Başarıda ack({ ok: true, data }) döner
const { ZodError } = require('zod');
const ApiError = require('../utils/ApiError');

function socketHandler(schema, fn) {
  return async (payload, ack) => {
    const reply = typeof ack === 'function' ? ack : () => {};
    try {
      const input = schema ? schema.parse(payload ?? {}) : payload;
      const data = await fn(input);
      reply({ ok: true, data });
    } catch (err) {
      if (err instanceof ApiError) {
        reply({ ok: false, error: { message: err.message, code: err.code } });
      } else if (err instanceof ZodError) {
        reply({ ok: false, error: { message: 'Doğrulama hatası', code: 'VALIDATION_ERROR' } });
      } else {
        console.error('Soket işleyici hatası:', err);
        reply({ ok: false, error: { message: 'Sunucu hatası', code: 'INTERNAL' } });
      }
    }
  };
}

module.exports = socketHandler;
