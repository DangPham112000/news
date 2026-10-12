import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { listArticles, listTopics, upsertArticles } from "./articles.js";
import { openDb } from "./db.js";
import { ValidationError } from "./validate.js";

const MAX_BODY = 1024 * 1024;

function send(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(data);
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new ValidationError(["request body too large"]);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ValidationError(["body must be valid JSON"]);
  }
}

export function createApp(db) {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const { pathname } = url;

      if (req.method === "GET" && pathname === "/topics") {
        return send(res, 200, { items: listTopics(db) });
      }
      if (req.method === "GET" && pathname === "/articles") {
        const p = url.searchParams;
        return send(
          res,
          200,
          listArticles(db, {
            topic: p.get("topic") || undefined,
            q: p.get("q") || undefined,
            page: p.get("page"),
            pageSize: p.get("page_size"),
          }),
        );
      }
      if (req.method === "POST" && pathname === "/articles") {
        const body = await readJson(req);
        if (!body || typeof body !== "object") throw new ValidationError(["body must be an object"]);
        return send(res, 200, upsertArticles(db, body.topic, body.articles));
      }
      if (pathname === "/topics" || pathname === "/articles") {
        return send(res, 405, { error: "method not allowed" });
      }
      send(res, 404, { error: "not found" });
    } catch (err) {
      if (err instanceof ValidationError) return send(res, 400, { error: err.message, details: err.errors });
      console.error(err);
      send(res, 500, { error: "internal error" });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dbPath = process.env.DB_PATH || "data/news.db";
  mkdirSync(dirname(dbPath), { recursive: true });
  const port = Number(process.env.PORT) || 3000;
  createApp(openDb(dbPath)).listen(port, () => console.log(`news API on :${port}`));
}
