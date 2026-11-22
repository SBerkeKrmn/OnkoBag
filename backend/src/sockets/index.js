// Socket.io sunucusu.
// Bağlanırken token doğrulanır: io(url, { auth: { token: accessToken } })
// Her soket otomatik olarak şu kanallara katılır:
//   user:<id>   → kullanıcıya özel olaylar (DM, bildirim)
//   room:<id>   → üye olduğu genel sohbet odaları
const { Server } = require('socket.io');
const env = require('../config/env');
const prisma = require('../lib/prisma');
const realtime = require('../lib/realtime');
const { authenticateToken } = require('../middlewares/auth');
const registerRoomHandlers = require('./rooms.handlers');
const registerDmHandlers = require('./dm.handlers');

function initSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: env.corsOrigins } });

  io.use(async (socket, next) => {
    try {
      socket.user = await authenticateToken(socket.handshake.auth?.token);
      return next();
    } catch (err) {
      const error = new Error(err.message);
      error.data = { code: err.code ?? 'UNAUTHORIZED' };
      return next(error);
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);

    registerRoomHandlers(io, socket);
    registerDmHandlers(io, socket);

    try {
      const memberships = await prisma.roomMembership.findMany({ where: { userId }, select: { roomId: true } });
      memberships.forEach(({ roomId }) => socket.join(`room:${roomId}`));
      socket.emit('ready', { rooms: memberships.map((m) => m.roomId) });
    } catch (err) {
      console.error('Soket oda katılımı başarısız:', err.message);
    }

    socket.on('disconnect', async () => {
      const stillOnline = (await io.in(`user:${userId}`).fetchSockets()).length > 0;
      if (!stillOnline) {
        await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {});
      }
    });
  });

  realtime.setIo(io);
  return io;
}

module.exports = { initSocket };
