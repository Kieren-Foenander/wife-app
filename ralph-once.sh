#!/bin/bash
# Human-in-the-loop Ralph: run once, watch, then run again.
# Uses Cursor Agent CLI (no Docker). Linux.

set -e
cd "$(dirname "$0")"

PROMPT='@PRD.md @progress.txt @AGENTS.md @docs/RALPH.md \
1. Read the PRD and progress file. \
2. Find the next incomplete task and implement it. \
3. Before committing, run ALL feedback loops (do NOT commit if any fail): \
   - TypeScript: pnpm run typecheck (must pass with no errors) \
   - Convex: pnpm run convex:check (validates Convex backend; must pass) \
   - Tests: pnpm run test (must pass) \
   - Lint: pnpm run lint (must pass) \
   Fix any failures before committing. \
4. Commit your changes. \
5. Update progress.txt with what you did. \
ONLY DO ONE TASK AT A TIME.'

agent -p --force --output-format text "$PROMPT"
