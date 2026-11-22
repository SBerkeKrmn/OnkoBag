const { Router } = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../utils/validate');
const { idParam, cursorPageQuery, offsetPageQuery } = require('../../utils/schemas');
const { requireAuth, requireVerified } = require('../../middlewares/auth');
const schemas = require('./posts.schemas');
const service = require('./posts.service');

// --- /posts ---------------------------------------------------------------------
const posts = Router();
posts.use(requireAuth);

posts.get(
  '/',
  validate({ query: schemas.listPosts }),
  asyncHandler(async (req, res) => {
    res.json(await service.listPosts(req.user.id, req.query));
  }),
);

posts.get(
  '/feed',
  validate({ query: schemas.feed }),
  asyncHandler(async (req, res) => {
    res.json(await service.feed(req.user.id, req.query));
  }),
);

posts.post(
  '/',
  requireVerified,
  validate({ body: schemas.createPost }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.createPost(req.user, req.body) });
  }),
);

posts.get(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.getPost(req.user.id, req.params.id) });
  }),
);

posts.patch(
  '/:id',
  requireVerified,
  validate({ params: idParam, body: schemas.updatePost }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.updatePost(req.user.id, req.params.id, req.body) });
  }),
);

posts.delete(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.deletePost(req.user.id, req.params.id);
    res.status(204).end();
  }),
);

posts.post(
  '/:id/like',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.likePost(req.user.id, req.params.id) });
  }),
);

posts.delete(
  '/:id/like',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.unlikePost(req.user.id, req.params.id) });
  }),
);

posts.get(
  '/:id/likes',
  validate({ params: idParam, query: offsetPageQuery }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.listLikers(req.user.id, req.params.id, req.query) });
  }),
);

posts.get(
  '/:id/comments',
  validate({ params: idParam, query: cursorPageQuery }),
  asyncHandler(async (req, res) => {
    res.json(await service.listComments(req.user.id, req.params.id, req.query));
  }),
);

posts.post(
  '/:id/comments',
  requireVerified,
  validate({ params: idParam, body: schemas.createComment }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await service.createComment(req.user.id, req.params.id, req.body) });
  }),
);

// --- /comments --------------------------------------------------------------------
const comments = Router();
comments.use(requireAuth);

comments.patch(
  '/:id',
  requireVerified,
  validate({ params: idParam, body: schemas.updateComment }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.updateComment(req.user.id, req.params.id, req.body) });
  }),
);

comments.delete(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await service.deleteComment(req.user.id, req.params.id);
    res.status(204).end();
  }),
);

comments.post(
  '/:id/like',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.likeComment(req.user.id, req.params.id) });
  }),
);

comments.delete(
  '/:id/like',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await service.unlikeComment(req.user.id, req.params.id) });
  }),
);

module.exports = { posts, comments };
