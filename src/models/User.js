const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['user', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'user' },
    interests: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 50 }],
      default: [],
    },
  },
  { timestamps: true, versionKey: false }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ interests: 1 });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
