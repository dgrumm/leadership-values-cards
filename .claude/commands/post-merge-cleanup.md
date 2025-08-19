---
name: post-merge-cleanup
description: After PR merge, sync main and remove merged feature branch (local + remote).
allowed-tools: [git, shell]
---

Steps:
1) Ask for the merged feature branch (default to current if on feature/*).
2) `git checkout main`
3) `git fetch origin && git pull --ff-only origin main`
4) `git branch -d <featureBranch>` (or `-D` if user confirms and not fully merged locally)
5) `git push origin --delete <featureBranch>`
6) Print next steps (tag/release optional, start next spec with /start-feature).