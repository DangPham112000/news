import { normalizeUrl, slugify } from "./normalize.js";

export const LIMITS = { title: 300, summary: 2000, source: 100, topic: 60, batch: 100 };

export class ValidationError extends Error {
  constructor(errors) {
    super("Validation failed");
    this.errors = errors;
  }
}

function str(value, field, max, errors, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) errors.push(`${field} is required`);
    return "";
  }
  if (typeof value !== "string") {
    errors.push(`${field} must be a string`);
    return "";
  }
  const v = value.trim();
  if (required && !v) errors.push(`${field} is required`);
  if (v.length > max) errors.push(`${field} must be at most ${max} characters`);
  return v;
}

/** Validate one article input. Returns { value } or { errors }. */
export function validateArticle(input) {
  const errors = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { errors: ["article must be an object"] };
  }
  const title = str(input.title, "title", LIMITS.title, errors, { required: true });
  const summary = str(input.summary, "summary", LIMITS.summary, errors);
  const source = str(input.source, "source", LIMITS.source, errors);

  let url = null;
  if (typeof input.url !== "string" || !input.url.trim()) {
    errors.push("url is required");
  } else {
    url = normalizeUrl(input.url);
    if (!url) errors.push("url must be a valid http(s) URL");
  }

  let publishedAt = null;
  if (input.published_at !== undefined && input.published_at !== null && input.published_at !== "") {
    const d = new Date(input.published_at);
    if (Number.isNaN(d.getTime())) errors.push("published_at must be a valid date");
    else publishedAt = d.toISOString();
  }

  return errors.length
    ? { errors }
    : { value: { title, summary, source, url, published_at: publishedAt } };
}

/** Validate a topic name/slug. Returns { slug, name } or throws ValidationError. */
export function validateTopic(topic) {
  const errors = [];
  const name = str(topic, "topic", LIMITS.topic, errors, { required: true });
  const slug = slugify(name);
  if (!errors.length && !slug) errors.push("topic must contain letters or digits");
  if (errors.length) throw new ValidationError(errors);
  return { slug, name };
}
