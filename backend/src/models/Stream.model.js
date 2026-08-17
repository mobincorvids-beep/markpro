const mongoose = require('mongoose');

const StreamSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    accounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SocialAccount' }],
    layout: {
      type: String,
      enum: ['wall', 'timeline', 'carousel', 'rotating', 'tabbed', 'ticker'],
      default: 'wall',
    },
    theme: { type: String, enum: ['modern', 'flat', 'default', 'dark'], default: 'modern' },
    postsPerPage: { type: Number, default: 20 },
    showFilter: { type: Boolean, default: true },
    showSearch: { type: Boolean, default: true },
    showSharing: { type: Boolean, default: true },
    networks: [{ type: String }], // active network filters
    isPublic: { type: Boolean, default: false },
    embedCode: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Stream', StreamSchema);
