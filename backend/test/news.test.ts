import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../src/graphql/typeDefs.js';
import { resolvers } from '../src/graphql/resolvers.js';
import { resetMockData } from '../src/data/mockDataSource.js';
import { normalizeUrl, slugify, titleHash } from '../src/normalize.js';

process.env.USE_MOCK = 'true';

const server = new ApolloServer({ typeDefs, resolvers });

async function gql(query: string, variables?: Record<string, unknown>) {
  const res = await server.executeOperation({ query, variables });
  assert.equal(res.body.kind, 'single');
  return (res.body as { singleResult: { data?: any; errors?: any[] } }).singleResult;
}

const UPSERT = `mutation($topic: String!, $articles: [ArticleInput!]!) {
  upsertArticles(topic: $topic, articles: $articles) { topic created updated duplicates invalid { index errors } }
}`;
const a = (over: Record<string, unknown> = {}) => ({ title: 'Node 24 released', url: 'https://example.com/n24', ...over });

beforeEach(() => resetMockData());

test('normalizeUrl strips tracking, fragment, trailing slash', () => {
  assert.equal(normalizeUrl('HTTPS://Example.com/a/?utm_source=x&b=2&a=1#top'), 'https://example.com/a?a=1&b=2');
  assert.equal(normalizeUrl('ftp://x.com'), null);
  assert.equal(normalizeUrl('not a url'), null);
});

test('titleHash ignores case, punctuation, accents; slugify handles Vietnamese', () => {
  assert.equal(titleHash('Chạy bộ: Marathon!'), titleHash('chay bo marathon'));
  assert.equal(slugify('Lập trình'), 'lap-trinh');
  assert.equal(slugify('Đường chạy'), 'duong-chay');
});

test('upsert creates topic and article and is idempotent', async () => {
  const r1 = await gql(UPSERT, { topic: 'Lập trình', articles: [a()] });
  assert.deepEqual(JSON.parse(JSON.stringify(r1.data.upsertArticles)), { topic: 'lap-trinh', created: 1, updated: 0, duplicates: 0, invalid: [] });
  const r2 = await gql(UPSERT, { topic: 'Lập trình', articles: [a({ summary: 'new' })] });
  assert.equal(r2.data.upsertArticles.updated, 1);
  const list = await gql('{ articles { total items { summary topic } } topics { slug name articleCount } }');
  assert.equal(list.data.articles.total, 1);
  assert.equal(list.data.articles.items[0].summary, 'new');
  assert.deepEqual(JSON.parse(JSON.stringify(list.data.topics)), [{ slug: 'lap-trinh', name: 'Lập trình', articleCount: 1 }]);
});

test('dedup by normalized url and by title within a topic', async () => {
  await gql(UPSERT, { topic: 'dev', articles: [a()] });
  const r = await gql(UPSERT, {
    topic: 'dev',
    articles: [
      a({ url: 'https://other.com/x', title: 'node 24 RELEASED!' }),
      a({ url: 'https://example.com/n24/?utm_medium=x', summary: 'same url' }),
    ],
  });
  assert.deepEqual([r.data.upsertArticles.created, r.data.upsertArticles.updated, r.data.upsertArticles.duplicates], [0, 1, 1]);
  const other = await gql(UPSERT, { topic: 'running', articles: [a({ url: 'https://other.com/y' })] });
  assert.equal(other.data.upsertArticles.created, 1);
});

test('invalid items are reported by index without blocking valid ones', async () => {
  const r = await gql(UPSERT, {
    topic: 'dev',
    articles: [a(), { title: ' ', url: 'nope' }, a({ url: 'https://e.com/2', title: 'x', publishedAt: 'bad' })],
  });
  assert.equal(r.data.upsertArticles.created, 1);
  assert.deepEqual(r.data.upsertArticles.invalid.map((i: any) => i.index), [1, 2]);
});

test('batch and topic validation return BAD_USER_INPUT', async () => {
  for (const vars of [
    { topic: 'dev', articles: [] },
    { topic: '  ', articles: [a()] },
    { topic: 'dev', articles: Array(101).fill(a()) },
  ]) {
    const r = await gql(UPSERT, vars);
    assert.equal(r.errors?.[0].extensions.code, 'BAD_USER_INPUT');
  }
});

test('articles filter by topic and query, page newest first', async () => {
  await gql(UPSERT, {
    topic: 'dev',
    articles: [
      a({ title: 'Old', url: 'https://e.com/1', publishedAt: '2026-01-01T00:00:00Z' }),
      a({ title: 'New 100%', url: 'https://e.com/2', publishedAt: '2026-02-01T00:00:00Z' }),
    ],
  });
  await gql(UPSERT, { topic: 'running', articles: [a({ title: 'Marathon', url: 'https://e.com/3', publishedAt: '2026-03-01T00:00:00Z' })] });
  const q = (args: string) => gql(`{ articles(${args}) { total items { title } } }`);
  assert.deepEqual((await q('topic: "dev"')).data.articles.items.map((i: any) => i.title), ['New 100%', 'Old']);
  assert.equal((await q('q: "marath"')).data.articles.total, 1);
  const p = await q('page: 2, pageSize: 2');
  assert.equal(p.data.articles.items.length, 1);
  assert.equal(p.data.articles.total, 3);
});
