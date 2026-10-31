const mongoose = require('mongoose');

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function getPagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  return { page, limit, skip: (page - 1) * limit };
}

function paginated(data, total, { page, limit }) {
  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}

function assertObjectId(id, label = 'id') {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, `Invalid ${label}`);
  return new mongoose.Types.ObjectId(String(id));
}

function requireString(value, field, { min = 1, max = 10000 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) {
    throw new ApiError(400, `${field} must be ${min}-${max} characters`);
  }
  return value.trim();
}

function optionalString(value, field, opts) {
  if (value === undefined) return undefined;
  return requireString(value, field, { min: 0, ...opts });
}

function requireEmail(value) {
  const email = requireString(value, 'email', { max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'email is invalid');
  return email;
}

function requirePassword(value) {
  return requireString(value, 'password', { min: 8, max: 128 });
}

function parseInterests(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 20) {
    throw new ApiError(400, 'interests must be an array (max 20)');
  }
  const list = value.map((i) => requireString(i, 'interest', { max: 50 }).toLowerCase());
  return [...new Set(list)];
}

module.exports = {
  ApiError,
  getPagination,
  paginated,
  assertObjectId,
  requireString,
  optionalString,
  requireEmail,
  requirePassword,
  parseInterests,
};
