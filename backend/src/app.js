// Express uygulaması: güvenlik, loglama, gövde ayrıştırma, rotalar ve hata yönetimi
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { apiLimiter } = require('./lib/rateLimits');

const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { serveUpload } = require('./modules/media/media.service');

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

app.use('/api', apiLimiter);

// Yüklenen görseller (dosya adları tahmin edilemez UUID'lerdir)
// Görseller yalnızca imzalı, süreli bağlantıyla açılır (bkz. lib/mediaUrls.js)
app.get('/uploads/:key', serveUpload);

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
