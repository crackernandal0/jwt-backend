const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, default: '', maxlength: 10000 },
  },
  { timestamps: true, versionKey: false }
);

noteSchema.index({ owner: 1, _id: -1 });

module.exports = mongoose.model('Note', noteSchema);
