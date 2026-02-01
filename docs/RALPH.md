# Ralph loop — agent instructions

This document is for the agent. It defines your role, inputs, outputs, and rules when running the Ralph loop in this repo.

## Your role

You work from a plan (PRD) and recent commit history. Each iteration you: pick the next incomplete task, implement it, run all feedback loops (fix any failures), tick off the PRD item, then commit with a progress summary in the commit message. One task per iteration.

## Inputs (read every iteration)

| File | Location | Use |
|------|----------|-----|
| PRD | `PRD.md` (repo root) | Source of tasks. Pick the next incomplete or highest-priority item. |
| Recent commits | `.ralph-recent-commits.txt` (repo root, last 10) | What was done recently. Do not redo completed work. |
| Project commands | `AGENTS.md` (repo root) | Scripts and conventions (e.g. `pnpm feedback`, `pnpm check`). |

## Outputs (each iteration)

1. **Code** — Implement exactly one task from the PRD.
2. **PRD** — Tick off the completed item (mark the checkbox `[x]`) before committing.
3. **Git** — One commit with your changes. Put what you did (progress summary) in the **commit message body**. Do not commit if any feedback loop fails.

## Rules

- **One task per iteration.** Do not start the next PRD item until the next run.
- **Feedback loops are mandatory before commit.** Run them in this order; fix any failure before committing:
  1. `pnpm run typecheck` — must pass (no TypeScript errors).
  2. `pnpm run convex:check` — must pass (Convex schema/backend valid).
  3. `pnpm run test` — must pass.
  4. `pnpm run lint` — must pass.
- **Do not commit if any of the above fail.** Fix the code, then re-run the failing step(s), then commit.
- **Browser verification (when the task involves UI):** After all feedback loops pass, run **Playwright e2e**: `pnpm run e2e`. This starts the dev server, runs headless browser tests in `e2e/`, and fails if the app is broken. Fix any e2e failures before committing. If you add UI that should be covered, add or update tests in `e2e/`. Optionally use Playwright MCP or Cursor browser MCP for manual checks when available.
- **Completion:** When the PRD has no remaining tasks, output exactly: `<promise>COMPLETE</promise>` (so the loop script can stop).

## Feedback loop commands (reference)

| Loop | Command | Must pass |
|------|----------|-----------|
| TypeScript | `pnpm run typecheck` | Yes |
| Convex | `pnpm run convex:check` | Yes |
| Tests | `pnpm run test` | Yes |
| Lint | `pnpm run lint` | Yes |
| E2E (UI tasks) | `pnpm run e2e` | Yes, when task involves UI |

All four core loops in one command: `pnpm run feedback`. For UI tasks, also run `pnpm run e2e` before committing.

## Iteration checklist (for you)

1. Read `PRD.md` and `.ralph-recent-commits.txt` (recent history).
2. Identify the next incomplete task.
3. Implement that task only.
4. Run `pnpm run typecheck` → fix if needed.
5. Run `pnpm run convex:check` → fix if needed.
6. Run `pnpm run test` → fix if needed.
7. Run `pnpm run lint` → fix if needed.
8. **If the task involves UI:** Run `pnpm run e2e`. Fix any failures. Add or update tests in `e2e/` if you changed UI that should be covered.
9. Tick off the completed PRD item in `PRD.md` (mark `[x]`).
10. Commit your changes with a progress summary in the commit message body.
11. If the PRD is now complete, output `<promise>COMPLETE</promise>`.

## Playwright e2e (Ralph-friendly)

Playwright runs headless in the Ralph loop and does **not** require Cursor browser MCP:

- **Command:** `pnpm run e2e`
- **Config:** `playwright.config.ts` (starts dev server via `webServer`, then runs tests).
- **Tests:** `e2e/smoke.spec.ts` — smoke tests for Daily view (page load, forms, sections). Extend this file when you add UI that should be verified automatically.

First-time setup: install browsers once with `pnpm exec playwright install chromium`.

## Playwright MCP (optional)

For interactive browser automation in Cursor (when MCP is available), you can enable the Playwright MCP server:

1. Copy `docs/mcp.playwright.example.json` into `.cursor/mcp.json` (create `.cursor` if needed), or add the same `mcpServers.playwright` entry to your existing `.cursor/mcp.json`.
2. Restart Cursor or reload MCP. The agent can then use Playwright MCP tools for manual browser checks.

This is **optional**; the Ralph loop relies on `pnpm run e2e` for UI verification.

## Cursor browser MCP (optional)

If Cursor browser MCP (cursor-ide-browser or cursor-browser-extension) is configured, you can use it for manual UI checks. The Ralph loop does **not** depend on it; use `pnpm run e2e` for mandatory UI verification.
