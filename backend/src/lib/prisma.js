// Uygulama genelinde paylaşılan tek PrismaClient örneği
const { PrismaClient } = require('@prisma/client');
const env = require('../config/env');

const prisma = new PrismaClient({
  log: env.isProduction ? ['error'] : ['warn', 'error'],
});

module.exports = prisma;
