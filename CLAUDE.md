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
  /dnd              # useDragCard, useDropZone
/lib
  /ably             # Channel setup, presence management
  /game-logic       # Shuffle, validation, step transitions
  /export           # Snapshot generation
/state
  /local            # Zustand stores (UI, drag state)
  /shared           # Ably-synced state (reveals, positions)
/data
  /csv              # Values card definitions
```

## Critical Patterns

### Real-time Sync
- Throttle cursor updates: 50ms
- Debounce card moves: 200ms  
- Separate channels: presence, reveals, viewers
- Optimistic UI with rollback on conflict

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
4. 60min timeout with warning at 55min
5. Cleanup on last participant leave

### Animation Timings
- Card flip: 200-300ms ease-in-out
- Pile transition: 500ms ease-out
- Snap to pile: 200ms ease-out
- Bounce rejection: 400ms elastic
- Frame expansion: 500ms ease-out

## DO NOT
- **Never commit secrets or API keys** to the repository
- Modify `/data/csv/` files directly (use make command)
- Commit to main branch
- Use localStorage/sessionStorage in components (memory only)
- Allow >8 cards in Top 8 pile (enforce in drop handler)
- Send card positions on every drag (only on drop)

## Key Commands
```bash
make dev          # Start Next.js + WebSocket server
make test:e2e     # Run Playwright tests
make build:csv    # Load new card deck CSV
make simulate     # Multi-user test environment
```

## Development Process
1. Use /data/csv/development.csv during development
2. Check /specs/ for feature requirements
3. Implement based on spec acceptance criteria
4. Mark spec items complete as implemented
5. Update memory bank with key decisions
6. Run tests from spec test cases

## Spec Status Key
- 🔴 Not Started
- 🟡 In Progress  
- 🟢 Complete
- 🔵 Tested

## Current Focus
Building Step 1-3 card sorting flow with proper animations and pile constraints. WebSocket integration pending.