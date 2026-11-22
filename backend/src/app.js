// Express uygulaması: güvenlik, loglama, gövde ayrıştırma, rotalar ve hata yönetimi
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { serveStored } = require('./modules/media/media.service');

// Mesaj kimlikleri BIGINT; JSON'da hassasiyet kaybı olmaması için string olarak döner
// eslint-disable-next-line no-extend-native
BigInt.prototype.toJSON = function toJSON() {
  return this.toString();
};

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: env.corsOrigins }));
app.use(express.json({ limit: '1mb' }));
if (!env.isTest) app.use(morgan(env.isProduction ? 'combined' : 'dev'));

app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.isTest,
  }),
);

// Yüklenen görseller (dosya adları tahmin edilemez UUID'lerdir)
app.use('/uploads', express.static(env.uploadDir, { maxAge: '7d', index: false }));
// Diskte yoksa veritabanından (STORAGE_DRIVER=database)
app.get('/uploads/:key', serveStored);

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
