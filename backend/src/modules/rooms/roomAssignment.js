// Ölçeklenebilir oda ataması.
// Kullanıcı bir kanser türüne eklendiğinde, o türün aktif odalarından kapasitesi
// dolmamış en küçük numaralı odaya yerleştirilir; hepsi doluysa yeni oda açılır.
// Aynı anda kayıt olan kullanıcıların aynı son boş koltuğu kapmaması için
// kanser türü başına PostgreSQL advisory lock alınır (transaction sonunda bırakılır).
const prisma = require('../../lib/prisma');

const ROOM_LOCK_NAMESPACE = 1001;

async function lockCancerTypeRooms(tx, cancerTypeId) {
  await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(${ROOM_LOCK_NAMESPACE}::int, ${cancerTypeId}::int)) AS l`;
}

/**
 * Kullanıcıyı ilgili kanser türünün bir odasına ekler. Zaten üyeyse mevcut odayı döner.
 * @returns {Promise<{ room: object, created: boolean }>} created: yeni oda açıldı mı
 */
async function assignUserToRoom(tx, userId, cancerTypeId) {
  await lockCancerTypeRooms(tx, cancerTypeId);

  const existing = await tx.roomMembership.findFirst({
    where: { userId, room: { cancerTypeId, isActive: true } },
    include: { room: true },
  });
  if (existing) return { room: existing.room, created: false };

  let room = await tx.chatRoom.findFirst({
    where: { cancerTypeId, isActive: true, memberCount: { lt: prisma.chatRoom.fields.maxMembers } },
    orderBy: { roomNumber: 'asc' },
  });

  let created = false;
  if (!room) {
    const [cancerType, last, defaultRoom] = await Promise.all([
      tx.cancerType.findUniqueOrThrow({ where: { id: cancerTypeId } }),
      tx.chatRoom.findFirst({ where: { cancerTypeId }, orderBy: { roomNumber: 'desc' } }),
      tx.chatRoom.findFirst({ where: { cancerTypeId, isDefault: true } }),
    ]);
    const roomNumber = (last?.roomNumber ?? 0) + 1;
    room = await tx.chatRoom.create({
      data: {
        cancerTypeId,
        roomNumber,
        name: roomNumber === 1 ? `${cancerType.name} Genel Sohbet` : `${cancerType.name} Genel Sohbet #${roomNumber}`,
        description: `${cancerType.name} ile mücadele eden ve bu hastalığı atlatmış kişilerin buluşma alanı.`,
        isDefault: !defaultRoom,
        // Yeni odalar ilk odanın kapasitesini devralır
        ...(last ? { maxMembers: last.maxMembers } : {}),
      },
    });
    created = true;
  }

  await tx.roomMembership.create({ data: { roomId: room.id, userId } });
  room = await tx.chatRoom.update({ where: { id: room.id }, data: { memberCount: { increment: 1 } } });

  return { room, created };
}

/** Kullanıcıyı bir kanser türünün tüm odalarından çıkarır; çıkarılan oda kimliklerini döner */
async function removeUserFromCancerTypeRooms(tx, userId, cancerTypeId) {
  const memberships = await tx.roomMembership.findMany({
    where: { userId, room: { cancerTypeId } },
    select: { roomId: true },
  });

  for (const { roomId } of memberships) {
    await tx.roomMembership.delete({ where: { roomId_userId: { roomId, userId } } });
    await tx.chatRoom.update({ where: { id: roomId }, data: { memberCount: { decrement: 1 } } });
  }

  return memberships.map((m) => m.roomId);
}

module.exports = { assignUserToRoom, removeUserFromCancerTypeRooms };
