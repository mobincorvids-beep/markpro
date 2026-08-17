const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:     {
    type: String, required: true,
    enum: [
      'create','update','delete','restore','permanent_delete',
      'upload','download','view','share','unshare',
      'rename','move','star','unstar',
      'comment','version_upload','version_restore',
      'login','logout','register',
      'folder_create','folder_delete','folder_rename','folder_move',
      'request_sent','request_fulfilled',
    ],
  },
  targetType: { type: String, enum: ['document','folder','user','request'], required: true },
  targetId:   { type: mongoose.Schema.Types.ObjectId },
  targetName: { type: String, default: '' },
  details:    { type: String, default: '' },
  ip:         { type: String, default: '' },
}, { timestamps: true });

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ user: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
