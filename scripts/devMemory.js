const { MongoMemoryServer } = require('mongodb-memory-server');
const { execFileSync } = require('child_process');
const path = require('path');

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri('secure-notes');
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
  process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
  process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin12345!';

  execFileSync(process.execPath, [path.join(__dirname, 'seed.js'), '--demo'], { stdio: 'inherit', env: process.env });
  console.log('admin login:', process.env.ADMIN_EMAIL, '/', process.env.ADMIN_PASSWORD);

  require('../src/server');
})();
