// Engelleme ilişkisi yardımcıları. Engelleme iki yönlü etki eder: engelleyen de
// engellenen de birbirinin içeriğini görmez ve birbirine mesaj atamaz.
const prisma = require('./prisma');

/** Kullanıcının engellediği veya onu engelleyen tüm kullanıcı kimlikleri */
async function getBlockedUserIds(userId) {
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return [...new Set(rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId)))];
}

/** İki kullanıcı arasında herhangi bir yönde engel var mı? */
async function isBlockedBetween(a, b, db = prisma) {
  const count = await db.block.count({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return count > 0;
}

module.exports = { getBlockedUserIds, isBlockedBetween };
