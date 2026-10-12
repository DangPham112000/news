import { Article } from '../models/Article.js';
import { Topic } from '../models/Topic.js';
import { titleHash } from '../normalize.js';
import type { IArticle, IDataSource } from './types.js';

const DUPLICATE_KEY = 11000;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const dbDataSource: IDataSource = {
  async getTopics() {
    const counts = await Article.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: '$topic', n: { $sum: 1 } } }]);
    const byTopic = new Map(counts.map((c) => [String(c._id), c.n]));
    const topics = await Topic.find().sort({ name: 1 }).lean();
    return topics.map((t) => ({ slug: t.slug, name: t.name, articleCount: byTopic.get(String(t._id)) ?? 0 }));
  },

  async getArticles({ topic, q, page, pageSize }) {
    const filter: Record<string, unknown> = {};
    if (topic) {
      const t = await Topic.findOne({ slug: topic }).lean();
      if (!t) return { items: [], page, pageSize, total: 0 };
      filter.topic = t._id;
    }
    if (q) {
      const re = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ title: re }, { summary: re }];
    }
    const [total, docs] = await Promise.all([
      Article.countDocuments(filter),
      Article.find(filter)
        .sort({ sortAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate<{ topic: { slug: string } }>('topic', 'slug')
        .lean(),
    ]);
    const items: IArticle[] = docs.map((d) => ({
      id: String(d._id),
      topic: d.topic.slug,
      title: d.title,
      url: d.url,
      summary: d.summary ?? '',
      source: d.source ?? '',
      publishedAt: d.publishedAt ? d.publishedAt.toISOString() : null,
      fetchedAt: d.fetchedAt.toISOString(),
    }));
    return { items, page, pageSize, total };
  },

  async upsertArticles(topic, articles) {
    const t = await Topic.findOneAndUpdate(
      { slug: topic.slug },
      { $setOnInsert: { slug: topic.slug, name: topic.name } },
      { upsert: true, new: true },
    );

    const counts = { created: 0, updated: 0, duplicates: 0 };
    for (const a of articles) {
      const hash = titleHash(a.title);
      const now = new Date();
      const fields = {
        topic: t._id,
        title: a.title,
        summary: a.summary,
        source: a.source,
        publishedAt: a.publishedAt,
        fetchedAt: now,
        titleHash: hash,
        sortAt: a.publishedAt ?? now,
      };
      try {
        const existing = await Article.findOne({ url: a.url }, { _id: 1 }).lean();
        if (existing) {
          const clash = await Article.exists({ topic: t._id, titleHash: hash, _id: { $ne: existing._id } });
          if (clash) {
            counts.duplicates++;
            continue;
          }
          await Article.updateOne({ _id: existing._id }, { $set: fields });
          counts.updated++;
        } else {
          await Article.create({ ...fields, url: a.url });
          counts.created++;
        }
      } catch (err) {
        // A concurrent upsert of the same story lost the race on a unique index.
        if ((err as { code?: number }).code === DUPLICATE_KEY) counts.duplicates++;
        else throw err;
      }
    }
    return counts;
  },
};
