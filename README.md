# News

Backend for the News app (milestone M1). Same stack as Event Manager: pnpm workspace, TypeScript, Express 5, Apollo Server (GraphQL), MongoDB with Mongoose.

```
pnpm install
cp backend/.env.example backend/.env
pnpm --filter backend dev:mock   # in-memory data, no database
pnpm --filter backend dev        # needs MongoDB (MONGODB_URI)
pnpm --filter backend test
```

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

The topic is created on demand (slug from the name). Upserts are idempotent: URLs are normalized (tracking params, fragment, trailing slash removed) and the same normalized title within a topic is skipped as a duplicate. Invalid items (max 100 per call) are reported by index without blocking valid ones. Authentication for agents comes in M2.
