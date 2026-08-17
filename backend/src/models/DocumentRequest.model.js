const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const DocumentRequestSchema = new mongoose.Schema({
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientEmail: { type: String, required: true, lowercase: true },
  recipientName:  { type: String, default: '' },
  title:       { type: String, required: true },     // What's being requested
  message:     { type: String, default: '' },
  folder:      { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  token:       { type: String, default: () => uuidv4(), unique: true },
  status:      { type: String, enum: ['pending','fulfilled','expired','cancelled'], default: 'pending' },
  expiresAt:   { type: Date, required: true },
  fulfilledDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
  fulfilledAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('DocumentRequest', DocumentRequestSchema);
