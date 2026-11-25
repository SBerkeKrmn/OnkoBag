// Topluluk gönderileri, yorumlar ve beğeniler.
// - Gönderiler bir kanser türü topluluğuna aittir; kullanıcı yalnızca profilinde
//   bulunan kanser türlerinde gönderi paylaşabilir (moderatörler hariç)
// - Beğeni/yorum sayaçları denormalize tutulur ve transaction içinde güncellenir
// - Engellenen kullanıcıların gönderi ve yorumları gösterilmez
const prisma = require('../../lib/prisma');
const ApiError = require('../../utils/ApiError');
const { getBlockedUserIds, isBlockedBetween } = require('../../lib/blocks');
const { publicUserSelect, formatPublicUser, mediaSelect, cancerTypeSelect } = require('../../lib/selects');
const { toCursorPage, cursorArgs } = require('../../utils/pagination');
const { attachMedia, purgeMedia } = require('../media/media.service');
const { signMedia } = require('../../lib/mediaUrls');
const notifications = require('../notifications/notifications.service');

const postInclude = (viewerId) => ({
  author: { select: publicUserSelect },
  cancerType: { select: cancerTypeSelect },
  media: { select: mediaSelect, orderBy: { sortOrder: 'asc' } },
  likes: { where: { userId: viewerId }, select: { userId: true }, take: 1 },
});

function formatPost(p, viewerId) {
  return {
    id: p.id,
    author: formatPublicUser(p.author),
    cancerType: p.cancerType,
    category: p.category,
    title: p.title,
    content: p.content,
    media: p.media.map(signMedia),
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    likedByMe: p.likes.length > 0,
    isMine: p.authorId === viewerId,
    editedAt: p.editedAt,
    createdAt: p.createdAt,
  };
}

const orderNewestFirst = [{ createdAt: 'desc' }, { id: 'desc' }];

async function listPosts(viewerId, { cancerTypeId, category, authorId, cursor, limit }) {
  const blocked = await getBlockedUserIds(viewerId);
  const rows = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      authorId: authorId ? (blocked.includes(authorId) ? '00000000-0000-0000-0000-000000000000' : authorId) : { notIn: blocked },
      ...(cancerTypeId ? { cancerTypeId } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: orderNewestFirst,
    include: postInclude(viewerId),
    ...cursorArgs(cursor, limit),
  });
  const page = toCursorPage(rows, limit);
  return { ...page, data: page.data.map((p) => formatPost(p, viewerId)) };
}

/** Kişisel akış: kullanıcının kanser türlerindeki gönderiler + takip ettiklerinin gönderileri */
async function feed(viewerId, { cursor, limit }) {
  const [blocked, profiles, following] = await Promise.all([
    getBlockedUserIds(viewerId),
    prisma.userCancerProfile.findMany({ where: { userId: viewerId }, select: { cancerTypeId: true } }),
    prisma.follow.findMany({ where: { followerId: viewerId }, select: { followingId: true } }),
  ]);

  const rows = await prisma.post.findMany({
    where: {
      status: 'PUBLISHED',
      authorId: { notIn: blocked },
      OR: [
        { cancerTypeId: { in: profiles.map((p) => p.cancerTypeId) } },
        { authorId: { in: following.map((f) => f.followingId) } },
        { authorId: viewerId },
      ],
    },
    orderBy: orderNewestFirst,
    include: postInclude(viewerId),
    ...cursorArgs(cursor, limit),
  });
  const page = toCursorPage(rows, limit);
  return { ...page, data: page.data.map((p) => formatPost(p, viewerId)) };
}

/** Gönderiyi getirir; yayında değilse veya engel varsa 404 */
async function findVisiblePost(viewerId, postId) {
  const post = await prisma.post.findUnique({ where: { id: postId }, include: postInclude(viewerId) });
  if (!post || post.status !== 'PUBLISHED') throw ApiError.notFound('Gönderi bulunamadı');
  if (post.authorId !== viewerId && (await isBlockedBetween(viewerId, post.authorId))) {
    throw ApiError.notFound('Gönderi bulunamadı');
  }
  return post;
}

async function getPost(viewerId, postId) {
  return formatPost(await findVisiblePost(viewerId, postId), viewerId);
}

async function createPost(user, { mediaIds, ...data }) {
  const cancerType = await prisma.cancerType.findFirst({ where: { id: data.cancerTypeId, isActive: true } });
  if (!cancerType) throw ApiError.badRequest('Geçersiz kanser türü', { code: 'INVALID_CANCER_TYPE' });

  const isStaff = user.role === 'MODERATOR' || user.role === 'ADMIN';
  if (!isStaff) {
    const member = await prisma.userCancerProfile.count({ where: { userId: user.id, cancerTypeId: data.cancerTypeId } });
    if (!member) {
      throw ApiError.forbidden('Yalnızca profilinizdeki kanser türlerinin topluluklarında paylaşım yapabilirsiniz', {
        code: 'NOT_COMMUNITY_MEMBER',
      });
    }
  }

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({ data: { ...data, authorId: user.id } });
    await attachMedia(tx, user.id, mediaIds, { postId: created.id });
    return tx.post.findUnique({ where: { id: created.id }, include: postInclude(user.id) });
  });
  return formatPost(post, user.id);
}

async function getOwnPost(userId, postId) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.status === 'DELETED') throw ApiError.notFound('Gönderi bulunamadı');
  if (post.authorId !== userId) throw ApiError.forbidden('Yalnızca kendi gönderinizi değiştirebilirsiniz');
  return post;
}

async function updatePost(userId, postId, data) {
  await getOwnPost(userId, postId);
  const post = await prisma.post.update({
    where: { id: postId },
    data: { ...data, editedAt: new Date() },
    include: postInclude(userId),
  });
  return formatPost(post, userId);
}

async function deletePost(userId, postId) {
  await getOwnPost(userId, postId);
  // Metin ve görseller veritabanından da silinir (yalnızca gizlenmez)
  await prisma.$transaction(async (tx) => {
    await purgeMedia(tx, { postId });
    await tx.post.update({ where: { id: postId }, data: { status: 'DELETED', content: '', title: null } });
  });
}

// --- Beğeniler ---------------------------------------------------------------------

async function likePost(userId, postId) {
  const post = await findVisiblePost(userId, postId);
  const created = await prisma.$transaction(async (tx) => {
    const { count } = await tx.postLike.createMany({ data: [{ postId, userId }], skipDuplicates: true });
    if (count > 0) await tx.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });
    return count > 0;
  });
  if (created) {
    await notifications.notify({ userId: post.authorId, actorId: userId, type: 'POST_LIKED', entityId: postId });
  }
  return { likeCount: post.likeCount + (created ? 1 : 0), likedByMe: true };
}

async function unlikePost(userId, postId) {
  const post = await findVisiblePost(userId, postId);
  const removed = await prisma.$transaction(async (tx) => {
    const { count } = await tx.postLike.deleteMany({ where: { postId, userId } });
    if (count > 0) await tx.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } });
    return count > 0;
  });
  return { likeCount: post.likeCount - (removed ? 1 : 0), likedByMe: false };
}

async function listLikers(viewerId, postId, { offset, limit }) {
  await findVisiblePost(viewerId, postId);
  const blocked = await getBlockedUserIds(viewerId);
  const rows = await prisma.postLike.findMany({
    where: { postId, userId: { notIn: blocked }, user: { status: 'ACTIVE' } },
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    select: { user: { select: publicUserSelect } },
  });
  return rows.map((r) => formatPublicUser(r.user));
}

// --- Yorumlar ------------------------------------------------------------------------

const commentInclude = (viewerId, blocked) => ({
  author: { select: publicUserSelect },
  likes: { where: { userId: viewerId }, select: { userId: true }, take: 1 },
  replies: {
    where: { status: { not: 'DELETED' }, authorId: { notIn: blocked } },
    orderBy: { createdAt: 'asc' },
    include: {
      author: { select: publicUserSelect },
      likes: { where: { userId: viewerId }, select: { userId: true }, take: 1 },
    },
  },
});

function formatComment(c, viewerId) {
  const visible = c.status === 'PUBLISHED';
  return {
    id: c.id,
    postId: c.postId,
    parentId: c.parentId,
    author: visible ? formatPublicUser(c.author) : null,
    content: visible ? c.content : null,
    status: c.status,
    likeCount: c.likeCount,
    likedByMe: c.likes.length > 0,
    isMine: c.authorId === viewerId,
    editedAt: c.editedAt,
    createdAt: c.createdAt,
    ...(c.replies ? { replies: c.replies.map((r) => formatComment(r, viewerId)) } : {}),
  };
}

async function listComments(viewerId, postId, { cursor, limit }) {
  await findVisiblePost(viewerId, postId);
  const blocked = await getBlockedUserIds(viewerId);

  const rows = await prisma.comment.findMany({
    where: {
      postId,
      parentId: null,
      authorId: { notIn: blocked },
      // Silinmiş üst yorum yanıtı varsa "silindi" olarak gösterilir, yoksa hiç gösterilmez
      OR: [{ status: { not: 'DELETED' } }, { replies: { some: { status: 'PUBLISHED' } } }],
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: commentInclude(viewerId, blocked),
    ...cursorArgs(cursor, limit),
  });
  const page = toCursorPage(rows, limit);
  return { ...page, data: page.data.map((c) => formatComment(c, viewerId)) };
}

async function createComment(userId, postId, { content, parentId }) {
  const post = await findVisiblePost(userId, postId);

  let parent = null;
  if (parentId) {
    parent = await prisma.comment.findFirst({ where: { id: parentId, postId, status: 'PUBLISHED' } });
    if (!parent) throw ApiError.badRequest('Yanıtlanan yorum bulunamadı');
    if (await isBlockedBetween(userId, parent.authorId)) throw ApiError.badRequest('Yanıtlanan yorum bulunamadı');
  }

  // Tek seviye yanıt: yanıta yanıt verilirse en üstteki yoruma bağlanır
  const rootParentId = parent ? (parent.parentId ?? parent.id) : null;

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { postId, authorId: userId, content, parentId: rootParentId },
      include: commentInclude(userId, []),
    });
    await tx.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
    return created;
  });

  await notifications.notify({ userId: post.authorId, actorId: userId, type: 'POST_COMMENTED', entityId: postId });
  if (parent && parent.authorId !== post.authorId) {
    await notifications.notify({ userId: parent.authorId, actorId: userId, type: 'COMMENT_REPLIED', entityId: postId });
  }

  return formatComment({ ...comment, replies: undefined }, userId);
}

async function getOwnComment(userId, commentId) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.status === 'DELETED') throw ApiError.notFound('Yorum bulunamadı');
  if (comment.authorId !== userId) throw ApiError.forbidden('Yalnızca kendi yorumunuzu değiştirebilirsiniz');
  return comment;
}

async function updateComment(userId, commentId, { content }) {
  await getOwnComment(userId, commentId);
  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { content, editedAt: new Date() },
    include: commentInclude(userId, []),
  });
  return formatComment({ ...updated, replies: undefined }, userId);
}

async function deleteComment(userId, commentId) {
  const comment = await getOwnComment(userId, commentId);
  await prisma.$transaction([
    prisma.comment.update({ where: { id: commentId }, data: { status: 'DELETED', content: '' } }),
    prisma.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } }),
  ]);
}

async function findVisibleComment(viewerId, commentId) {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment || comment.status !== 'PUBLISHED') throw ApiError.notFound('Yorum bulunamadı');
  await findVisiblePost(viewerId, comment.postId);
  if (comment.authorId !== viewerId && (await isBlockedBetween(viewerId, comment.authorId))) {
    throw ApiError.notFound('Yorum bulunamadı');
  }
  return comment;
}

async function likeComment(userId, commentId) {
  const comment = await findVisibleComment(userId, commentId);
  const created = await prisma.$transaction(async (tx) => {
    const { count } = await tx.commentLike.createMany({ data: [{ commentId, userId }], skipDuplicates: true });
    if (count > 0) await tx.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } });
    return count > 0;
  });
  if (created) {
    await notifications.notify({ userId: comment.authorId, actorId: userId, type: 'COMMENT_LIKED', entityId: comment.postId });
  }
  return { likeCount: comment.likeCount + (created ? 1 : 0), likedByMe: true };
}

async function unlikeComment(userId, commentId) {
  const comment = await findVisibleComment(userId, commentId);
  const removed = await prisma.$transaction(async (tx) => {
    const { count } = await tx.commentLike.deleteMany({ where: { commentId, userId } });
    if (count > 0) await tx.comment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } });
    return count > 0;
  });
  return { likeCount: comment.likeCount - (removed ? 1 : 0), likedByMe: false };
}

module.exports = {
  formatPost,
  listPosts,
  feed,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  listLikers,
  listComments,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
};
