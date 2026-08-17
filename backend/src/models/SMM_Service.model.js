const mongoose = require('mongoose');

// ── Category ──────────────────────────────────────────────────
const categorySchema = new mongoose.Schema({
  ids:      { type: String },
  name:     { type: String, required: true },
  icon:     { type: String, default: '' },
  sort:     { type: Number, default: 0 },
  status:   { type: Number, default: 1 },
  createdAt:{ type: Date, default: Date.now },
});
const Category = mongoose.models.SMMCategory || mongoose.model('SMMCategory', categorySchema);

// ── Service ───────────────────────────────────────────────────
const serviceSchema = new mongoose.Schema({
  ids:            { type: String },
  categoryId:     { type: mongoose.Schema.Types.ObjectId, ref: 'SMMCategory', required: true },
  name:           { type: String, required: true },
  // type mirrors the original: default | custom_comments | mentions_custom_list |
  //   mentions_with_hashtags | mentions_hashtag | comment_likes |
  //   mentions_user_followers | mentions_media_likers | package |
  //   custom_comments_package | subscriptions
  type:           { type: String, default: 'default' },
  price:          { type: Number, required: true },        // per 1000
  originalPrice:  { type: Number, default: 0 },
  min:            { type: Number, default: 10 },
  max:            { type: Number, default: 10000 },
  description:    { type: String, default: '' },
  addType:        { type: String, enum: ['manual','api'], default: 'manual' },
  // API provider fields
  apiProviderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null },
  apiServiceId:   { type: String, default: '' },
  // Feature flags
  dripfeed:       { type: Boolean, default: false },
  refill:         { type: Boolean, default: false },
  cancel:         { type: Boolean, default: false },
  denyDuplicates: { type: Boolean, default: false },
  // Avg completion time (minutes)
  avgTime:        { type: Number, default: 0 },
  status:         { type: Number, default: 1 },
  sort:           { type: Number, default: 0 },
  createdAt:      { type: Date, default: Date.now },
  updatedAt:      { type: Date, default: Date.now },
});
const Service = mongoose.model('Service', serviceSchema);

module.exports = { Category, Service };
