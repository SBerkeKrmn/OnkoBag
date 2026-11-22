// Servis katmanının Socket.io'ya erişmesi için merkezi nokta.
// Testlerde veya io başlatılmadığında emit çağrıları sessizce yok sayılır.
let io = null;

const setIo = (instance) => {
  io = instance;
};

const getIo = () => io;

/** Kullanıcının tüm bağlı cihazlarına olay gönderir */
const emitToUser = (userId, event, payload) => {
  if (io) io.to(`user:${userId}`).emit(event, payload);
};

/** Bir sohbet odasındaki herkese olay gönderir */
const emitToRoom = (roomId, event, payload) => {
  if (io) io.to(`room:${roomId}`).emit(event, payload);
};

/** Kullanıcının açık soketlerini bir odaya ekler / çıkarır */
const joinUserToRoom = (userId, roomId) => {
  if (io) io.in(`user:${userId}`).socketsJoin(`room:${roomId}`);
};

const removeUserFromRoom = (userId, roomId) => {
  if (io) io.in(`user:${userId}`).socketsLeave(`room:${roomId}`);
};

/** Askıya alınan / silinen kullanıcının bağlantılarını keser */
const disconnectUser = (userId) => {
  if (io) io.in(`user:${userId}`).disconnectSockets(true);
};

module.exports = { setIo, getIo, emitToUser, emitToRoom, joinUserToRoom, removeUserFromRoom, disconnectUser };
