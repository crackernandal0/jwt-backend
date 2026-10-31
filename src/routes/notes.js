const express = require('express');
const Note = require('../models/Note');
const { authenticate } = require('../middleware/auth');
const { ApiError, getPagination, paginated, assertObjectId, requireString, optionalString } = require('../utils/http');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const pg = getPagination(req.query);
  const filter = { owner: req.user._id };
  const [notes, total] = await Promise.all([
    Note.find(filter).sort({ _id: -1 }).skip(pg.skip).limit(pg.limit).lean(),
    Note.countDocuments(filter),
  ]);
  res.json(paginated(notes, total, pg));
});

router.post('/', async (req, res) => {
  const note = await Note.create({
    owner: req.user._id,
    title: requireString(req.body.title, 'title', { max: 200 }),
    content: optionalString(req.body.content, 'content') ?? '',
  });
  res.status(201).json(note);
});

router.get('/:id', async (req, res) => {
  const filter = { _id: assertObjectId(req.params.id) };
  if (req.user.role !== 'admin') filter.owner = req.user._id;
  const note = await Note.findOne(filter).lean();
  if (!note) throw new ApiError(404, 'Note not found');
  res.json(note);
});

router.patch('/:id', async (req, res) => {
  const update = {};
  if (req.body.title !== undefined) update.title = requireString(req.body.title, 'title', { max: 200 });
  if (req.body.content !== undefined) update.content = optionalString(req.body.content, 'content');
  if (!Object.keys(update).length) throw new ApiError(400, 'Nothing to update');

  const note = await Note.findOneAndUpdate(
    { _id: assertObjectId(req.params.id), owner: req.user._id },
    { $set: update },
    { new: true, runValidators: true }
  ).lean();
  if (!note) throw new ApiError(404, 'Note not found');
  res.json(note);
});

router.delete('/:id', async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: assertObjectId(req.params.id), owner: req.user._id });
  if (!note) throw new ApiError(404, 'Note not found');
  res.status(204).end();
});

module.exports = router;
