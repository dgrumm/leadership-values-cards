---
name: push-pr
description: Push current branch and open a PR to main with a spec link and checklist.
allowed-tools: [git, shell]
---

# Behavior:
# - Refuse if on main.
# - Respect pre-push hook (review must pass).
# - Push with upstream; then create PR via gh if available, else print URL.

Steps:
1) Detect current branch. If "main", stop and ask to switch to feature/*.
2) `git push -u origin $(git branch --show-current)`
3) If `gh` exists:
   ```bash
   gh pr create \
     --base main \
     --head $(git branch --show-current) \
     --title "feat(<slug>): <short description>" \
     --body "Spec: <spec-path>\n\nAcceptance criteria:\n- [ ] ...\n\nTests:\n- ...\n\nNotes:\n- ..."
   ```