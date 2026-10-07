import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, enum: Object.values(ROLES), required: true, index: true },
    phone: { type: String, trim: true, match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number'] },
    email: { type: String, trim: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Invalid email'] },
    passwordHash: { type: String, select: false },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    age: { type: Number, min: 0, max: 120 },
    avatar: String,
    consentAt: Date,
    isActive: { type: Boolean, default: true },
    refreshTokenHash: { type: String, select: false },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

// Unique only when the field exists (patients have phone, others have email)
userSchema.index({ phone: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });

// Note: no "next" parameter. Newer Mongoose does not need it for synchronous hooks.
userSchema.pre('validate', function () {
  if (this.role === ROLES.PATIENT && !this.phone) {
    this.invalidate('phone', 'Phone is required for patients');
  }
  if (this.role !== ROLES.PATIENT && !this.email) {
    this.invalidate('email', 'Email is required');
  }
});

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.comparePassword = function (plain) {
  return this.passwordHash ? bcrypt.compare(plain, this.passwordHash) : false;
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.refreshTokenHash;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);