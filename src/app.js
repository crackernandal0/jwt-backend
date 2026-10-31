const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const config = require('./config');
const { ApiError } = require('./utils/http');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: config.corsOrigin.includes('*') ? '*' : config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));

app.get('/', (req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'up' : 'down' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));

app.use((req, res, next) => next(new ApiError(404, 'Route not found')));

app.use((err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message;

  if (err.code === 11000) {
    status = 409;
    message = 'Email is already registered';
  } else if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    status = 400;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Invalid JSON';
  }

  if (status >= 500) {
    console.error(err);
    message = 'Internal server error';
  }
  res.status(status).json({ error: message });
});

module.exports = app;
