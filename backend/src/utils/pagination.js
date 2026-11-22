// Sayfalama yardımcıları. Sorgular `limit + 1` kayıt çeker; fazladan kayıt varsa
// bir sonraki sayfanın olduğu anlaşılır.

/** Cursor tabanlı sayfa: { data, nextCursor } */
function toCursorPage(rows, limit, getCursor = (row) => row.id) {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const last = data[data.length - 1];
  return { data, nextCursor: hasMore && last ? String(getCursor(last)) : null };
}

/** Prisma findMany için cursor argümanları */
function cursorArgs(cursor, limit) {
  return {
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  };
}

module.exports = { toCursorPage, cursorArgs };
