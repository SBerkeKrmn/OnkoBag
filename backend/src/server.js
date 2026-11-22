// Giriş noktası: HTTP sunucusunu ve Socket.io'yu aynı port üzerinde başlatır
const http = require('http');
const env = require('./config/env');
const app = require('./app');
const prisma = require('./lib/prisma');
const { initSocket } = require('./sockets');

const server = http.createServer(app);
const io = initSocket(server);
app.set('io', io);

server.listen(env.PORT, () => {
  console.log(`OnkoBağ API çalışıyor: http://localhost:${env.PORT}/api/v1 (${env.NODE_ENV})`);
});

async function shutdown(signal) {
  console.log(`${signal} alındı, sunucu kapatılıyor...`);
  io.close();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
