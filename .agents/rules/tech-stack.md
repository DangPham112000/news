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

## Frontend
React 19 + Vite, TypeScript, TailwindCSS + shadcn/ui components (`@base-ui/react`), Apollo Client (GraphQL), Redux Toolkit for UI state. React Router and lodash are not used yet: add them when a second page or a need appears.

## Deployment
Docker + Docker Compose, Nginx (frontend container, plus the host nginx on the VPS), GitHub Actions (`ci.yml` checks, `deploy.yml` deploys on push to `main`). See `docs/deployment.md`.

## Monorepo
pnpm workspace: `backend/` and `frontend/`, plus `nginx/` (container config).
