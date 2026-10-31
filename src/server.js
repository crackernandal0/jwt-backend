const mongoose = require('mongoose');
const config = require('./config');
const app = require('./app');

async function start() {
  await mongoose.connect(config.mongoUri, { autoIndex: false });
  await Promise.all(Object.values(mongoose.models).map((m) => m.createIndexes()));
  console.log('MongoDB connected');

  app.listen(config.port, () => console.log(`Server running on port ${config.port}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
