const mongoose = require('mongoose');
const config = require('../src/config');
require('../src/models/User');
require('../src/models/Note');
require('../src/models/Post');

async function run() {
  await mongoose.connect(config.mongoUri, { autoIndex: false });
  for (const model of Object.values(mongoose.models)) {
    const dropped = await model.syncIndexes();
    const indexes = await model.collection.indexes();
    console.log(model.collection.name, dropped.length ? `(dropped ${dropped})` : '');
    indexes.forEach((ix) => console.log('  ', ix.name, JSON.stringify(ix.key), ix.unique ? 'unique' : ''));
  }
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
