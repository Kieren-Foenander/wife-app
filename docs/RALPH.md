# Ralph loop — agent instructions

This document is for the agent. It defines your role, inputs, outputs, and rules when running the Ralph loop in this repo.

## Your role

You work from a plan (PRD) and a progress file. Each iteration you: pick the next incomplete task, implement it, run all feedback loops (fix any failures), commit, then update progress. One task per iteration.

## Inputs (read every iteration)

| File | Location | Use |
|------|----------|-----|
| PRD | `PRD.md` (repo root) | Source of tasks. Pick the next incomplete or highest-priority item. |
| Progress | `progress.txt` (repo root) | What is already done. Do not redo completed work. |
| Project commands | `AGENTS.md` (repo root) | Scripts and conventions (e.g. `pnpm feedback`, `pnpm check`). |

## Outputs (each iteration)

1. **Code** — Implement exactly one task from the PRD.
2. **Progress file** — Append to `progress.txt` what you did (e.g. "Completed: …").
3. **Git** — One commit with your changes. Do not commit if any feedback loop fails.

## Rules

- **One task per iteration.** Do not start the next PRD item until the next run.
- **Feedback loops are mandatory before commit.** Run them in this order; fix any failure before committing:
  1. `pnpm run typecheck` — must pass (no TypeScript errors).
  2. `pnpm run convex:check` — must pass (Convex schema/backend valid).
  3. `pnpm run test` — must pass.
  4. `pnpm run lint` — must pass.
- **Do not commit if any of the above fail.** Fix the code, then re-run the failing step(s), then commit.
- **Browser verification (when the task involves UI):** After all feedback loops pass, use the **Cursor browser** MCP (cursor-ide-browser or cursor-browser-extension) to test the app as a real user. Start the dev server if needed (`pnpm run dev` — app at http://localhost:3000), then navigate, click, and verify the implemented feature. Fix any issues you find before committing.
- **Completion:** When the PRD has no remaining tasks, output exactly: `<promise>COMPLETE</promise>` (so the loop script can stop).

## Feedback loop commands (reference)

| Loop | Command | Must pass |
|------|----------|-----------|
| TypeScript | `pnpm run typecheck` | Yes |
| Convex | `pnpm run convex:check` | Yes |
| Tests | `pnpm run test` | Yes |
| Lint | `pnpm run lint` | Yes |

All four in one command: `pnpm run feedback`.

## Iteration checklist (for you)

1. Read `PRD.md` and `progress.txt`.
2. Identify the next incomplete task.
3. Implement that task only.
4. Run `pnpm run typecheck` → fix if needed.
5. Run `pnpm run convex:check` → fix if needed.
6. Run `pnpm run test` → fix if needed.
7. Run `pnpm run lint` → fix if needed.
8. **If the task involves UI:** Use the Cursor browser MCP to test the app as a user. Start `pnpm run dev` if needed; open http://localhost:3000; verify the feature. Fix any issues.
9. Commit your changes.
10. Append to `progress.txt` what you did.
11. If the PRD is now complete, output `<promise>COMPLETE</promise>`.

## Cursor browser (MCP)

You have access to the **Cursor browser** (cursor-ide-browser or cursor-browser-extension). Use it to:

- Navigate to the app (dev server: `pnpm run dev`, URL: http://localhost:3000).
- Interact with the UI as a user would (click, type, navigate).
- Verify that the feature you implemented works correctly before committing.

Run the Ralph loop from **Cursor’s terminal** so the agent inherits Cursor’s MCP config and can use the browser tools.
