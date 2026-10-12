# News

Shows the news the user cares about (programming, running, ...). AI agents call an MCP server periodically to push news for a topic; the app stores it in the database and shows it in a web UI.

Rules live in `.agents/rules/`:
- [`tech-stack.md`](.agents/rules/tech-stack.md) — stack, kept in line with Event Manager
