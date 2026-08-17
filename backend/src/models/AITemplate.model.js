const mongoose = require('mongoose');

const AITemplateSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  slug:        { type: String, required: true, unique: true },
  category:    { type: String, default: 'General' },
  platform:    { type: String, default: 'all' },
  description: { type: String, default: '' },
  icon:        { type: String, default: '' },
  promptTemplate: { type: String, required: true }, // e.g. "Write a {{tone}} caption for {{topic}} for {{platform}}"
  variables:   [{ // dynamic form fields
    key:   { type: String },
    label: { type: String },
    type:  { type: String, enum: ['text', 'textarea', 'select', 'number'], default: 'text' },
    options: [{ type: String }],
    placeholder: { type: String, default: '' },
  }],
  outputType:  { type: String, enum: ['text', 'image'], default: 'text' },
  active:      { type: Boolean, default: true },
  usageCount:  { type: Number, default: 0 },
  isBuiltIn:   { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('AITemplate', AITemplateSchema);
