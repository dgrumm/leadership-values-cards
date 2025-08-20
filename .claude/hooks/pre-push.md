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
# If push is initiated by the push-pr command (which already ran review), skip here.
if [ -n "${PUSH_PR_RUNNING:-}" ]; then
  echo "Detected push-pr flow; assuming reviewer already ran. Skipping pre-push review."
else
  # Preferred: project script
  if [ -x "./scripts/review.sh" ]; then
    ./scripts/review.sh --base "$BASE" --head HEAD --paths "$CHANGED" || REVIEW_EXIT=$?
  # Fallback: Claude CLI agent named 'code-reviewer'
  elif command -v claude >/dev/null 2>&1; then
    claude --agent "code-reviewer" --paths "$CHANGED" || REVIEW_EXIT=$?
  else
    echo "❌ No reviewer configured. Provide one of:"
    echo "   - ./scripts/review.sh (executable) that accepts --base/--head/--paths"
    echo "   - Claude CLI with an agent named 'code-reviewer'"
    echo "Aborting push to enforce review. Use PUSH_PR_RUNNING=1 if push-pr already ran review."
    exit 1
  fi
fi

lsREVIEW_EXIT=0

if [ "$REVIEW_EXIT" -ne 0 ]; then
  echo "❌ Review failed. Fix issues before pushing."; exit 1
fi

echo "✅ Review passed."; exit 0