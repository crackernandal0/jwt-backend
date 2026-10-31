const mongoose = require('mongoose');
const User = require('../src/models/User');
const Note = require('../src/models/Note');
const Post = require('../src/models/Post');
const { interestGroupsPipeline, userPostsPipeline } = require('../src/services/aggregations');

function summarize(explain) {
  const out = { indexes: new Set(), collscan: false, sort: false };
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (['IXSCAN', 'COUNT_SCAN', 'DISTINCT_SCAN'].includes(node.stage)) out.indexes.add(node.indexName);
    if (['EXPRESS_IXSCAN', 'IDHACK'].includes(node.stage)) out.indexes.add(node.indexName || '_id_');
    if (node.stage === 'COLLSCAN') out.collscan = true;
    if (node.stage === 'SORT') out.sort = true;
    if (node.indexesUsed) node.indexesUsed.forEach((i) => out.indexes.add(i));
    for (const key in node) if (key !== 'rejectedPlans') walk(node[key]);
  };
  walk(explain);
  return out;
}

async function runExplain() {
  const user = (await User.findOne({ 'interests.0': { $exists: true } }).lean()) || (await User.findOne().lean());
  if (!user) throw new Error('no users, run the seed first');
  const note = (await Note.findOne().lean()) || { _id: new mongoose.Types.ObjectId() };
  const uid = user._id;
  const pg = { skip: 0, limit: 10 };
  const ex = 'executionStats';

  const queries = {
    'login (email)': User.find({ email: user.email }).explain(ex),
    'user by id': User.find({ _id: uid }).explain(ex),
    'admin list users': User.find().sort({ _id: -1 }).limit(10).explain(ex),
    'my notes': Note.find({ owner: uid }).sort({ _id: -1 }).limit(10).explain(ex),
    'my notes count': Note.aggregate([{ $match: { owner: uid } }, { $group: { _id: 1, n: { $sum: 1 } } }]).explain(ex),
    'note by id': Note.find({ _id: note._id, owner: uid }).explain(ex),
    'admin all notes': Note.find().sort({ _id: -1 }).limit(10).explain(ex),
    'admin notes by owner': Note.find({ owner: uid }).sort({ _id: -1 }).limit(10).explain(ex),
    'delete user -> notes': Note.find({ owner: uid }).explain(ex),
    'delete user -> posts': Post.find({ author: uid }).explain(ex),
    'post by id': Post.find({ _id: uid, author: uid }).explain(ex),
    'agg: group by interests': User.aggregate(interestGroupsPipeline(pg)).explain(ex),
    'agg: one interest': User.aggregate(interestGroupsPipeline({ ...pg, interest: user.interests[0] || 'chess' })).explain(ex),
    'agg: user posts ($lookup)': User.aggregate(userPostsPipeline({ userId: uid, ...pg })).explain(ex),
  };

  const rows = [];
  for (const [query, p] of Object.entries(queries)) {
    const s = summarize(await p);
    rows.push({ query, indexes: [...s.indexes].join(', ') || '-', collscan: s.collscan, sort: s.sort });
  }
  return rows;
}

module.exports = { runExplain };

if (require.main === module) {
  const config = require('../src/config');
  mongoose
    .connect(config.mongoUri, { autoIndex: false })
    .then(runExplain)
    .then((rows) => console.table(rows))
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
