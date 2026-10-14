# News

Shows the news I care about. AI agents push news per topic (programming, running, ...) through an MCP server; it is stored in MongoDB and shown in a web UI with a topic filter and search.

Same stack as Event Manager: pnpm workspace, TypeScript; backend Express 5 + Apollo Server (GraphQL) + MongoDB/Mongoose; frontend React 19 + Vite + Tailwind + Apollo Client + Redux Toolkit; Docker Compose + Nginx + GitHub Actions.

```
pnpm install
cp backend/.env.example backend/.env
pnpm --filter backend dev:mock   # in-memory data, no database (prints a dev API key)
pnpm --filter backend dev        # needs MongoDB (MONGODB_URI)
pnpm --filter frontend dev       # web UI on http://localhost:5173, talks to the backend on :4000
pnpm --filter backend test
```

## Backend



GraphQL at `http://localhost:4000/graphql`:

```graphql
query { topics { slug name articleCount } }
query { articles(topic: "lap-trinh", q: "node", page: 1, pageSize: 20) { total items { title url source publishedAt } } }
mutation {
  upsertArticles(topic: "Lập trình", articles: [{ title: "Node 24 released", url: "https://example.com/n24" }]) {
    topic created updated duplicates invalid { index errors }
  }
}
```

The topic is created on demand (slug from the name). Upserts are idempotent: URLs are normalized (tracking params, fragment, trailing slash removed) and the same normalized title within a topic is skipped as a duplicate. Invalid items (max 100 per call) are reported by index without blocking valid ones. `upsertArticles` needs an API key (`Authorization: Bearer nwk_...`).

## AI agents (MCP)

`POST /mcp` exposes `list_topics`, `list_news` and `upsert_news` to AI agents, authenticated with API keys (`pnpm --filter backend apikey create <name>`). See [docs/agent-usage.md](docs/agent-usage.md) for setup and the prompt to run periodically.

## Deployment

Docker Compose + Nginx + GitHub Actions on a VPS, like Event Manager. See [docs/deployment.md](docs/deployment.md).
