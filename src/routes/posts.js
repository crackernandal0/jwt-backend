const express = require('express');
const Post = require('../models/Post');
const { authenticate } = require('../middleware/auth');
const { ApiError, assertObjectId, requireString, optionalString } = require('../utils/http');

const router = express.Router();
router.use(authenticate);

router.post('/', async (req, res) => {
  const post = await Post.create({
    author: req.user._id,
    title: requireString(req.body.title, 'title', { max: 200 }),
    body: optionalString(req.body.body, 'body') ?? '',
  });
  res.status(201).json(post);
});

router.delete('/:id', async (req, res) => {
  const filter = { _id: assertObjectId(req.params.id) };
  if (req.user.role !== 'admin') filter.author = req.user._id;
  const post = await Post.findOneAndDelete(filter);
  if (!post) throw new ApiError(404, 'Post not found');
  res.status(204).end();
});

module.exports = router;
