const mongoose = require('mongoose');
const config = require('../src/config');
const User = require('../src/models/User');
const Note = require('../src/models/Note');
const Post = require('../src/models/Post');

const demoUsers = [
  { name: 'Alice', email: 'alice@example.com', interests: ['chess', 'reading', 'hiking'] },
  { name: 'Bob', email: 'bob@example.com', interests: ['chess', 'music'] },
  { name: 'Carol', email: 'carol@example.com', interests: ['reading', 'music', 'cooking'] },
  { name: 'Dave', email: 'dave@example.com', interests: [] },
];

async function run() {
  await mongoose.connect(config.mongoUri, { autoIndex: false });
  await Promise.all(Object.values(mongoose.models).map((m) => m.createIndexes()));

  const { ADMIN_NAME = 'Admin', ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('ADMIN_EMAIL / ADMIN_PASSWORD missing in .env');

  if (await User.findOne({ email: ADMIN_EMAIL.toLowerCase() })) {
    console.log('admin already exists');
  } else {
    await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin' });
    console.log('admin created:', ADMIN_EMAIL);
  }

  if (process.argv.includes('--demo')) {
    for (const u of demoUsers) {
      if (await User.findOne({ email: u.email })) continue;
      const user = await User.create({ ...u, password: 'Password123!' });
      await Note.insertMany([1, 2, 3].map((i) => ({ owner: user._id, title: `${u.name} note ${i}`, content: 'test note' })));
      await Post.insertMany([1, 2].map((i) => ({ author: user._id, title: `${u.name} post ${i}`, body: 'test post' })));
      console.log('demo user:', u.email, '/ Password123!');
    }
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
