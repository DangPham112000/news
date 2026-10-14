export interface Topic {
  slug: string;
  name: string;
  articleCount: number;
}

export interface Article {
  id: string;
  topic: string;
  title: string;
  url: string;
  summary: string;
  source: string;
  publishedAt: string | null;
  fetchedAt: string;
}

export interface TopicsData {
  topics: Topic[];
}

export interface ArticlesData {
  articles: { total: number; page: number; pageSize: number; items: Article[] };
}
