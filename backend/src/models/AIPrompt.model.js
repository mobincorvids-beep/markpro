const mongoose = require('mongoose');

const PromptSchema = new mongoose.Schema({
  user:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Generator type: text | code | translation | image | text-to-speech | speech-to-text | image-animation
  type:             { type: String, required: true },
  // Core input/output
  prompt:           { type: String, default: '' },
  promptResponse:   { type: String, default: '' },
  // For image/audio outputs stored as file paths
  mediaFiles:       [{ type: String }],
  // Metadata
  languageCode:     { type: String, default: 'en' },
  responseWordCount:{ type: Number, default: 0 },
  responseCharCount:{ type: Number, default: 0 },
  // Template info (for text generation)
  templateKey:      { type: String, default: '' },
  categoryKey:      { type: String, default: '' },
  // Extra data (image size, voice, style preset, etc.)
  data:             { type: mongoose.Schema.Types.Mixed, default: {} },
  // Credits used
  creditsUsed:      { type: Number, default: 0 },
  creditType:       { type: Number, default: null }, // 2=text, 3=image, 4=code, 5=stt, 7=translation, 8=animation, 11=tts
  status:           { type: String, enum: ['active', 'archived'], default: 'active' },
  title:            { type: String, default: '' }, // auto-generated from first few words
}, { timestamps: true });

PromptSchema.index({ user: 1, createdAt: -1 });
PromptSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('Prompt', PromptSchema);
