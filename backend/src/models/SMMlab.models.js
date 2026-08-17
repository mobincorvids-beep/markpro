const mongoose = require('mongoose');

// ── Deposit ───────────────────────────────────────────────────────────────
const depositSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:    { type: Number, required: true },
  gateway:   { type: String, enum: ['paypal','stripe','manual','bank'], default: 'paypal' },
  status:    { type: String, enum: ['pending','approved','rejected'], default: 'pending' },
  reference: String,  // payment provider transaction id
  note:      String,  // admin note
  paypalOrderId:   String,
  paypalPayerId:   String,
  stripeSessionId: String,
  approvedAt: Date,
  rejectedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
depositSchema.index({ user: 1, status: 1 });
depositSchema.index({ createdAt: -1 });
const Deposit = mongoose.model('Deposit', depositSchema);

// ── Cron Job Log ──────────────────────────────────────────────────────────
const cronLogSchema = new mongoose.Schema({
  jobName:   { type: String, required: true },
  status:    { type: String, enum: ['success','error','skipped'], default: 'success' },
  message:   String,
  details:   { type: mongoose.Schema.Types.Mixed, default: {} },
  duration:  Number,  // ms
  ranAt:     { type: Date, default: Date.now },
}, { timestamps: false });
cronLogSchema.index({ jobName: 1, ranAt: -1 });
const CronLog = mongoose.model('CronLog', cronLogSchema);

// ── Service Favorite ──────────────────────────────────────────────────────
const serviceFavoriteSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'SMM_Service', required: true },
}, { timestamps: true });
serviceFavoriteSchema.index({ user: 1, service: 1 }, { unique: true });
const ServiceFavorite = mongoose.model('ServiceFavorite', serviceFavoriteSchema);

// ── Provider Sync Log ─────────────────────────────────────────────────────
const providerSyncSchema = new mongoose.Schema({
  provider:     { type: mongoose.Schema.Types.ObjectId, ref: 'SMM_Supporting' },
  syncType:     { type: String, enum: ['services','balance','order_status'], default: 'services' },
  status:       { type: String, enum: ['success','error'], default: 'success' },
  servicesAdded:   { type: Number, default: 0 },
  servicesUpdated: { type: Number, default: 0 },
  message:      String,
  ranAt:        { type: Date, default: Date.now },
}, { timestamps: false });
providerSyncSchema.index({ provider: 1, ranAt: -1 });
const ProviderSyncLog = mongoose.model('ProviderSyncLog', providerSyncSchema);

module.exports = { Deposit, CronLog, ServiceFavorite, ProviderSyncLog };
