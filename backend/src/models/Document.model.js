const mongoose = require('mongoose');

const VersionSchema = new mongoose.Schema({
  versionNumber: { type: Number, required: true },
  fileName:      { type: String, required: true },   // stored filename on disk
  originalName:  { type: String, required: true },
  size:          { type: Number, required: true },    // bytes
  mimeType:      { type: String, required: true },
  uploadedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note:          { type: String, default: '' },
}, { timestamps: true });

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
}, { timestamps: true });

const ShareSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email:      { type: String, default: '' },          // for external shares without account
  permission: { type: String, enum: ['view','edit','download'], default: 'view' },
  expiresAt:  { type: Date },
});

const DocumentSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },     // display name
  description: { type: String, default: '' },
  documentType:{ type: String, default: 'General' },              // dynamic categorisation
  tags:        [{ type: String }],
  folder:      { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Current/active version info (denormalised for quick access)
  fileName:    { type: String, required: true },
  originalName:{ type: String, required: true },
  size:        { type: Number, required: true },
  mimeType:    { type: String, required: true },
  extension:   { type: String, default: '' },

  // Versions
  versions:    [VersionSchema],
  currentVersion: { type: Number, default: 1 },

  // Sharing & permissions
  sharedWith:  [ShareSchema],
  isPublic:    { type: Boolean, default: false },
  publicLink:  { type: String, default: '' },
  passwordProtected: { type: Boolean, default: false },
  accessPassword:    { type: String, default: '' },

  // Status / lifecycle
  status:      { type: String, enum: ['active','archived','expired'], default: 'active' },
  expiryDate:  { type: Date },
  reminderDate:{ type: Date },
  reminderSent:{ type: Boolean, default: false },

  // Engagement
  isStarred:   { type: Boolean, default: false },
  comments:    [CommentSchema],
  viewCount:   { type: Number, default: 0 },
  downloadCount: { type: Number, default: 0 },

  // Trash
  trashed:     { type: Boolean, default: false },
  trashedAt:   { type: Date },
}, { timestamps: true });

DocumentSchema.index({ owner: 1, folder: 1 });
DocumentSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Document', DocumentSchema);
