import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../src/db.js";
import { listArticles, listTopics, upsertArticles } from "../src/articles.js";
import { normalizeUrl, titleHash } from "../src/normalize.js";

const a = (over = {}) => ({ title: "Node 24 released", url: "https://example.com/n24", ...over });

test("normalizeUrl strips tracking, fragment, trailing slash", () => {
  assert.equal(
    normalizeUrl("HTTPS://Example.com/a/?utm_source=x&b=2&a=1#top"),
    "https://example.com/a?a=1&b=2",
  );
  assert.equal(normalizeUrl("ftp://x.com"), null);
  assert.equal(normalizeUrl("not a url"), null);
});

test("titleHash ignores case, punctuation, accents", () => {
  assert.equal(titleHash("Chạy bộ: Marathon!"), titleHash("chay bo marathon"));
});

test("upsert creates topic and article, is idempotent", () => {
  const db = openDb();
  const r1 = upsertArticles(db, "Lập trình", [a()]);
  assert.deepEqual([r1.created, r1.updated, r1.duplicates], [1, 0, 0]);
  const r2 = upsertArticles(db, "Lập trình", [a({ summary: "new" })]);
  assert.deepEqual([r2.created, r2.updated], [0, 1]);
  assert.equal(listArticles(db).total, 1);
  assert.equal(listArticles(db).items[0].summary, "new");
  assert.equal(listTopics(db)[0].article_count, 1);
});

test("dedup by normalized url and by title within topic", () => {
  const db = openDb();
  upsertArticles(db, "dev", [a()]);
  const r = upsertArticles(db, "dev", [
    a({ url: "https://other.com/x", title: "node 24 RELEASED!" }),
    a({ url: "https://example.com/n24/?utm_medium=x", summary: "same url" }),
  ]);
  assert.deepEqual([r.created, r.updated, r.duplicates], [0, 1, 1]);
  assert.equal(listArticles(db).total, 1);
  // same title in another topic is allowed
  const r2 = upsertArticles(db, "running", [a({ url: "https://other.com/y" })]);
  assert.equal(r2.created, 1);
});

test("invalid items are reported without blocking valid ones", () => {
  const db = openDb();
  const r = upsertArticles(db, "dev", [a(), { title: "", url: "nope" }, a({ url: "https://e.com/2", title: "x", published_at: "bad" })]);
  assert.equal(r.created, 1);
  assert.deepEqual(r.invalid.map((i) => i.index), [1, 2]);
});

test("batch and topic validation throw", () => {
  const db = openDb();
  assert.throws(() => upsertArticles(db, "dev", []), /Validation/);
  assert.throws(() => upsertArticles(db, "  ", [a()]), /Validation/);
  assert.throws(() => upsertArticles(db, "dev", Array(101).fill(a())), /Validation/);
});

test("list filters by topic, query, pages newest first", () => {
  const db = openDb();
  upsertArticles(db, "dev", [
    a({ title: "Old", url: "https://e.com/1", published_at: "2026-01-01" }),
    a({ title: "New 100%", url: "https://e.com/2", published_at: "2026-02-01" }),
  ]);
  upsertArticles(db, "running", [a({ title: "Marathon", url: "https://e.com/3", published_at: "2026-03-01" })]);
  assert.deepEqual(listArticles(db, { topic: "dev" }).items.map((i) => i.title), ["New 100%", "Old"]);
  assert.equal(listArticles(db, { q: "100%" }).total, 1);
  assert.equal(listArticles(db, { q: "%" }).total, 1);
  const p = listArticles(db, { page: 2, pageSize: 2 });
  assert.equal(p.items.length, 1);
  assert.equal(p.total, 3);
});
