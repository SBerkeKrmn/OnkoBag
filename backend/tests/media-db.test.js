// Bulut ortamı: görseller diske değil veritabanına yazılır (STORAGE_DRIVER=database)
process.env.STORAGE_DRIVER = 'database';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, prisma, resetDb, createUser, auth } = require('./helpers');

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

describe('Veritabanında görsel depolama', () => {
  let user;

  before(async () => {
    await resetDb();
    user = await createUser();
  });
  after(() => prisma.$disconnect());

  test('Yüklenen görsel veritabanından aynen sunulur', async () => {
    const res = await api()
      .post('/api/v1/media')
      .set(auth(user.accessToken))
      .attach('file', PNG, { filename: 'foto.png', contentType: 'image/png' });
    assert.equal(res.status, 201);

    const blob = await prisma.mediaBlob.findUnique({ where: { mediaId: res.body.data.id } });
    assert.ok(blob, 'görsel media_blobs tablosuna yazılmalı');

    const path = new URL(res.body.data.url).pathname;
    const served = await api().get(path).buffer(true).parse((r, cb) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    assert.equal(served.status, 200);
    assert.equal(served.headers['content-type'], 'image/png');
    assert.ok(Buffer.from(served.body).equals(PNG));
  });

  test('Görsel olmayan dosya reddedilir; olmayan anahtar 404', async () => {
    const bad = await api()
      .post('/api/v1/media')
      .set(auth(user.accessToken))
      .attach('file', Buffer.from('bu bir görsel değil'), { filename: 'x.png', contentType: 'image/png' });
    assert.equal(bad.status, 400);

    const missing = await api().get('/uploads/yok.png');
    assert.equal(missing.status, 404);
  });

  test('Kullanılmamış görsel silinince baytları da silinir', async () => {
    const up = await api()
      .post('/api/v1/media')
      .set(auth(user.accessToken))
      .attach('file', PNG, { filename: 'foto.png', contentType: 'image/png' });
    const del = await api().delete(`/api/v1/media/${up.body.data.id}`).set(auth(user.accessToken));
    assert.equal(del.status, 204);
    assert.equal(await prisma.mediaBlob.count({ where: { mediaId: up.body.data.id } }), 0);
  });
});
