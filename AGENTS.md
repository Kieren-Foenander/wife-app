# AGENTS.md

This is a todo list application built with TanStack Start, React 19, and Convex as the backend/database.

This project uses pnpm workspaces.

Non-standard commands:
- `pnpm deploy` - Builds and deploys to Cloudflare using Wrangler
- `pnpm check` - Formats and lints (runs prettier --write and eslint --fix)
- `pnpm typecheck` - TypeScript check (tsc --noEmit)
- `pnpm convex:check` - Validates Convex backend (convex codegen)
- `pnpm feedback` - Runs typecheck, convex:check, test, and lint (Ralph feedback loops)

For React patterns and conventions, see `docs/REACT.md`. For Convex conventions, see `.cursorrules`. For running a Ralph loop with Cursor Agent CLI, see `docs/RALPH.md`.

Be extremely concise. Sacrifice grammar for the sake of concision.
