# .claude/hooks/pre-commit.md

```yaml
name: pre-commit
description: Runs before any code changes to ensure quality
trigger: before_commit
```

Before committing changes, ensure:

1. **Type Safety**: No TypeScript errors
```bash
npx tsc --noEmit
```

2. **Linting**: Code follows standards
```bash
npx eslint . --fix
```

3. **Critical Tests**: Core functionality works
```bash
npm run test:e2e -- --grep="@critical"
```

4. **Performance**: Check bundle size
```bash
npx next build
npx @next/bundle-analyzer
```

5. **Security**: No exposed keys
```bash
grep -r "ABLY_KEY\|localhost:3000" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules
```

Abort commit if any check fails.

---