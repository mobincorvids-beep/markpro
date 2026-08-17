const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:      { type: String, default: '' },
  prompt:     { type: String, required: true },
  negPrompt:  { type: String, default: '' },
  style:      { type: String, default: 'none' },
  size:       { type: String, default: '1024x1024' },
  aiModel:    { type: String, default: 'sd' }, // sd | realxl | odalle | pix | dreams | playg | de | de3
  thumbUrl:   { type: String },  // resized/watermarked version
  mainUrl:    { type: String },  // original full image
  storageType:{ type: String, enum: ['local', 'aws', 'wasabi'], default: 'local' },
  isPrivate:  { type: Boolean, default: false },
  isNsfw:     { type: Boolean, default: false },
  tags:       [String],
  favorites:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('Image', imageSchema);
