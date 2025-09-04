# Leadership Values Card Sort

Interactive card-sorting exercise for identifying core leadership values through progressive reduction (40→8→3 cards).

## Tech Stack
- **Frontend**: Next.js 14+, React 18, TypeScript
- **Styling**: Tailwind CSS + Framer Motion (animations)
- **Real-time**: Ably WebSockets
- **State**: Zustand (local), Ably (sync), React Query (server)
- **DnD**: @dnd-kit/sortable
- **Export**: html2canvas, jsPDF
- **Backend**: Next.js API routes + Express WebSocket server

## Project Structure
```
/app                 # Next.js app directory
  /api              # Session management, CSV loading
  /(auth)           # Login/session creation
  /canvas           # Main sorting interface
/components
  /cards            # Card, Deck, Pile components  
  /canvas           # DragLayer, DropZones
  /collaboration    # ParticipantList, PresenceCursors
  /ui               # Buttons, Modals, Progress
/hooks
  /collaboration    # useAbly, usePresence, useSession
  /stores           # useSessionStep1Store, useSessionStep2Store (session-scoped)
  /dnd              # useDragCard, useDropZone
/lib
  /stores           # SessionStoreManager, store factories
  /ably             # Channel setup, presence management
  /game-logic       # Shuffle, validation, step transitions
  /export           # Snapshot generation
/state
  /local            # Store factories (createStep1Store, createStep2Store, createStep3Store)
  /shared           # Ably-synced state (reveals, positions)
/data
  /csv              # Values card definitions
```

## Architectural Decisions

**ADR Process**: For significant technical decisions:
1. Check `.claude/decisions/` for existing ADRs
2. Use `.claude/templates/adr-template.md` for new decisions  
3. Always document rationale and alternatives considered
4. Reference ADRs in commit messages and PRs

**Decision Triggers**: Create ADR for:
- New architectural patterns or frameworks
- Significant refactoring approaches  
- Technology choices (libraries, services, patterns)
- State management strategy changes
- Performance optimization strategies

## Critical Patterns

### Real-time Sync
- Throttle cursor updates: 50ms
- Debounce card moves: 200ms  
- Separate channels: presence, reveals, viewers
- Optimistic UI with rollback on conflict

### State Architecture (CRITICAL)
**🚨 PRODUCTION BLOCKER**: Global Zustand stores cause state bleeding between participants
```typescript
// CURRENT BUG: Global stores shared between all users
const { deck, flipCard } = useStep1Store(); // BAD - same instance for all users

// REQUIRED FIX: Session-scoped stores per participant  
const { deck, flipCard } = useSessionStep1Store(sessionCode, participantId); // GOOD

// State Separation Rules:
// LOCAL (per-participant): UI state, step progress, card positions - NEVER synced
// SHARED (via Ably): Presence data, reveals, session metadata - synced
// DERIVED: Computed from local + shared without mutation
```

### Drag State Management  
```typescript
// Local: Immediate visual feedback
localDragState: { isDragging, draggedCard, previewPosition }
// Synced: Final positions after drop
sharedCardPositions: { cardId: { pile, index, owner } }
```

### Session Lifecycle
1. Generate 6-char code (ABC123 format)
2. First user creates Ably room
3. Participants join via code + name
4. 5min timeout with warning at 4min
5. Cleanup on last participant leave

## Visual Development

### Design Principles
- Comprehensive design checklist in `.claude/context/design-principles.md`
- Brand style guide in `.claude/context/style-guide.md`
- When making visual (front-end, UI/UX) changes, always refer to these files for guidance

### Quick Visual Check
IMMEDIATELY after implementing any front-end change:
1. **Identify what changed** - Review the modified components/pages
2. **Navigate to affected pages** - Use `mcp__playwright__browser_navigate` to visit each changed view
3. **Verify design compliance** - Compare against `/context/design-principles.md` and `/context/style-guide.md`
4. **Validate feature implementation** - Ensure the change fulfills the user's specific request
5. **Check acceptance criteria** - Review any provided context files or requirements
6. **Capture evidence** - Take full page screenshot at desktop viewport (1440px) of each changed view
7. **Check for errors** - Run `mcp__playwright__browser_console_messages`

This verification ensures changes meet design standards and user requirements.

### Comprehensive Design Review
Invoke the `@agent-design-review` subagent for thorough design validation when:
- Completing significant UI/UX features
- Before finalizing PRs with visual changes
- Needing comprehensive accessibility and responsiveness testing

### Animation Timings
- Card flip: 200-300ms ease-in-out
- Pile transition: 500ms ease-out
- Snap to pile: 200ms ease-out
- Bounce rejection: 400ms elastic
- Frame expansion: 500ms ease-out

## DO NOT
- **Never commit secrets or API keys** to the repository
- **NEVER use global stores** - use session-scoped stores: `useSessionStep1Store(sessionCode, participantId)`
- **NEVER use `useStep1Store()` directly** - causes state bleeding between participants
- Modify `/data/csv/` files directly (use make command)
- Commit to main branch
- Use localStorage/sessionStorage in components (memory only)
- Allow >8 cards in Top 8 pile (enforce in drop handler)
- Send card positions on every drag (only on drop)
- **NEVER skip testing** - all implementations must pass unit & E2E tests
- Modify existing tests to make them pass (fix implementation instead)
- Deploy or merge code with failing tests

## Key Commands
```bash
make dev          # Start Next.js + WebSocket server
make test:e2e     # Run Playwright tests
make build:csv    # Load new card deck CSV
make simulate     # Multi-user test environment

# Testing Commands (MANDATORY for all development)
npm run test:unit       # Jest unit tests
npm run test:e2e        # Playwright E2E tests  
npm run test:all        # All tests (unit + E2E)
npm run test:coverage   # Unit tests with coverage report
```


## Development Process
1. Use `/data/csv/development.csv` as local seed data for dev/test runs.
2. **Branching (strict):** ALWAYS create a feature branch BEFORE writing code.
    Branch: create `feature/<slug>` where `<slug>` is the spec **filename** (no extension), lowercased, spaces→`-`;
    Example: `/specs/01-foundation/01.1-data-models.md` → `feature/01-1-data-models`
   ```bash
   git checkout main && git pull
   git checkout -b feature/<slug>
   ```
3. Check /specs/ for feature requirements
4. Implement only the active spec's acceptance criteria (see /specs/)
5. Mark each acceptance criterion complete in the spec (checkboxes) as implemented
6. Update the memory bank at .claude/memory/project-decisions.md with key decisions, noting <date>-<slug>.
7. **MANDATORY TESTING PHASE**:
   - Run unit tests: `npm run test:unit`
   - Run E2E tests: `npm run test:e2e`
   - All tests MUST pass before proceeding
   - Fix any broken tests (implementation, not tests)
   - Use test-runner agent for complex test failures
8. ALWAYS run review before pushing or opening a PR
9. Open a PR to main titled feat(<slug>): <short description>; include:
  - Spec link
	- Acceptance criteria checklist (with ✅)
	- Test evidence (passing test runs)
	- Notes/decisions (link to memory file)

# MANDATORY DEVELOPMENT PRACTICES - VIOLATION = STOP IMMEDIATELY

## Test-First Debugging Protocol
1. **BEFORE ANY CHANGES**: Run `npm run test:unit` to establish baseline
2. **ONE CHANGE AT A TIME**: Never modify multiple systems simultaneously
3. **AFTER EACH CHANGE**: Run tests immediately to verify no regressions
4. **BROKEN TESTS = STOP**: If ANY test breaks, revert change immediately
5. **NO SPECULATION**: Debug from first principles, understand root cause before fixes
6. **RUN e2e TESTS**: Ensure front-end works as expected rather than relying on user manual testing, leverage e2e tests to get insights into browser console data. 

## Prohibited Practices
- ❌ Making multiple changes without testing each
- ❌ Adding new dependencies/files without explicit need
- ❌ Modifying test configurations during debugging
- ❌ "Fixing" symptoms without understanding root cause
- ❌ Continuing when tests break (STOP and revert)

## Multi-Agent Workflows

**Workflow Directory**: `.claude/workflows/` contains coordination processes for complex tasks

**Available Workflows**:
- `test-creation-workflow.md`: Test development across agents
- `architecture-review-workflow.md`: Architectural decision making
- `debugging-workflow.md`: Systematic bug investigation  
- `feature-development-workflow.md`: Complete feature implementation

**Usage**: Check workflows directory when users request complex tasks requiring multiple agents.

### Workflow Selection
User request pattern → Workflow to use
"Create tests for..." → test-creation-workflow.md
"How should we architect..." → architecture-review-workflow.md  
"Fix..." → debugging-workflow.md
"Implement [feature]" → feature-development-workflow.md

**PRODUCTION BLOCKER**
- ALWAYS verify changes by running tests successfully; don't move on when tests are failing without a VERY good reason

## Spec Status Key
- 🔴 Not Started
- 🟡 In Progress  
- 🟢 Complete
- 🔵 Tested

**Status**: Presence system ✅ complete, reveal card viewer ❌ 