#!/bin/bash
# AFK Ralph loop: runs the agent repeatedly until PRD is complete or max iterations.
# Uses Cursor Agent CLI (no Docker). Linux.

set -e
cd "$(dirname "$0")"

if [ -z "$1" ]; then
  echo "Usage: $0 <iterations>"
  echo "Example: $0 20"
  exit 1
fi

PROMPT='@PRD.md @progress.txt @AGENTS.md @docs/RALPH.md \
1. Find the highest-priority task and implement it. \
2. Before committing, run ALL feedback loops (do NOT commit if any fail): \
   - TypeScript: pnpm run typecheck (must pass with no errors) \
   - Convex: pnpm run convex:check (validates Convex backend; must pass) \
   - Tests: pnpm run test (must pass) \
   - Lint: pnpm run lint (must pass) \
   Fix any failures before committing. \
3. If the task involves UI: use the Cursor browser MCP to test the app as a user (pnpm run dev, then open http://localhost:3000 and verify). Fix any issues. \
4. Update the PRD with what was done. \
5. Append your progress to progress.txt. \
6. Commit your changes. \
ONLY WORK ON A SINGLE TASK. \
If the PRD is complete, output <promise>COMPLETE</promise>.'

for ((i=1; i<=$1; i++)); do
  echo "=== Ralph iteration $i/$1 ==="
  result=$(agent -p --force --output-format text "$PROMPT" || true)
  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete after $i iterations."
    exit 0
  fi
done

echo "Reached $1 iterations. Run again with more iterations if the PRD is not complete."
