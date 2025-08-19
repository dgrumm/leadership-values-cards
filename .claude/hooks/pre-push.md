---
name: pre-push
description: Run automated review before any push; block on issues.
trigger: before_push
---

Determine base (tracking) branch, diff since base, run the reviewer, fail on blocking issues.

```bash
BASE=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null | cut -d/ -f2-)
if [ -z "$BASE" ]; then
  echo "No upstream tracking branch set. Use: git push -u origin HEAD (once), then retry."
  exit 1
fi

CHANGED=$(git diff --name-only "$BASE"...HEAD)
if [ -z "$CHANGED" ]; then
  echo "No changes to review."; exit 0
fi

echo "Running code review against $BASE..."
# TODO: replace with your actual reviewer invocation
# /code-reviewer --paths "$CHANGED"
REVIEW_EXIT=0

if [ "$REVIEW_EXIT" -ne 0 ]; then
  echo "❌ Review failed. Fix issues before pushing."; exit 1
fi

echo "✅ Review passed."; exit 0