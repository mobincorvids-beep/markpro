const mongoose = require('mongoose');

const ToolUsageSchema = new mongoose.Schema({
  toolId:   { type: String, required: true, index: true },
  toolName: { type: String },
  input:    { type: String, default: '' },
  ip:       { type: String, default: '' },
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// Auto-expire entries older than 90 days
ToolUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('ToolUsage', ToolUsageSchema);
