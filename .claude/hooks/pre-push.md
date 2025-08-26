---
name: pre-push
description: Comprehensive validation & review before pushing to remote
trigger: before_push
---

**COMPREHENSIVE PRE-PUSH VALIDATION**

Combined code review + testing safety checks:

```bash
echo "🚀 Starting pre-push validation pipeline..."

## 1. Branch Protection
current_branch=$(git symbolic-ref --short HEAD)
if [ "$current_branch" = "main" ]; then
  echo "❌ Direct push to main branch blocked"
  echo "💡 Use feature branches: git checkout -b feature/your-feature"  
  exit 1
fi

## 2. Clean Environment Testing
echo "🧪 Running comprehensive test suite..."

# Clear caches and run fresh tests
npm run test:unit -- --clearCache --watchAll=false --passWithNoTests
if [ $? -ne 0 ]; then echo "❌ Unit tests failed"; exit 1; fi

npm run test:e2e -- --workers=1  
if [ $? -ne 0 ]; then echo "❌ E2E tests failed"; exit 1; fi

echo "📊 Validating test coverage..."
npm run test:coverage -- --passWithNoTests
if [ $? -ne 0 ]; then echo "❌ Coverage threshold not met"; exit 1; fi

## 3. Build Validation
echo "📦 Validating production build..."
rm -rf .next
npm run build
if [ $? -ne 0 ]; then echo "❌ Production build failed"; exit 1; fi

## 4. Code Review Process  
BASE=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null | cut -d/ -f2-)
if [ -z "$BASE" ]; then
  echo "⚠️  No upstream tracking branch set"
  echo "💡 Use: git push -u origin HEAD (once), then retry"
  exit 1
fi

CHANGED=$(git diff --name-only "$BASE"...HEAD)
if [ -n "$CHANGED" ]; then
  echo "🔍 Running code review against $BASE..."
  
  # Skip review if already run by push-pr command
  if [ -n "${PUSH_PR_RUNNING:-}" ]; then
    echo "✅ Detected push-pr flow; skipping duplicate review"
  else
    # Run code review
    if [ -x "./scripts/review.sh" ]; then
      ./scripts/review.sh --base "$BASE" --head HEAD --paths "$CHANGED" || REVIEW_EXIT=$?
    elif command -v claude >/dev/null 2>&1; then
      claude --agent "code-reviewer" --paths "$CHANGED" || REVIEW_EXIT=$?
    else
      echo "⚠️  No reviewer configured - manual review recommended"
    fi
    
    if [ "${REVIEW_EXIT:-0}" -ne 0 ]; then
      echo "❌ Code review failed. Fix issues before pushing"
      exit 1
    fi
  fi
fi

## 5. Test Quality Validation
echo "🎯 Final test quality checks..."
grep -r "test\.only\|test\.skip\|describe\.only\|describe\.skip" tests/ && {
  echo "❌ Found focused or skipped tests - remove before pushing"
  exit 1
}

echo "✅ All pre-push validations passed! Safe to push 🚀"
```

---