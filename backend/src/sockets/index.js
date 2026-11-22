// Socket.io sunucusu: bağlantıda JWT doğrulaması yapılır.
// Oda (genel sohbet) ve birebir mesajlaşma olay işleyicileri backend aşamasında
// ./rooms.handlers.js ve ./dm.handlers.js dosyalarına eklenecek.
const { Server } = require('socket.io');
const env = require('../config/env');
const { verifyAccessToken } = require('../middlewares/auth');

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins },
  });

  // Bağlantı sırasında token: io(url, { auth: { token } })
  io.use((socket, next) => {
    try {
      const payload = verifyAccessToken(socket.handshake.auth?.token);
      socket.user = { id: payload.sub, role: payload.role };
      return next();
    } catch {
      return next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    // Kullanıcıya özel kanal: DM ve bildirimler bu kanala gönderilir
    socket.join(`user:${socket.user.id}`);

    socket.on('disconnect', () => {
      // Backend aşamasında: lastSeenAt güncellemesi
    });
  });

  return io;
}

module.exports = { initSocket };
