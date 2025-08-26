---
name: pre-commit
description: Comprehensive quality checks before any commit
trigger: before_commit
---

**MANDATORY PRE-COMMIT TESTING PIPELINE**

Before committing changes, ALL checks must pass:

## 1. Type Safety & Code Quality
```bash
echo "🔍 Checking TypeScript compilation..."
npx tsc --noEmit
if [ $? -ne 0 ]; then echo "❌ TypeScript errors found"; exit 1; fi

echo "🧹 Running ESLint with auto-fix..."
npx eslint . --fix
if [ $? -ne 0 ]; then echo "❌ Linting errors found"; exit 1; fi
```

## 2. Comprehensive Test Suite
```bash
echo "🧪 Running unit tests..."
npm run test:unit
if [ $? -ne 0 ]; then echo "❌ Unit tests failed"; exit 1; fi

echo "🎭 Running E2E tests..."
npm run test:e2e
if [ $? -ne 0 ]; then echo "❌ E2E tests failed"; exit 1; fi

echo "📊 Checking test coverage..."
npm run test:coverage -- --passWithNoTests
if [ $? -ne 0 ]; then echo "❌ Coverage threshold not met"; exit 1; fi
```

## 3. Security & Performance
```bash
echo "🔐 Checking for exposed secrets..."
grep -r "ABLY_KEY\|localhost:3000\|sk_\|pk_" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=.next . && {
  echo "❌ Secrets detected in code"
  exit 1
}

echo "📦 Validating build..."
npm run build
if [ $? -ne 0 ]; then echo "❌ Build failed"; exit 1; fi
```

## 4. Test Quality Checks  
```bash
echo "🎯 Checking for test-only/skip statements..."
grep -r "test\.only\|test\.skip\|describe\.only\|describe\.skip" tests/ && {
  echo "❌ Found focused or skipped tests"
  exit 1
}
```

**All checks passed! ✅ Safe to commit.**

---