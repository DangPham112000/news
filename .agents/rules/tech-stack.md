# News — Tech Stack

Deliberately the same stack as the Event Manager repo, so both are maintained the same way.

## Backend
- **Runtime:** Node.js, TypeScript (`strict`, NodeNext ESM)
- **Framework:** Express 5
- **API layer:** Apollo Server (GraphQL)
- **Validation:** zod
- **AI agent access:** MCP endpoint at `/mcp` (`@modelcontextprotocol/sdk`), added in M2

## Database
- **MongoDB** via Mongoose. Data access goes through `IDataSource` (`backend/src/data`), with an in-memory mock (`USE_MOCK=true`) for running and testing without a database.

## Frontend (M3)
React 19 + Vite, TypeScript, TailwindCSS + shadcn/ui, React Router, Apollo Client, Redux Toolkit.

## Deployment (M3)
Docker + Docker Compose, Nginx, GitHub Actions.

## Monorepo
pnpm workspace: `backend/` now, `frontend/` and `nginx/` later.
