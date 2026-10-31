const express = require('express');
const User = require('../models/User');
const Note = require('../models/Note');
const Post = require('../models/Post');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  ApiError,
  getPagination,
  paginated,
  assertObjectId,
  requireString,
  requireEmail,
  requirePassword,
  parseInterests,
} = require('../utils/http');

const router = express.Router();
router.use(authenticate, requireRole('admin'));

function parseRole(role) {
  if (!User.ROLES.includes(role)) throw new ApiError(400, 'role must be user or admin');
  return role;
}

router.get('/users', async (req, res) => {
  const pg = getPagination(req.query);
  const [users, total] = await Promise.all([
    User.find().sort({ _id: -1 }).skip(pg.skip).limit(pg.limit).lean(),
    User.estimatedDocumentCount(),
  ]);
  res.json(paginated(users, total, pg));
});

router.get('/users/:id', async (req, res) => {
  const user = await User.findById(assertObjectId(req.params.id)).lean();
  if (!user) throw new ApiError(404, 'User not found');
  res.json(user);
});

router.post('/users', async (req, res) => {
  const user = await User.create({
    name: requireString(req.body.name, 'name', { max: 100 }),
    email: requireEmail(req.body.email),
    password: requirePassword(req.body.password),
    role: req.body.role === undefined ? 'user' : parseRole(req.body.role),
    interests: parseInterests(req.body.interests) || [],
  });
  res.status(201).json(user);
});

router.patch('/users/:id', async (req, res) => {
  const user = await User.findById(assertObjectId(req.params.id));
  if (!user) throw new ApiError(404, 'User not found');

  const { name, email, password, role, interests } = req.body;
  if (role !== undefined && role !== 'admin' && user._id.equals(req.user._id)) {
    throw new ApiError(400, 'You cannot remove your own admin role');
  }
  if (name !== undefined) user.name = requireString(name, 'name', { max: 100 });
  if (email !== undefined) user.email = requireEmail(email);
  if (password !== undefined) user.password = requirePassword(password);
  if (role !== undefined) user.role = parseRole(role);
  if (interests !== undefined) user.interests = parseInterests(interests);

  await user.save();
  res.json(user);
});

router.delete('/users/:id', async (req, res) => {
  const id = assertObjectId(req.params.id);
  if (id.equals(req.user._id)) throw new ApiError(400, 'You cannot delete your own account');

  const user = await User.findByIdAndDelete(id);
  if (!user) throw new ApiError(404, 'User not found');
  await Promise.all([Note.deleteMany({ owner: id }), Post.deleteMany({ author: id })]);
  res.status(204).end();
});

router.get('/notes', async (req, res) => {
  const pg = getPagination(req.query);
  const filter = req.query.owner ? { owner: assertObjectId(req.query.owner, 'owner') } : {};
  const [notes, total] = await Promise.all([
    Note.find(filter).sort({ _id: -1 }).skip(pg.skip).limit(pg.limit).populate('owner', 'name email').lean(),
    req.query.owner ? Note.countDocuments(filter) : Note.estimatedDocumentCount(),
  ]);
  res.json(paginated(notes, total, pg));
});

module.exports = router;
