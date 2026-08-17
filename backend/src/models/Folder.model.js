const mongoose = require('mongoose');

const FolderSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  parent:    { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  owner:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  path:      { type: String, default: '/' },        // materialised path e.g. /root/Projects/2024
  color:     { type: String, default: '#3b82f6' },
  isStarred: { type: Boolean, default: false },
  // Sharing
  sharedWith: [{
    user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['view','edit'], default: 'view' },
  }],
  isPublic:   { type: Boolean, default: false },
  publicLink: { type: String, default: '' },
  trashed:    { type: Boolean, default: false },
  trashedAt:  { type: Date },
}, { timestamps: true });

FolderSchema.index({ owner: 1, parent: 1 });

module.exports = mongoose.model('Folder', FolderSchema);
