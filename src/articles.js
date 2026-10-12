import { titleHash } from "./normalize.js";
import { LIMITS, ValidationError, validateArticle, validateTopic } from "./validate.js";

export function listTopics(db) {
  return db
    .prepare(
      `SELECT t.slug, t.name, COUNT(a.id) AS article_count
       FROM topics t LEFT JOIN articles a ON a.topic_id = t.id
       GROUP BY t.id ORDER BY t.name`,
    )
    .all();
}

function ensureTopic(db, topic) {
  const { slug, name } = validateTopic(topic);
  db.prepare("INSERT OR IGNORE INTO topics (slug, name) VALUES (?, ?)").run(slug, name);
  return db.prepare("SELECT id, slug, name FROM topics WHERE slug = ?").get(slug);
}

/**
 * Idempotent batch upsert for a topic (topic is auto-created).
 * Dedup: same normalized URL updates the row; a different URL with the same
 * normalized title in the same topic is skipped as a duplicate.
 * Invalid items are reported per index and do not block valid ones.
 */
export function upsertArticles(db, topic, items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ValidationError(["articles must be a non-empty array"]);
  }
  if (items.length > LIMITS.batch) {
    throw new ValidationError([`articles must contain at most ${LIMITS.batch} items`]);
  }

  const result = { topic: null, created: 0, updated: 0, duplicates: 0, invalid: [] };
  db.exec("BEGIN");
  try {
    const t = ensureTopic(db, topic);
    result.topic = t.slug;

    const byUrl = db.prepare("SELECT id FROM articles WHERE url = ?");
    const byTitle = db.prepare("SELECT id FROM articles WHERE topic_id = ? AND title_hash = ?");
    const insert = db.prepare(
      `INSERT INTO articles (topic_id, title, url, summary, source, published_at, title_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const update = db.prepare(
      `UPDATE articles SET topic_id = ?, title = ?, summary = ?, source = ?,
         published_at = ?, title_hash = ?, fetched_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = ?`,
    );

    items.forEach((raw, index) => {
      const { value, errors } = validateArticle(raw);
      if (errors) {
        result.invalid.push({ index, errors });
        return;
      }
      const hash = titleHash(value.title);
      const existing = byUrl.get(value.url);
      const sameTitle = byTitle.get(t.id, hash);
      if (existing) {
        if (sameTitle && sameTitle.id !== existing.id) {
          result.duplicates++;
          return;
        }
        update.run(t.id, value.title, value.summary, value.source, value.published_at, hash, existing.id);
        result.updated++;
      } else if (sameTitle) {
        result.duplicates++;
      } else {
        insert.run(t.id, value.title, value.url, value.summary, value.source, value.published_at, hash);
        result.created++;
      }
    });
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  return result;
}

/** Newest first. Supports topic slug, text query, and limit/offset paging. */
export function listArticles(db, { topic, q, page = 1, pageSize = 20 } = {}) {
  pageSize = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
  page = Math.max(Number(page) || 1, 1);

  const where = [];
  const params = [];
  if (topic) {
    where.push("t.slug = ?");
    params.push(topic);
  }
  if (q) {
    where.push("(a.title LIKE ? ESCAPE '\\' OR a.summary LIKE ? ESCAPE '\\')");
    const like = `%${String(q).replace(/[\\%_]/g, "\\$&")}%`;
    params.push(like, like);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM articles a JOIN topics t ON t.id = a.topic_id ${clause}`)
    .get(...params).n;
  const items = db
    .prepare(
      `SELECT a.id, t.slug AS topic, a.title, a.url, a.summary, a.source, a.published_at, a.fetched_at
       FROM articles a JOIN topics t ON t.id = a.topic_id ${clause}
       ORDER BY COALESCE(a.published_at, a.fetched_at) DESC, a.id DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, (page - 1) * pageSize);

  return { items, page, page_size: pageSize, total };
}
