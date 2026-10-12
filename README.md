# News

Storage and REST API for the News Aggregator (milestone M1). Node >= 22.13, no dependencies (uses built-in `node:sqlite`).

```
npm start        # PORT=3000 DB_PATH=data/news.db
npm test
```

## API
- `GET /topics` -> `{ items: [{ slug, name, article_count }] }`
- `GET /articles?topic=&q=&page=&page_size=` -> `{ items, page, page_size, total }`, newest first
- `POST /articles` with `{ "topic": "Lập trình", "articles": [{ title, url, summary?, source?, published_at? }] }` (max 100)
  -> `{ topic, created, updated, duplicates, invalid: [{ index, errors }] }`

The topic is created on demand. Upserts are idempotent: URLs are normalized (tracking params, fragment, trailing slash removed) and the same normalized title within a topic is skipped as a duplicate. Invalid items are reported by index without blocking valid ones.
