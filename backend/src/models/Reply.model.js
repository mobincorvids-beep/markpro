// Copied from ai-social-replier with model path updated
const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  originalPost: {
    type: String,
    required: true,
    maxlength: [2000, 'Original post cannot exceed 2000 characters'],
  },
  platform: {
    type: String,
    enum: ['twitter', 'linkedin', 'facebook', 'instagram', 'reddit', 'other'],
    default: 'other',
  },
  tone: {
    type: String,
    enum: ['professional', 'casual', 'witty', 'empathetic', 'formal'],
    default: 'professional',
  },
  language: {
    type: String,
    default: 'en',
  },
  generatedReply: {
    type: String,
    required: true,
  },
  aiModel: {
    type: String,
    enum: ['gemini', 'mistral'],
    default: 'gemini',
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
  },
  metadata: {
    promptTokens: Number,
    completionTokens: Number,
  },
}, {
  timestamps: true,
});

replySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Reply', replySchema);
