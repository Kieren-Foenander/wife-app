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

PROMPT='@calories-section-prd.md @calorie-section-stories.md 
1.Read the calories prd and the stories that are available to complete. \
pickup the next story in the list to complete. \
based on what you understand about the prd and the ticket you are completing understand the codebase \
for what is required to be implemented and create a plan with tasks to complete the story. \
Then once you thoroughly understand what you are implementing and the implications of it complete the story to its acceptance criteria. \
Remember the acceptence criteria is a guide for what needs to be completed but does not necesarrily dictate everything \
that must be done and things may be missed so if the work requires additional work, \
first check it is not covered in another story and if not complete it within the same story. \
2. Before committing, run ALL feedback loops (do NOT commit if any fail): \
   - TypeScript: pnpm run typecheck (must pass with no errors) \
   - Convex: pnpm run convex:check (validates Convex backend; must pass) \
   - Tests: pnpm run test (must pass) \
   - Lint: pnpm run lint (must pass) \
   Fix any failures before committing. \
4. Before committing: tick off the completed PRD item in @calorie-section-stories.md  (mark the checkbox [x]). \
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
