#!/bin/bash
# Human-in-the-loop Ralph: run once, watch, then run again.
# Uses Cursor Agent CLI (no Docker). Linux.

set -e
cd "$(dirname "$0")"

# Pipe last 10 commit messages into a file the agent reads (replaces progress.txt)
git log -10 --format="%h %s%n%b" > .ralph-recent-commits.txt

PROMPT='@PRD.md @.ralph-recent-commits.txt @AGENTS.md @docs/RALPH.md \
1. Read the PRD and the recent commit history (.ralph-recent-commits.txt). \
2. Find the next incomplete task and implement it. \
3. Before committing, run ALL feedback loops (do NOT commit if any fail): \
   - TypeScript: pnpm run typecheck (must pass with no errors) \
   - Convex: pnpm run convex:check (validates Convex backend; must pass) \
   - Tests: pnpm run test (must pass) \
   - Lint: pnpm run lint (must pass) \
   Fix any failures before committing. \
4. If the task involves UI: use the Cursor browser MCP to test the app as a user (pnpm run dev, then open http://localhost:3000 and verify). Fix any issues. \
5. Before committing: tick off the completed PRD item in PRD.md (mark the checkbox [x]). \
6. Commit your changes. Write what you did (progress summary) IN THE COMMIT MESSAGE body—do not use a progress file. \
ONLY DO ONE TASK AT A TIME.'

agent -p --force --output-format text "$PROMPT"
