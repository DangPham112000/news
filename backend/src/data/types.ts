import type { ValidArticle } from '../validate.js';

export interface ITopic {
  slug: string;
  name: string;
  articleCount: number;
}

export interface IArticle {
  id: string;
  topic: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  publishedAt: string | null;
  fetchedAt: string;
}

export interface ArticleQuery {
  topic?: string;
  q?: string;
  page: number;
  pageSize: number;
}

export interface ArticlePage {
  items: IArticle[];
  page: number;
  pageSize: number;
  total: number;
}

export interface UpsertCounts {
  created: number;
  updated: number;
  duplicates: number;
}

export interface IDataSource {
  getTopics(): Promise<ITopic[]>;
  /** Newest first (published time, else fetched time). */
  getArticles(query: ArticleQuery): Promise<ArticlePage>;
  /**
   * Idempotent upsert of already validated articles into a topic (created on demand).
   * Same URL updates the article; a different URL with the same title in the topic
   * counts as a duplicate and is skipped.
   */
  upsertArticles(topic: { slug: string; name: string }, articles: ValidArticle[]): Promise<UpsertCounts>;
}
