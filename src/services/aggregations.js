const User = require('../models/User');
const Post = require('../models/Post');

function interestGroupsPipeline({ interest, skip, limit, includeEmail }) {
  const userFields = { _id: '$_id', name: '$name' };
  if (includeEmail) userFields.email = '$email';

  const pipeline = [
    { $match: interest ? { interests: interest } : { interests: { $gte: '' } } },
    { $project: { name: 1, email: 1, interests: 1 } },
    { $unwind: '$interests' },
  ];
  if (interest) pipeline.push({ $match: { interests: interest } });

  pipeline.push(
    { $group: { _id: '$interests', count: { $sum: 1 }, users: { $push: userFields } } },
    { $sort: { count: -1, _id: 1 } },
    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skip }, { $limit: limit }, { $project: { _id: 0, interest: '$_id', count: 1, users: 1 } }],
      },
    }
  );
  return pipeline;
}

async function getUsersGroupedByInterest(opts) {
  const [result] = await User.aggregate(interestGroupsPipeline(opts)).allowDiskUse(true);
  return { data: result.data, total: result.metadata[0]?.total ?? 0 };
}

function userPostsPipeline({ userId, skip, limit }) {
  const from = Post.collection.name;
  return [
    { $match: { _id: userId } },
    { $project: { name: 1 } },
    {
      $lookup: {
        from,
        localField: '_id',
        foreignField: 'author',
        pipeline: [{ $sort: { _id: -1 } }, { $skip: skip }, { $limit: limit }, { $project: { author: 0 } }],
        as: 'posts',
      },
    },
    { $lookup: { from, localField: '_id', foreignField: 'author', pipeline: [{ $count: 'n' }], as: 'postCount' } },
    {
      $project: {
        author: { _id: '$_id', name: '$name' },
        posts: 1,
        total: { $ifNull: [{ $arrayElemAt: ['$postCount.n', 0] }, 0] },
      },
    },
  ];
}

async function getPostsOfUser(opts) {
  const [result] = await User.aggregate(userPostsPipeline(opts));
  return result || null;
}

module.exports = { interestGroupsPipeline, getUsersGroupedByInterest, userPostsPipeline, getPostsOfUser };
