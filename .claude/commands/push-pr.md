---
name: push-pr
description: Push current feature branch and open a PR to main; runs @reviewer first.
allowed-tools: [git, shell]
---

# Behavior
# - Refuse if on main.
# - Determine base for diff: upstream tracking branch if set, else origin/main.
# - Run the @reviewer agent on changed files; fail on non-zero exit.
# - Export PUSH_PR_RUNNING=1 so the git pre-push hook (if present) skips duplicate review.
# - Push with upstream; then open PR via GitHub CLI if available, else print a URL hint.

Steps:
1) Detect current branch. If "main", stop and ask to switch to feature/*.
2) Determine BASE (upstream branch or origin/main) and the changed file list.
3) Run @reviewer against the changed files. Abort on failure.
4) Push with upstream (PUSH_PR_RUNNING=1 to skip hook duplication).
5) Create PR with `gh pr create --fill` (falls back to a manual URL if `gh` is missing).

Shell:
```bash
set -euo pipefail

BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "main" ]; then
  echo "Refusing to push from main. Switch to a feature/* branch."; exit 1
fi

# Determine base for comparison
UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || true)
if [ -z "$UPSTREAM" ]; then
  echo "No upstream set; will compare against origin/main."
  git fetch origin main:refs/remotes/origin/main >/dev/null 2>&1 || true
  BASE="origin/main"
else
  BASE=$(echo "$UPSTREAM" | awk -F/ '{print $2}')
fi

# List changed files
CHANGED=$(git diff --name-only "$BASE"...HEAD)
if [ -z "$CHANGED" ]; then
  echo "No changes to review."
else
  echo "Running @reviewer on changes since $BASE …"
  if command -v claude >/dev/null 2>&1; then
    # Prefer an agent named exactly 'reviewer'; fall back to 'code-reviewer'
    if claude --agent "reviewer" --paths "$CHANGED"; then
      true
    elif claude --agent "code-reviewer" --paths "$CHANGED"; then
      true
    else
      echo "❌ @reviewer reported blocking issues."; exit 1
    fi
  elif [ -x "./scripts/review.sh" ]; then
    ./scripts/review.sh --base "$BASE" --head HEAD --paths "$CHANGED"
  else
    echo "❌ No reviewer configured. Install Claude CLI or provide ./scripts/review.sh."; exit 1
  fi
fi

# Push; mark that review already ran to let pre-push skip duplicate work
export PUSH_PR_RUNNING=1
git push -u origin "$BRANCH"

# Open PR
if command -v gh >/dev/null 2>&1; then
  # Try to infer a slug from the branch (feature/<slug>)
  SLUG=$(echo "$BRANCH" | sed -E 's#^feature/##')
  gh pr create --base main --head "$BRANCH" --title "feat(${SLUG}): initial PR" --fill || true
  gh pr view --web || true
else
  echo "Open a PR from $BRANCH → main on your remote host (GitHub/GitLab)."
fi

echo "✅ Pushed and PR created (if gh available)."
```