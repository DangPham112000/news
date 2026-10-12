import { getDataSource } from './data/index.js';
import { LIMITS, ValidationError, validateArticle, validateTopic, type ValidArticle } from './validate.js';

export interface UpsertResult {
  topic: string;
  created: number;
  updated: number;
  duplicates: number;
  invalid: { index: number; errors: string[] }[];
}

/**
 * Validate a batch from an agent and store it. Invalid items are reported by
 * index and do not block the valid ones.
 */
export async function upsertNews(topicName: unknown, items: unknown): Promise<UpsertResult> {
  const topic = validateTopic(topicName);
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError(['articles must be a non-empty array']);
  }
  if (items.length > LIMITS.batch) {
    throw new ValidationError([`articles must contain at most ${LIMITS.batch} items`]);
  }

  const valid: ValidArticle[] = [];
  const invalid: UpsertResult['invalid'] = [];
  items.forEach((raw, index) => {
    const result = validateArticle(raw);
    if ('errors' in result) invalid.push({ index, errors: result.errors });
    else valid.push(result.value);
  });

  const counts = await getDataSource().upsertArticles(topic, valid);
  return { topic: topic.slug, ...counts, invalid };
}

export function clampPaging(page?: number | null, pageSize?: number | null) {
  return {
    page: Math.max(Math.floor(page ?? 1), 1),
    pageSize: Math.min(Math.max(Math.floor(pageSize ?? 20), 1), 100),
  };
}
