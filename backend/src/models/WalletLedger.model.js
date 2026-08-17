/**
 * Generic, append-only ledger for every balance / credit / token mutation
 * across every module. Written by utils/wallet.js - never write directly.
 */
const mongoose = require('mongoose');

const walletLedgerSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  module:       { type: String, required: true },         // 'smm' | 'aigen' | 'pen' | 'publish' | ...
  currencyType: { type: String, default: 'balance' },      // balance | credits | tokens | images
  amount:       { type: Number, required: true },          // signed: negative = debit
  balanceAfter: { type: Number, required: true },
  reason:       { type: String, default: '' },
  refType:      { type: String, default: '' },             // 'SMM_Order' | 'Transaction' | ...
  refId:        { type: mongoose.Schema.Types.ObjectId, default: null },
  createdAt:    { type: Date, default: Date.now, index: true },
}, { versionKey: false });

walletLedgerSchema.index({ userId: 1, module: 1, createdAt: -1 });

module.exports = mongoose.model('WalletLedger', walletLedgerSchema);
