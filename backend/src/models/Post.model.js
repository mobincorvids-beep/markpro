const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'SocialAccount', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    network: {
      type: String,
      required: true,
      enum: ['twitter', 'facebook', 'instagram', 'youtube', 'tiktok', 'reddit', 'rss', 'pinterest', 'linkedin'],
    },
    postId: { type: String, required: true },     // Original post ID from the network
    text: { type: String, default: '' },
    html: { type: String, default: '' },
    mediaType: { type: String, enum: ['none', 'image', 'video', 'gallery', 'link'], default: 'none' },
    mediaUrls: [{ type: String }],
    thumbnailUrl: { type: String, default: '' },
    link: { type: String, default: '' },
    authorName: { type: String, default: '' },
    authorAvatar: { type: String, default: '' },
    authorUsername: { type: String, default: '' },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    tags: [{ type: String }],
    publishedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

PostSchema.index({ user: 1, publishedAt: -1 });
PostSchema.index({ network: 1, publishedAt: -1 });
PostSchema.index({ postId: 1, network: 1 }, { unique: true });

module.exports = mongoose.model('Post', PostSchema);
