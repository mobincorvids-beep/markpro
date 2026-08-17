const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'awaiting','pending','active','inprogress','processing',
  'completed','partial','canceled','refunded','error',
  'fail','expired','paused','rejected','approved'
];

const orderSchema = new mongoose.Schema({
  ids:            { type: String },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoryId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  serviceId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  serviceType:    { type: String, default: 'default' },
  // mode: 0=manual, 1=api
  mode:           { type: Number, default: 0 },
  link:           { type: String, default: '' },
  quantity:       { type: Number, default: 0 },
  startCount:     { type: Number, default: 0 },
  remains:        { type: Number, default: 0 },
  charge:         { type: Number, required: true },
  formalCharge:   { type: Number, default: 0 },
  profit:         { type: Number, default: 0 },
  status:         { type: String, enum: ORDER_STATUSES, default: 'awaiting' },
  // API provider
  apiProviderId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null },
  apiServiceId:   { type: String, default: '' },
  apiOrderId:     { type: String, default: '' },
  // Drip-feed
  isDripFeed:     { type: Boolean, default: false },
  runs:           { type: Number, default: 0 },
  interval:       { type: Number, default: 0 },          // minutes
  dripfeedQty:    { type: Number, default: 0 },
  // Subscriptions
  username:       { type: String, default: '' },
  subPosts:       { type: Number, default: 0 },
  subMin:         { type: Number, default: 0 },
  subMax:         { type: Number, default: 0 },
  subDelay:       { type: Number, default: 0 },
  subExpiry:      { type: String, default: '' },
  subStatus:      { type: String, default: '' },
  // Extra fields for special service types
  comments:       { type: String, default: '' },
  hashtag:        { type: String, default: '' },
  hashtags:       { type: String, default: '' },
  usernames:      { type: String, default: '' },
  media:          { type: String, default: '' },
  // Flags
  refill:         { type: Number, default: 0 },
  cancel:         { type: Number, default: 0 },
  // Source: default | mass | dripfeed | subscriptions
  orderSourceType:{ type: String, default: 'default' },
  notes:          { type: String, default: '' },
  createdAt:      { type: Date, default: Date.now },
  updatedAt:      { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);
