const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { signToken, authenticate } = require('../middleware/auth');
const { ApiError, requireString, requireEmail, requirePassword, parseInterests } = require('../utils/http');

const router = express.Router();

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });

router.post('/register', limiter, async (req, res) => {
  const user = await User.create({
    name: requireString(req.body.name, 'name', { max: 100 }),
    email: requireEmail(req.body.email),
    password: requirePassword(req.body.password),
    interests: parseInterests(req.body.interests) || [],
  });
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', limiter, async (req, res) => {
  const email = requireEmail(req.body.email);
  const password = requireString(req.body.password, 'password', { max: 128 });

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  res.json({ token: signToken(user), user });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
