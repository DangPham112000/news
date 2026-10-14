# Deployment

Same shape as Event Manager: a VPS shared with other projects, nothing in this stack binds a public port.

```
Browser ─HTTPS─▶ Cloudflare (proxied, SSL mode "Flexible")
        ─HTTP:80─▶ host nginx (news.<domain> server block)
        ─▶ 127.0.0.1:8081 ─▶ frontend container (nginx: static SPA + /graphql, /mcp proxy)
        ─▶ backend:4000 ─▶ mongodb:27017   (internal compose network only)
```

- `docker-compose.yml` (project name `news`) runs `frontend`, `backend` and `mongodb`. Only `frontend` publishes a port, on `127.0.0.1:${APP_PORT:-8081}`. MongoDB has no auth and no published port.
- `nginx/default.conf` is the config of the **frontend container**: it serves the SPA and proxies `/graphql` and `/mcp` to the backend.
- HTTPS is terminated by Cloudflare (or any TLS proxy in front of the host nginx). Agents send their API key to `/mcp`, so do not expose it over plain HTTP on the open internet.

## One-time VPS setup

1. Create `/opt/news`, owned by the `deploy` user.
2. Add a host nginx server block for `news.<domain>` that proxies to `http://127.0.0.1:8081` (copy the Event Manager one, change `server_name` and the port), enable it and reload nginx.
3. Add the DNS record for `news.<domain>` (proxied by Cloudflare).
4. Create `/opt/news/.env` if you need to override defaults: `APP_PORT`, `RATE_LIMIT_PER_MIN`. `IMAGE_PREFIX` is set by the deploy job.

## GitHub Actions

- `ci.yml` runs on pull requests and `main`: backend typecheck and tests, frontend lint and build.
- `deploy.yml` runs on push to `main` (not for `*.md`, `.agents/**`) or by hand: builds and pushes the backend and frontend images to GHCR, copies `docker-compose.yml` and `nginx/` to `/opt/news`, then `docker compose pull && up -d` over SSH and prunes dangling images only.
- Repository secrets: `VPS_HOST`, `VPS_USERNAME` (`deploy`), `VPS_SSH_KEY`, `GH_PAT` (GHCR push/pull, see Event Manager's `setup/github-pat-setup.md`).
- Never commit secrets, the VPS IP or personal emails.

## First API key on the server

```
cd /opt/news
docker compose exec backend node backend/dist/cli/apikey.js create "Claude routine"
```

Copy the printed `nwk_...` key into the agent's MCP config (see [agent-usage.md](agent-usage.md)). List or revoke with `list` / `revoke <id>`.

## Notes

- The feed itself (GraphQL `topics` and `articles`) is readable by anyone who can reach the site. Only writing news (`upsertArticles`, MCP) needs a key. If the feed must be private, put the site behind Cloudflare Access or similar.
- Data lives in the `news_mongodb_data` volume. Back it up with `docker compose exec mongodb mongodump --archive > news.archive`.
