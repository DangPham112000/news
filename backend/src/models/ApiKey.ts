import mongoose from 'mongoose';

// API keys that let AI agents call the MCP endpoint and write news.
// Only the SHA-256 hash is stored; the raw key is shown once on creation.
const apiKeySchema = new mongoose.Schema({
  name: { type: String, required: true },
  hash: { type: String, required: true, unique: true },
  // First characters of the key, so keys can be told apart.
  prefix: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date },
});

export const ApiKey = mongoose.model('ApiKey', apiKeySchema);
