import { titleHash } from '../normalize.js';
import type { ValidArticle } from '../validate.js';
import type { IArticle, IDataSource } from './types.js';

interface Stored extends IArticle {
  titleHash: string;
  sortAt: number;
}

const topics = new Map<string, string>(); // slug -> name
let articles: Stored[] = [];
let nextId = 1;

/** Empty the in-memory store (used by tests). */
export function resetMockData(): void {
  topics.clear();
  articles = [];
  nextId = 1;
}

export const mockDataSource: IDataSource = {
  async getTopics() {
    return [...topics.entries()]
      .map(([slug, name]) => ({ slug, name, articleCount: articles.filter((a) => a.topic === slug).length }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async getArticles({ topic, q, page, pageSize }) {
    const needle = q?.toLowerCase();
    const matches = articles
      .filter((a) => !topic || a.topic === topic)
      .filter((a) => !needle || a.title.toLowerCase().includes(needle) || a.summary.toLowerCase().includes(needle))
      .sort((a, b) => b.sortAt - a.sortAt || Number(b.id) - Number(a.id));
    const items = matches
      .slice((page - 1) * pageSize, page * pageSize)
      .map(({ titleHash: _h, sortAt: _s, ...article }) => article);
    return { items, page, pageSize, total: matches.length };
  },

  async upsertArticles(topic, input: ValidArticle[]) {
    if (!topics.has(topic.slug)) topics.set(topic.slug, topic.name);
    const counts = { created: 0, updated: 0, duplicates: 0 };
    for (const a of input) {
      const hash = titleHash(a.title);
      const now = new Date();
      const existing = articles.find((x) => x.url === a.url);
      const clash = articles.find((x) => x.topic === topic.slug && x.titleHash === hash && x !== existing);
      if (clash) {
        counts.duplicates++;
      } else if (existing) {
        Object.assign(existing, {
          topic: topic.slug,
          title: a.title,
          summary: a.summary,
          source: a.source,
          publishedAt: a.publishedAt?.toISOString() ?? null,
          fetchedAt: now.toISOString(),
          titleHash: hash,
          sortAt: (a.publishedAt ?? now).getTime(),
        });
        counts.updated++;
      } else {
        articles.push({
          id: String(nextId++),
          topic: topic.slug,
          title: a.title,
          url: a.url,
          summary: a.summary,
          source: a.source,
          publishedAt: a.publishedAt?.toISOString() ?? null,
          fetchedAt: now.toISOString(),
          titleHash: hash,
          sortAt: (a.publishedAt ?? now).getTime(),
        });
        counts.created++;
      }
    }
    return counts;
  },
};
