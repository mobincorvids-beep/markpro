const mongoose = require('mongoose');

const CreditTransactionSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  credits:     { type: Number, required: true }, // positive = credit, negative = debit
  type:        { type: String, enum: ['purchase', 'signup_bonus', 'referral', 'text', 'code', 'image', 'speech-to-text', 'text-to-speech', 'image-animation', 'translation', 'admin_grant'], default: 'purchase' },
  description: { type: String, default: '' },
  // For purchases
  packageId:   { type: mongoose.Schema.Types.ObjectId, ref: 'CreditPackage', default: null },
  paymentId:   { type: String, default: '' },      // Stripe payment intent / session id
  amount:      { type: Number, default: 0 },        // USD paid
  // For AI usage
  promptId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Prompt', default: null },
}, { timestamps: true });

CreditTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('CreditTransaction', CreditTransactionSchema);
