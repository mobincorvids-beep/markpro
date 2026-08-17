const mongoose = require('mongoose');

// ── Design Project ────────────────────────────────────────────────────────
const designProjectSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:       { type: String, default: 'Untitled Design', trim: true },
  description: { type: String, trim: true },
  category:    { type: String, enum: ['social-media','presentation','advertisement','website','card','banner','other'], default: 'social-media' },
  canvas: {
    width:      { type: Number, default: 1080 },
    height:     { type: Number, default: 1080 },
    background: { type: String, default: '#ffffff' },
    elements:   { type: mongoose.Schema.Types.Mixed, default: [] }, // Fabric.js JSON
  },
  thumbnail:    { type: String, default: null },
  isPublic:     { type: Boolean, default: false },
  shareToken:   { type: String, unique: true, sparse: true },
  template:     { type: mongoose.Schema.Types.ObjectId, ref: 'DesignTemplate' },
  tags:         [String],
  lastEditedAt: { type: Date, default: Date.now },
}, { timestamps: true });
designProjectSchema.index({ user: 1, lastEditedAt: -1 });
const DesignProject = mongoose.model('DesignProject', designProjectSchema);

// ── Design Template ───────────────────────────────────────────────────────
const designTemplateSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  category:    { type: String, enum: ['social-media','presentation','advertisement','website','card','banner','other'], default: 'social-media' },
  subCategory: { type: String, trim: true },
  tags:        [String],
  isPremium:   { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  canvas: {
    width:      { type: Number, required: true },
    height:     { type: Number, required: true },
    background: { type: String, default: '#ffffff' },
    elements:   { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  thumbnail:  String,
  usageCount: { type: Number, default: 0 },
  dimensions: { label: String, width: Number, height: Number },
}, { timestamps: true });
designTemplateSchema.index({ category: 1, isPremium: 1 });
const DesignTemplate = mongoose.model('DesignTemplate', designTemplateSchema);

// ── Design Media Library ──────────────────────────────────────────────────
const designMediaSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename: { type: String, required: true },
  url:      { type: String, required: true },
  type:     { type: String, enum: ['image','svg','icon'], default: 'image' },
  mimeType: String,
  size:     { type: Number, default: 0 },
  width:    Number,
  height:   Number,
  isPublic: { type: Boolean, default: false },
}, { timestamps: true });
designMediaSchema.index({ user: 1, createdAt: -1 });
const DesignMedia = mongoose.model('DesignMedia', designMediaSchema);

module.exports = { DesignProject, DesignTemplate, DesignMedia };
