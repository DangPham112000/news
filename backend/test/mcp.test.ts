import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import express from 'express';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createApiKey, resetMockKeys, revokeApiKey, verifyApiKey } from '../src/apiKeys.js';
import { resetMockData } from '../src/data/mockDataSource.js';
import { handleMcpNotAllowed, handleMcpPost } from '../src/mcp/http.js';

process.env.USE_MOCK = 'true';

let http: Server;
let url: URL;

before(async () => {
  const app = express();
  app.post('/mcp', express.json(), handleMcpPost);
  app.get('/mcp', handleMcpNotAllowed);
  await new Promise<void>((r) => (http = app.listen(0, r)));
  url = new URL(`http://127.0.0.1:${(http.address() as { port: number }).port}/mcp`);
});

after(() => {
  http.close();
});

beforeEach(() => {
  resetMockData();
  resetMockKeys();
});

async function connect(key: string) {
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: `Bearer ${key}` } } }),
  );
  return client;
}

const json = (r: any) => JSON.parse(r.content[0].text);

test('api keys: verify, revoke, hashed lookup', async () => {
  const { key, apiKey } = await createApiKey('agent');
  assert.ok(key.startsWith('nwk_'));
  assert.equal((await verifyApiKey(key))?.id, apiKey.id);
  assert.equal(await verifyApiKey(key + 'x'), null);
  assert.equal(await verifyApiKey(undefined), null);
  assert.equal(await revokeApiKey(apiKey.id), true);
  assert.equal(await verifyApiKey(key), null);
});

test('mcp rejects missing, wrong and revoked keys, and GET', async () => {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
  assert.equal((await fetch(url, { method: 'POST', headers, body })).status, 401);
  assert.equal((await fetch(url, { method: 'POST', headers: { ...headers, authorization: 'Bearer nwk_bad' }, body })).status, 401);
  const { key, apiKey } = await createApiKey('agent');
  await revokeApiKey(apiKey.id);
  assert.equal((await fetch(url, { method: 'POST', headers: { ...headers, authorization: `Bearer ${key}` }, body })).status, 401);
  assert.equal((await fetch(url)).status, 405);
});

test('mcp tools: upsert_news, list_news, list_topics', async () => {
  const { key } = await createApiKey('agent');
  const client = await connect(key);
  try {
    const tools = (await client.listTools()).tools.map((t) => t.name).sort();
    assert.deepEqual(tools, ['list_news', 'list_topics', 'upsert_news']);

    const saved = json(
      await client.callTool({
        name: 'upsert_news',
        arguments: {
          topic: 'Chạy bộ',
          articles: [
            { title: 'Marathon tips', url: 'https://e.com/m', source: 'Runner', publishedAt: '2026-10-10T00:00:00Z' },
            { title: '', url: 'bad' },
          ],
        },
      }),
    );
    assert.equal(saved.topic, 'chay-bo');
    assert.equal(saved.created, 1);
    assert.equal(saved.invalid[0].index, 1);

    const topics = json(await client.callTool({ name: 'list_topics', arguments: {} }));
    assert.deepEqual(topics.topics, [{ slug: 'chay-bo', name: 'Chạy bộ', articleCount: 1 }]);

    const news = json(await client.callTool({ name: 'list_news', arguments: { topic: 'chay-bo' } }));
    assert.equal(news.total, 1);
    assert.equal(news.items[0].title, 'Marathon tips');

    const bad = await client.callTool({ name: 'upsert_news', arguments: { topic: ' ', articles: [{ title: 'x', url: 'https://e.com' }] } });
    assert.equal(bad.isError, true);

    const prompt = await client.getPrompt({ name: 'update_topic_news', arguments: { topic: 'Lập trình' } });
    assert.match((prompt.messages[0].content as { text: string }).text, /Lập trình/);
  } finally {
    await client.close();
  }
});

test('mcp rate limit returns 429', async () => {
  const { key } = await createApiKey('agent');
  process.env.RATE_LIMIT_PER_MIN = '1';
  try {
    const call = () =>
      fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${key}` },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
      });
    assert.equal((await call()).status, 200);
    assert.equal((await call()).status, 429);
  } finally {
    delete process.env.RATE_LIMIT_PER_MIN;
  }
});
