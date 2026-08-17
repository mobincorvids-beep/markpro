/**
 * Core user identity ONLY.
 *
 * Section B.1 fix: this model previously carried ~90 fields belonging to ~15
 * different modules (WhatsApp tokens, SMM wallet, BioLinks/Rank API keys, AI
 * credit counters, two duplicate password-reset token fields, ...). Every one
 * of those now lives in its owning module's profile document - see
 * models/profiles/index.js and scripts/migrate-user-profiles.js.
 *
 * TRANSITIONAL: `strict: false` is intentional and temporary. Modules that
 * have not yet been through the per-module migration loop still read legacy
 * fields off existing user documents; leaving strict off keeps them working
 * while they are migrated one at a time. Flip it to `true` (the Mongoose
 * default) once the last module has moved to its Profile model.
 */
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, trim: true, maxlength: 100, default: '' },
  username: { type: String, unique: true, sparse: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role:     { type: String, enum: ['user', 'admin', 'staff'], default: 'user' },
  avatar:   String,

  isActive:        { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },

  // Stored as `plan` so populate('plan') resolves; `planId` is a schema alias
  // so the newer controllers that write user.planId keep working unchanged.
  plan:                 { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', default: null, alias: 'planId' },
  planExpiresAt:        Date,
  stripeCustomerId:     String,
  stripeSubscriptionId: String,
  subscriptionStatus:   { type: String, enum: ['active','canceled','past_due','trialing','inactive'], default: 'inactive' },

  // Auth tokens - single reset-token pair (the duplicate `resetPasswordToken`
  // that existed "for PixaURL compat" is gone; auth.controller.js writes one field).
  emailVerificationToken:   String,
  emailVerificationExpires: Date,
  passwordResetToken:       String,
  passwordResetExpires:     Date,
  refreshToken:             { type: String, select: false },

  preferences: {
    timezone:      { type: String, default: 'UTC' },
    language:      { type: String, default: 'en' },
    defaultAiTone: { type: String, default: 'professional' },
  },

  lastLoginAt: Date,
}, { timestamps: true, strict: false });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre('save', function (next) {
  if (!this.name && this.username) this.name = this.username;
  if (!this.username && this.email) this.username = this.email.split('@')[0] + '_' + Date.now().toString(36);
  next();
});

userSchema.methods.comparePassword = function (p) { return bcrypt.compare(p, this.password); };
userSchema.methods.matchPassword   = userSchema.methods.comparePassword;

userSchema.set('toJSON',   { virtuals: true, transform: (_d, r) => { delete r.password; delete r.refreshToken; return r; } });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
