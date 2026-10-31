const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const { ApiError } = require('../utils/http');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

async function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'User no longer exists');

  req.user = user;
  next();
}

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) throw new ApiError(403, 'Forbidden');
  next();
};

module.exports = { signToken, authenticate, requireRole };
