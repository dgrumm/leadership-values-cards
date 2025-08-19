---
name: start-feature
description: Create feature branch from a spec and propose an implementation plan.
allowed-tools: [git, filesystem, shell]
---

# Input: spec path under /specs (e.g., specs/01-foundation/01.2-x.md)
# Behavior:
# 1) Derive <slug> from the spec FILENAME (no extension):
#    - lowercase; spaces → '-', remove punctuation .:,\'"/()&+
# 2) Branch: feature/<slug> from main (append -YYYYMMDD if it exists)
# 3) Print: active branch, file tree plan, test matrix, open questions. STOP (no file writes).

If no spec path provided, ask for it and validate it exists.

Commands:
```bash
git checkout main && git pull
git checkout -b feature/<slug> || git checkout -b feature/<slug>-$(date +%Y%m%d)
```