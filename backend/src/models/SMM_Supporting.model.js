const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ── API Provider ──────────────────────────────────────────────
const providerSchema = new mongoose.Schema({
  ids:        { type: String, default: () => uuidv4() },
  name:       { type: String, required: true },
  url:        { type: String, required: true },
  apiKey:     { type: String, required: true },
  balance:    { type: Number, default: 0 },
  currency:   { type: String, default: 'USD' },
  status:     { type: Number, default: 1 },
  isMockMode: { type: Boolean, default: false },  // PanelNova: simulate order delivery without real provider
  mockDeliveryMinutes: { type: Number, default: 30 }, // how long mock delivery takes
  createdAt:  { type: Date, default: Date.now },
});
const Provider = mongoose.model('Provider', providerSchema);

// ── Support Ticket ────────────────────────────────────────────
const ticketSchema = new mongoose.Schema({
  ids:        { type: String, default: () => uuidv4() },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject:    { type: String, required: true },
  status:     { type: String, enum: ['open','answered','closed','pending'], default: 'open' },
  priority:   { type: String, enum: ['low','medium','high'], default: 'medium' },
  messages:   [{
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    senderRole: { type: String, default: 'user' },
    message:  { type: String, required: true },
    createdAt:{ type: Date, default: Date.now },
  }],
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now },
});
const Ticket = mongoose.model('Ticket', ticketSchema);

// ── Transaction Log ───────────────────────────────────────────
const transactionSchema = new mongoose.Schema({
  ids:      { type: String, default: () => uuidv4() },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:     { type: String, enum: ['deposit','order','refund','bonus','adjustment','affiliate'], default: 'deposit' },
  amount:   { type: Number, required: true },
  balanceBefore: { type: Number, default: 0 },
  balanceAfter:  { type: Number, default: 0 },
  note:     { type: String, default: '' },
  status:   { type: String, enum: ['pending','completed','failed'], default: 'completed' },
  paymentMethod: { type: String, default: '' },
  paymentRef:    { type: String, default: '' },
  createdAt:{ type: Date, default: Date.now },
});
const Transaction = mongoose.model('Transaction', transactionSchema);

// ── Options (key-value site settings) ────────────────────────
const optionSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed },
});
const Option = mongoose.model('Option', optionSchema);
Option.get = async (key, def = null) => {
  const doc = await Option.findOne({ key });
  return doc ? doc.value : def;
};
Option.set = async (key, value) => {
  return Option.findOneAndUpdate({ key }, { value }, { upsert: true, new: true });
};

// ── Payment Method ────────────────────────────────────────────
const paymentMethodSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  gateway:  { type: String, required: true }, // paypal | stripe | coinbase | manual | ...
  minAmount:{ type: Number, default: 1 },
  maxAmount:{ type: Number, default: 10000 },
  bonusPct: { type: Number, default: 0 },
  status:   { type: Number, default: 1 },
  config:   { type: mongoose.Schema.Types.Mixed, default: {} },
  sort:     { type: Number, default: 0 },
});
const PaymentMethod = mongoose.model('PaymentMethod', paymentMethodSchema);

// ── Coupon ────────────────────────────────────────────────────
const couponSchema = new mongoose.Schema({
  code:       { type: String, required: true, unique: true, uppercase: true },
  type:       { type: String, enum: ['fixed','percent'], default: 'fixed' },
  amount:     { type: Number, required: true },
  minDeposit: { type: Number, default: 0 },
  usedCount:  { type: Number, default: 0 },
  maxUses:    { type: Number, default: 0 }, // 0=unlimited
  expiresAt:  { type: Date, default: null },
  status:     { type: Number, default: 1 },
  createdAt:  { type: Date, default: Date.now },
});
const Coupon = mongoose.model('Coupon', couponSchema);

// ── FAQ ───────────────────────────────────────────────────────
const faqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer:   { type: String, required: true },
  sort:     { type: Number, default: 0 },
  status:   { type: Number, default: 1 },
});
const FAQ = mongoose.model('FAQ', faqSchema);

// ── User Favorite Services ────────────────────────────────────
const favoriteServiceSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  createdAt: { type: Date, default: Date.now },
});
const FavoriteService = mongoose.model('FavoriteService', favoriteServiceSchema);

// ── Orders Refill ─────────────────────────────────────────────
const orderRefillSchema = new mongoose.Schema({
  orderId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status:     { type: String, default: 'pending' },
  apiRefillId:{ type: String, default: '' },
  createdAt:  { type: Date, default: Date.now },
});
const OrderRefill = mongoose.model('OrderRefill', orderRefillSchema);

module.exports = {
  Provider, Ticket, Transaction, Option,
  PaymentMethod, Coupon, FAQ, FavoriteService, OrderRefill,
};
