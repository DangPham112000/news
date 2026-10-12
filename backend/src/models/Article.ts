import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  title: { type: String, required: true },
  // Normalized URL (see normalizeUrl).
  url: { type: String, required: true, unique: true },
  summary: { type: String, default: '' },
  source: { type: String, default: '' },
  publishedAt: { type: Date, default: null },
  fetchedAt: { type: Date, default: Date.now },
  // Hash of the normalized title, to skip the same story under another URL.
  titleHash: { type: String, required: true },
  // publishedAt, else fetchedAt: the sort key of the feed.
  sortAt: { type: Date, required: true },
});

articleSchema.index({ topic: 1, titleHash: 1 }, { unique: true });
articleSchema.index({ topic: 1, sortAt: -1, _id: -1 });
articleSchema.index({ sortAt: -1, _id: -1 });

export const Article = mongoose.model('Article', articleSchema);
