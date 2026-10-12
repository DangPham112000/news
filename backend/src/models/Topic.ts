import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
});

export const Topic = mongoose.model('Topic', topicSchema);
