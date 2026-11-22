// Express uygulaması: güvenlik, loglama, gövde ayrıştırma, rotalar ve hata yönetimi
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.corsOrigins }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.isProduction ? 'combined' : 'dev'));

app.use(
  '/api',
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }),
);

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
