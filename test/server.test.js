import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../src/db.js";
import { createApp } from "../src/server.js";

async function withServer(fn) {
  const server = createApp(openDb());
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    server.close();
  }
}

const post = (base, body) =>
  fetch(`${base}/articles`, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

test("POST then GET articles and topics", () =>
  withServer(async (base) => {
    const r = await post(base, { topic: "running", articles: [{ title: "Race", url: "https://e.com/r" }] });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).created, 1);
    const list = await (await fetch(`${base}/articles?topic=running`)).json();
    assert.equal(list.total, 1);
    const topics = await (await fetch(`${base}/topics`)).json();
    assert.equal(topics.items[0].slug, "running");
  }));

test("errors: bad json, validation, 404, 405", () =>
  withServer(async (base) => {
    assert.equal((await post(base, "{oops")).status, 400);
    assert.equal((await post(base, { topic: "x", articles: [] })).status, 400);
    assert.equal((await fetch(`${base}/nope`)).status, 404);
    assert.equal((await fetch(`${base}/topics`, { method: "DELETE" })).status, 405);
  }));
