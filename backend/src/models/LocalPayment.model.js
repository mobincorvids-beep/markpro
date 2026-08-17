/**
 * LocalPayment
 *
 * Manual / local Pakistani payment rails: JazzCash, EasyPaisa and direct
 * bank transfer. The user submits a payment claim with the transaction id
 * (TID / TRX) printed on their receipt, an admin verifies it, and only on
 * approval is the wallet credited (atomically, with a WalletLedger entry).
 *
 * Card / international payments continue to run through Stripe. Nothing in
 * this model touches the Stripe flow.
 */
const mongoose = require('mongoose');

const localPaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    method: {
      type: String,
      enum: ['jazzcash', 'easypaisa', 'bank_transfer'],
      required: true,
    },

    // Amount is always stored in the smallest sane unit for the currency:
    // PKR has no practical sub-unit in these rails, so this is whole rupees.
    amount:   { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'PKR' },

    // What the money is for. `wallet_topup`credits the SMM/AI wallet,
    // `plan`upgrades a subscription plan after approval.
    purpose:  { type: String, enum: ['wallet_topup', 'plan'], default: 'wallet_topup' },
    plan:     { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },

    // Proof of payment supplied by the user.
    senderName:    { type: String, trim: true },
    senderAccount: { type: String, trim: true },   // mobile wallet number or IBAN
    transactionId: { type: String, trim: true, required: true, index: true },
    receiptUrl:    { type: String, trim: true },   // S3 key/url of the uploaded screenshot

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt:   { type: Date },
    reviewNote:   { type: String, trim: true },
  },
  { timestamps: true }
);

localPaymentSchema.index({ user: 1, status: 1, createdAt: -1 });
// The same transaction id must never be claimed twice.
localPaymentSchema.index({ method: 1, transactionId: 1 }, { unique: true });

module.exports = mongoose.models.LocalPayment || mongoose.model('LocalPayment', localPaymentSchema);
