# .claude/commands/run-multiuser.md

```yaml
name: run-multiuser
description: Launch multiple browser instances to test real-time collaboration
match: multiuser|multi-user|test collaboration
```

Launch a multi-user testing environment:

1. Start the development server:
```bash
npm run dev
```

2. Open 3 browser instances with different profiles:
```bash
# Terminal 1 - User A (Facilitator)
npx playwright codegen http://localhost:3000 --viewport-size=1920,1080 --color-scheme=light

# Terminal 2 - User B (Participant)
npx playwright codegen http://localhost:3000 --viewport-size=1920,1080 --color-scheme=light --user-data-dir=/tmp/user-b

# Terminal 3 - User C (Observer)  
npx playwright codegen http://localhost:3000 --viewport-size=1920,1080 --color-scheme=light --user-data-dir=/tmp/user-c
```

3. Create test session:
- User A: Click settings → generates code "ABC123"
- User A: Enter name "Alice" → Join
- User B: Enter code "ABC123", name "Bob" → Join
- User C: Enter code "ABC123", name "Charlie" → Join

4. Test synchronization:
- Have users sort cards simultaneously
- Test reveal functionality at Step 2
- Verify viewer presence when viewing others' arrangements

This helps identify race conditions and sync issues.

---