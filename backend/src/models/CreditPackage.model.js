const mongoose = require('mongoose');

const CreditPackageSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  credits:     { type: Number, required: true },
  price:       { type: Number, required: true },    // USD
  description: { type: String, default: '' },
  features:    [{ type: String }],
  isFeatured:  { type: Boolean, default: false },
  active:      { type: Boolean, default: true },
  stripePriceId: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('CreditPackage', CreditPackageSchema);
