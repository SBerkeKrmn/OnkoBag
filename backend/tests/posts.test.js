const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, prisma, resetDb, createUser, auth } = require('./helpers');

describe('Gönderiler, yorumlar ve beğeniler', () => {
  let selin;
  let burak;
  let ece;
  let postId;

  before(async () => {
    await resetDb();
    selin = await createUser({ cancerTypeId: 1, status: 'SURVIVOR' });
    burak = await createUser({ cancerTypeId: 1, status: 'ACTIVE_TREATMENT' });
    ece = await createUser({ cancerTypeId: 2, status: 'ACTIVE_TREATMENT' });
  });
  after(() => prisma.$disconnect());

  test('Gönderi oluşturma', async () => {
    const res = await api()
      .post('/api/v1/posts')
      .set(auth(selin.accessToken))
      .send({ cancerTypeId: 1, category: 'MOTIVATION', title: '5 yıl oldu', content: 'Bugün remisyonun 5. yılı. Pes etmeyin!' });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.author.id, selin.id);
    assert.equal(res.body.data.author.primaryCancer.status, 'SURVIVOR');
    assert.equal(res.body.data.likeCount, 0);
    postId = res.body.data.id;
  });

  test('Kendi topluluğu olmayan kanser türünde paylaşım yapılamaz', async () => {
    const res = await api().post('/api/v1/posts').set(auth(ece.accessToken)).send({ cancerTypeId: 1, content: 'deneme' });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'NOT_COMMUNITY_MEMBER');
  });

  test('Topluluk listesi ve kişisel akış', async () => {
    const list = await api().get('/api/v1/posts?cancerTypeId=1').set(auth(ece.accessToken));
    assert.equal(list.body.data.length, 1, 'başka topluluklar okunabilir');

    const burakFeed = await api().get('/api/v1/posts/feed').set(auth(burak.accessToken));
    assert.ok(burakFeed.body.data.some((p) => p.id === postId), 'aynı topluluktaki gönderi akışta olmalı');

    const eceFeed = await api().get('/api/v1/posts/feed').set(auth(ece.accessToken));
    assert.ok(!eceFeed.body.data.some((p) => p.id === postId));

    await api().post(`/api/v1/users/${selin.id}/follow`).set(auth(ece.accessToken));
    const eceFeed2 = await api().get('/api/v1/posts/feed').set(auth(ece.accessToken));
    assert.ok(eceFeed2.body.data.some((p) => p.id === postId), 'takip edilen kişinin gönderisi akışta olmalı');
  });

  test('Kategori filtresi ve cursor sayfalama', async () => {
    for (let i = 0; i < 3; i += 1) {
      await api().post('/api/v1/posts').set(auth(burak.accessToken)).send({ cancerTypeId: 1, category: 'QUESTION', content: `soru ${i}` });
    }
    const page1 = await api().get('/api/v1/posts?cancerTypeId=1&category=QUESTION&limit=2').set(auth(selin.accessToken));
    assert.equal(page1.body.data.length, 2);
    assert.equal(page1.body.data[0].content, 'soru 2', 'en yeni önce');
    assert.ok(page1.body.nextCursor);

    const page2 = await api()
      .get(`/api/v1/posts?cancerTypeId=1&category=QUESTION&limit=2&cursor=${page1.body.nextCursor}`)
      .set(auth(selin.accessToken));
    assert.equal(page2.body.data.length, 1);
    assert.equal(page2.body.nextCursor, null);
  });

  test('Beğeni idempotent, sayaç ve bildirim doğru', async () => {
    const like1 = await api().post(`/api/v1/posts/${postId}/like`).set(auth(burak.accessToken));
    const like2 = await api().post(`/api/v1/posts/${postId}/like`).set(auth(burak.accessToken));
    assert.equal(like1.body.data.likeCount, 1);
    assert.equal(like2.body.data.likeCount, 1, 'ikinci beğeni sayacı artırmamalı');

    const post = await api().get(`/api/v1/posts/${postId}`).set(auth(burak.accessToken));
    assert.equal(post.body.data.likedByMe, true);

    const notifs = await prisma.notification.count({ where: { userId: selin.id, type: 'POST_LIKED' } });
    assert.equal(notifs, 1);

    const unlike = await api().delete(`/api/v1/posts/${postId}/like`).set(auth(burak.accessToken));
    assert.equal(unlike.body.data.likeCount, 0);
    assert.equal((await prisma.post.findUnique({ where: { id: postId } })).likeCount, 0);
  });

  test('Yorum, tek seviye yanıt ve bildirimler', async () => {
    const c1 = await api()
      .post(`/api/v1/posts/${postId}/comments`)
      .set(auth(burak.accessToken))
      .send({ content: 'Çok umut verici, tebrikler!' });
    assert.equal(c1.status, 201);

    const reply = await api()
      .post(`/api/v1/posts/${postId}/comments`)
      .set(auth(selin.accessToken))
      .send({ content: 'Teşekkürler, sen de başaracaksın', parentId: c1.body.data.id });
    assert.equal(reply.body.data.parentId, c1.body.data.id);

    // Yanıta yanıt → en üstteki yoruma bağlanır
    const nested = await api()
      .post(`/api/v1/posts/${postId}/comments`)
      .set(auth(ece.accessToken))
      .send({ content: '💜', parentId: reply.body.data.id });
    assert.equal(nested.body.data.parentId, c1.body.data.id);

    const list = await api().get(`/api/v1/posts/${postId}/comments`).set(auth(selin.accessToken));
    assert.equal(list.body.data.length, 1);
    assert.equal(list.body.data[0].replies.length, 2);

    const post = await prisma.post.findUnique({ where: { id: postId } });
    assert.equal(post.commentCount, 3);

    assert.equal(await prisma.notification.count({ where: { userId: selin.id, type: 'POST_COMMENTED' } }), 2);
    // Burak'a yalnızca Selin doğrudan yanıt verdi; Ece, Selin'in yanıtını yanıtladı
    // (gönderi sahibi Selin zaten POST_COMMENTED bildirimi aldığı için ikinci bildirim üretilmez)
    assert.equal(await prisma.notification.count({ where: { userId: burak.id, type: 'COMMENT_REPLIED' } }), 1);
  });

  test('Yorum beğenme, düzenleme ve silme', async () => {
    const c = await api().post(`/api/v1/posts/${postId}/comments`).set(auth(burak.accessToken)).send({ content: 'yazım hatsı' });
    const id = c.body.data.id;

    const like = await api().post(`/api/v1/comments/${id}/like`).set(auth(selin.accessToken));
    assert.equal(like.body.data.likeCount, 1);

    const foreign = await api().patch(`/api/v1/comments/${id}`).set(auth(selin.accessToken)).send({ content: 'x' });
    assert.equal(foreign.status, 403);

    const edit = await api().patch(`/api/v1/comments/${id}`).set(auth(burak.accessToken)).send({ content: 'yazım hatası' });
    assert.equal(edit.body.data.content, 'yazım hatası');

    const before = (await prisma.post.findUnique({ where: { id: postId } })).commentCount;
    await api().delete(`/api/v1/comments/${id}`).set(auth(burak.accessToken));
    const afterCount = (await prisma.post.findUnique({ where: { id: postId } })).commentCount;
    assert.equal(afterCount, before - 1);
  });

  test('Gönderi düzenleme/silme yalnızca sahibine açık; silinen gönderi görünmez', async () => {
    const foreign = await api().patch(`/api/v1/posts/${postId}`).set(auth(burak.accessToken)).send({ content: 'x' });
    assert.equal(foreign.status, 403);

    const edit = await api().patch(`/api/v1/posts/${postId}`).set(auth(selin.accessToken)).send({ title: '5 yıl 🎉' });
    assert.equal(edit.body.data.title, '5 yıl 🎉');
    assert.ok(edit.body.data.editedAt);

    const own = await api()
      .post('/api/v1/posts')
      .set(auth(burak.accessToken))
      .send({ cancerTypeId: 1, content: 'silinecek' });
    await api().delete(`/api/v1/posts/${own.body.data.id}`).set(auth(burak.accessToken));
    const gone = await api().get(`/api/v1/posts/${own.body.data.id}`).set(auth(selin.accessToken));
    assert.equal(gone.status, 404);
  });

  test('Engellenen kullanıcının gönderileri listede ve detayda görünmez', async () => {
    await api().post(`/api/v1/users/${selin.id}/block`).set(auth(burak.accessToken));

    const list = await api().get('/api/v1/posts?cancerTypeId=1').set(auth(burak.accessToken));
    assert.ok(!list.body.data.some((p) => p.author.id === selin.id));

    const byAuthor = await api().get(`/api/v1/posts?authorId=${selin.id}`).set(auth(burak.accessToken));
    assert.equal(byAuthor.body.data.length, 0);

    const detail = await api().get(`/api/v1/posts/${postId}`).set(auth(burak.accessToken));
    assert.equal(detail.status, 404);

    // Engellenen kişi de engelleyenin gönderisine yorum yapamaz
    const comment = await api().post(`/api/v1/posts/${postId}/comments`).set(auth(burak.accessToken)).send({ content: 'x' });
    assert.equal(comment.status, 404);

    await api().delete(`/api/v1/users/${selin.id}/block`).set(auth(burak.accessToken));
  });

  test('Topluluk özeti: hasta/iyileşen ve gönderi sayıları', async () => {
    const res = await api().get('/api/v1/cancer-types/1').set(auth(selin.accessToken));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.stats.survivors, 1);
    assert.equal(res.body.data.stats.activeTreatment, 1);
    assert.ok(res.body.data.stats.posts >= 4);
  });
});
