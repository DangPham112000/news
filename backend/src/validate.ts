import { z } from 'zod';
import { normalizeUrl, slugify } from './normalize.js';

export const LIMITS = { title: 300, summary: 2000, source: 100, topic: 60, batch: 100 };

export class ValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super('Validation failed');
  }
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v ?? '');

const articleSchema = z.object({
  title: z.string({ required_error: 'title is required' }).trim().min(1, 'title is required').max(LIMITS.title),
  url: z
    .string({ required_error: 'url is required' })
    .transform((v, ctx) => {
      const url = normalizeUrl(v);
      if (!url) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'url must be a valid http(s) URL' });
      return url ?? z.NEVER;
    }),
  summary: optionalText(LIMITS.summary),
  source: optionalText(LIMITS.source),
  publishedAt: z
    .string()
    .nullish()
    .transform((v, ctx) => {
      if (!v) return null;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'publishedAt must be a valid date' });
        return z.NEVER;
      }
      return d;
    }),
});

export type ValidArticle = z.output<typeof articleSchema>;

/** Validate one article input. Returns the clean value or a list of messages. */
export function validateArticle(input: unknown): { value: ValidArticle } | { errors: string[] } {
  const result = articleSchema.safeParse(input);
  if (result.success) return { value: result.data };
  return { errors: result.error.issues.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message)) };
}

/** Validate a topic name. Returns its slug and display name, or throws ValidationError. */
export function validateTopic(topic: unknown): { slug: string; name: string } {
  const result = z.string().trim().min(1, 'topic is required').max(LIMITS.topic).safeParse(topic);
  if (!result.success) throw new ValidationError(result.error.issues.map((i) => `topic: ${i.message}`));
  const slug = slugify(result.data);
  if (!slug) throw new ValidationError(['topic must contain letters or digits']);
  return { slug, name: result.data };
}
