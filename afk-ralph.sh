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

PROMPT='@PRD.md @.ralph-recent-commits.txt @AGENTS.md @docs/RALPH.md \
1. Read the PRD and the recent commit history (.ralph-recent-commits.txt). Find the highest-priority incomplete task and implement it. \
2. Before committing, run ALL feedback loops (do NOT commit if any fail): \
   - TypeScript: pnpm run typecheck (must pass with no errors) \
   - Convex: pnpm run convex:check (validates Convex backend; must pass) \
   - Tests: pnpm run test (must pass) \
   - Lint: pnpm run lint (must pass) \
   Fix any failures before committing. \
3. If the task involves UI: use the Cursor browser MCP to test the app as a user (pnpm run dev, then open http://localhost:3000 and verify). Fix any issues. \
4. Before committing: tick off the completed PRD item in PRD.md (mark the checkbox [x]). \
5. Commit your changes. Write what you did (progress summary) IN THE COMMIT MESSAGE body—do not use a progress file. \
ONLY WORK ON A SINGLE TASK. \
If the PRD is complete, output <promise>COMPLETE</promise>.'

for ((i=1; i<=$1; i++)); do
  echo "=== Ralph iteration $i/$1 ==="
  git log -10 --format="%h %s%n%b" > .ralph-recent-commits.txt
  result=$(agent -p --force --output-format text "$PROMPT" || true)
  echo "$result"

  if [[ "$result" == *"<promise>COMPLETE</promise>"* ]]; then
    echo "PRD complete after $i iterations."
    exit 0
  fi
done

echo "Reached $1 iterations. Run again with more iterations if the PRD is not complete."
