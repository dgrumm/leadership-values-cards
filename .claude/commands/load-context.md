# .claude/commands/load-context.md

```yaml
name: load-context
description: Load context for specific spec or feature
match: context|load context|resume
```

```bash
#!/bin/bash
# Usage: /load-context 02.3 (loads spec 02.3)
# Usage: /load-context full (loads PRD + current status)

SPEC=$1

if [ "$SPEC" = "full" ]; then
  echo "=== FULL CONTEXT LOAD ==="
  cat /prd/values-cards-prd-0.2.md
  echo -e "\n=== CURRENT STATUS ==="
  cat specs/status.md
elif [ -n "$SPEC" ]; then
  echo "=== LOADING SPEC $SPEC ==="
  find specs -name "${SPEC}*.md" -exec cat {} \;
  echo -e "\n=== RELATED DECISIONS ==="
  grep -A 5 "Spec: $SPEC" .claude/memory/project-decisions.md
else
  echo "=== CURRENT STATUS ==="
  cat specs/status.md
fi
```