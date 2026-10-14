# Using the News MCP server with AI agents

## 1. Create an API key

With `MONGODB_URI` set (in `backend/.env`):

```
pnpm --filter backend apikey create "Claude routine"   # prints the key once
pnpm --filter backend apikey list
pnpm --filter backend apikey revoke <id>
```

Keys look like `nwk_...`. Only a hash is stored, so a lost key must be revoked and replaced. In mock mode (`pnpm --filter backend dev:mock`) a throwaway key is printed at startup.

## 2. Connect the agent

Endpoint: `POST <PUBLIC_URL>/mcp` (Streamable HTTP, stateless), header `Authorization: Bearer nwk_...`.

Claude Code:

```
claude mcp add --transport http news https://<your-host>/mcp --header "Authorization: Bearer nwk_..."
```

Other clients: add a remote MCP server with that URL and header.

Tools:

| Tool | Purpose |
| --- | --- |
| `list_topics` | Topics that already have news, with counts |
| `list_news` | Stored articles, newest first (`topic`, `q`, `page`, `pageSize`); call before adding to skip duplicates |
| `upsert_news` | Save up to 100 articles under a topic (`topic`, `articles[]` with `title`, `url`, `summary`, `source`, `publishedAt`) |

The server also offers the prompt `update_topic_news` (argument `topic`).

Limits: 60 requests per minute per key (`RATE_LIMIT_PER_MIN`), 100 articles per call. Over the limit the server answers 429.

## 3. Prompt to run periodically

Paste this into a scheduled agent / routine, changing the topic:

```
Update my news feed for the topic "Lập trình" using the news MCP server.
1. Call list_news with this topic to see which stories are already stored.
2. Search the web for the most important and recent stories about this topic (prefer the last 1-2 days; skip anything older than a week).
3. Pick 5-15 that are new, relevant and from reputable sources.
4. Call upsert_news once with topic and the stories: title, url (original article), summary (1-3 sentences, your own words), source, publishedAt (ISO 8601 when known).
5. If the result lists invalid items, fix and resend only those.
Finish with one line: how many stories were created, updated and skipped as duplicates.
```

Example topics: `Lập trình`, `Chạy bộ`. A topic is created the first time it is used; its slug (`lap-trinh`, `chay-bo`) is what `list_news` takes.

The same text is built into the MCP server (`backend/src/mcp/prompts.ts`), so agents that read the server instructions follow it even without the prompt above.

## GraphQL

`upsertArticles` also needs the key (`Authorization: Bearer nwk_...`); reading (`topics`, `articles`) is open for now and the web UI will use it.
