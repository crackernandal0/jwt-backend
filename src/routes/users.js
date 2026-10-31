const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getUsersGroupedByInterest, getPostsOfUser } = require('../services/aggregations');
const {
  ApiError,
  getPagination,
  paginated,
  assertObjectId,
  requireString,
  requirePassword,
  parseInterests,
} = require('../utils/http');

const router = express.Router();

router.get('/:id/posts', async (req, res) => {
  const pg = getPagination(req.query);
  const result = await getPostsOfUser({ userId: assertObjectId(req.params.id, 'user id'), ...pg });
  if (!result) throw new ApiError(404, 'User not found');
  res.json({ author: result.author, ...paginated(result.posts, result.total, pg) });
});

router.use(authenticate);

router.patch('/me', async (req, res) => {
  const user = req.user;
  const { name, interests, password } = req.body;
  if (name !== undefined) user.name = requireString(name, 'name', { max: 100 });
  if (interests !== undefined) user.interests = parseInterests(interests);
  if (password !== undefined) user.password = requirePassword(password);
  await user.save();
  res.json({ user });
});

router.get('/interests', async (req, res) => {
  const pg = getPagination(req.query);
  const interest = req.query.interest ? String(req.query.interest).trim().toLowerCase() : undefined;
  const { data, total } = await getUsersGroupedByInterest({
    interest,
    ...pg,
    includeEmail: req.user.role === 'admin',
  });
  res.json(paginated(data, total, pg));
});

module.exports = router;
