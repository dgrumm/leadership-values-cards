# ADR-001: Multi-User State Architecture for Session Isolation

**Status:** Proposed  
**Date:** 2025-01-05  
**Decision Makers:** Architecture Team  
**Technical Story:** Fix critical state bleeding between participants and establish robust multi-user synchronization

## Context and Problem Statement

The Leadership Values Card Sort application currently suffers from critical architectural flaws in its multi-user synchronization system that create production-blocking issues for collaborative sessions.

### Current State Assessment

**Existing Architecture:**
- **Global Zustand Stores**: Located in `/lib/stores/` creating singleton instances shared across all users
- **Session-Scoped Wrapper Hooks**: `useSessionStep1Store`, `useSessionStep2Store` exist but aren't consistently used
- **Ably Integration**: Real-time sync through presence events and shared channels
- **Dual State Systems**: Local Zustand state + Ably-synced shared state with unclear boundaries

### Critical Issues Identified

#### 1. **State Bleeding Between Participants** (PRODUCTION BLOCKER)

**Evidence**: Documentation explicitly identifies the issue:
```typescript
// CURRENT BUG: Global stores shared between all users
const { deck, flipCard } = useStep1Store(); // BAD - same instance for all users
```

**Impact:**
- Participants see each other's card selections and progress
- UI state changes affect all users in the session  
- Race conditions during simultaneous user interactions

#### 2. **Dual State System Complexity**

**Issue**: Two separate state management systems (Zustand + Ably) with unclear boundaries
- Local state: UI interactions, card positions, step progress
- Ably state: Presence, reveals, session metadata
- No clear reconciliation strategy for conflicts

#### 3. **Inconsistent State Scoping**

**Evidence**: Mixed patterns throughout codebase
- Some components use direct global store access
- Session-scoped wrappers exist but aren't universally adopted
- No enforcement mechanism preventing global store usage

#### 4. **Real-time Sync Coordination Issues**

**Problem**: Lack of conflict resolution for concurrent operations
- "Optimistic UI with rollback on conflict" mentioned but implementation unclear
- No operational transform or CRDT patterns for conflict resolution

## Decision Drivers

- **User Experience**: Each participant must have isolated, reliable state
- **Data Consistency**: Shared state must synchronize reliably without conflicts
- **Performance**: Local interactions must remain responsive
- **Scalability**: Architecture must support multiple concurrent sessions
- **Maintainability**: Clear separation of concerns between local and shared state
- **Testing**: Predictable, isolated test scenarios

## Considered Options

### Option 1: Hybrid State Architecture with Clear Boundaries (RECOMMENDED)

**Three-Layer State Architecture:**

**Layer 1: Participant-Scoped Local State (Zustand)**
```typescript
interface ParticipantLocalState {
  // UI-only state, never synced
  selectedCards: CardId[];
  currentStep: number;
  dragState: DragState;
  uiPreferences: UIPreferences;
}
```

**Layer 2: Session-Shared State (Ably + Event Sourcing)**
```typescript
interface SessionSharedState {
  // Synced across all participants
  sessionMetadata: SessionMetadata;
  participantPresence: PresenceMap;
  cardReveals: RevealState;
  publicCardPositions: PublicPositions; // only revealed cards
}
```

**Layer 3: Coordination Layer (Event-Driven)**
```typescript
interface CoordinationEvents {
  'card.revealed': { cardId: CardId, participantId: string };
  'step.completed': { participantId: string, step: number };
  'session.phase_changed': { newPhase: SessionPhase };
}
```

**Pros:**
- Clear boundaries eliminate confusion about sync vs local state
- Prevents state bleeding through true participant isolation
- Maintains performance by keeping UI state local
- Enables offline-first capabilities
- Supports proper conflict resolution through event coordination
- Builds on existing session-scoped infrastructure

**Cons:**
- Requires systematic refactoring of existing components
- Additional complexity in coordination layer
- Need to implement event-driven patterns

### Option 2: Full CRDT Implementation

**Description**: Replace state management with Conflict-free Replicated Data Types

**Pros:**
- Automatic conflict resolution for concurrent operations
- Strong consistency guarantees
- Industry-standard approach for collaborative applications

**Cons:**
- Over-engineering for current scale (typically 2-6 users)
- Significant implementation complexity and learning curve
- Library dependencies increase maintenance burden
- Current conflict scenarios are limited and well-defined

### Option 3: Single Source of Truth (Ably-Only)

**Description**: Move all state management to Ably channels, eliminating local state

**Pros:**
- Single consistent state source
- Simplified synchronization logic
- Natural conflict resolution through server ordering

**Cons:**
- Network latency impacts UI responsiveness
- Loss of offline capabilities
- Inefficient for real-time cursor movement and drag previews
- Local UI state still needed for animations and interactions

## Decision Outcome

**Chosen Option**: Option 1 - Hybrid State Architecture with Clear Boundaries

### Rationale

1. **Builds on Existing Infrastructure**: Leverages existing session-scoped store system
2. **Addresses Root Cause**: Eliminates state bleeding through proper isolation
3. **Maintains Performance**: Keeps UI interactions responsive with local state
4. **Scalable Solution**: Clear patterns support multiple concurrent sessions
5. **Incremental Implementation**: Can be implemented in phases without breaking existing functionality

## Implementation Plan

### Phase 1: State Boundary Enforcement (Days 1-3)

**Immediate Actions:**
- [ ] Audit all components for direct global store usage
- [ ] Replace `useStep1Store()` with `useSessionStep1Store(sessionCode, participantId)`
- [ ] Add TypeScript interfaces to enforce state boundaries
- [ ] Implement store access guards to prevent global store usage

**Acceptance Criteria:**
- No components directly import global stores
- All participant state is accessed through session-scoped stores
- TypeScript compilation enforces proper store usage

### Phase 2: Event-Driven Coordination (Days 4-7)

**Implementation Tasks:**
- [ ] Implement coordination event system for cross-participant operations
- [ ] Replace direct shared state mutations with event dispatch
- [ ] Add conflict resolution for concurrent operations (card reveals, step transitions)
- [ ] Implement rollback mechanisms for failed operations

**Acceptance Criteria:**
- All shared state changes go through event system
- Concurrent operations resolve predictably
- Failed operations roll back properly

### Phase 3: Testing & Validation (Days 8-10)

**Testing Requirements:**
- [ ] Unit tests for store isolation between participants
- [ ] Integration tests for multi-user synchronization scenarios
- [ ] Performance testing for sync operations
- [ ] End-to-end tests for complete user workflows

**Acceptance Criteria:**
- 90%+ test coverage for multi-user synchronization
- All tests pass consistently
- Performance benchmarks meet requirements

### Phase 4: Monitoring & Documentation (Days 11-14)

**Final Tasks:**
- [ ] Add performance monitoring for sync operations
- [ ] Document state architecture patterns
- [ ] Create troubleshooting guides for sync issues
- [ ] Implement automated alerts for state inconsistencies

## Success Metrics

### Technical Success Criteria
- **State Isolation**: No participant can access another's local state
- **Sync Reliability**: Shared state changes propagate within 100ms
- **Conflict Resolution**: Concurrent operations resolve predictably without data loss
- **Performance**: No degradation in single-user experience
- **Test Coverage**: 90%+ coverage for multi-user scenarios

### User Experience Success Criteria
- **Functionality**: Card selections, progress, and UI state remain isolated per participant
- **Real-time Features**: Presence indicators, card reveals work reliably
- **Session Stability**: Multiple participants work simultaneously without interference
- **Error Recovery**: Sessions recover gracefully from network issues

## Monitoring and Validation

### Development Phase Validation
```bash
# Audit current global store usage
grep -r "useStep.*Store()" app/ components/ --include="*.tsx"

# Validate migration completeness  
grep -r "from.*step.*Store" app/ components/ --include="*.tsx"
```

### Production Monitoring
- Track participant state isolation metrics
- Monitor session synchronization performance
- Alert on state bleeding incidents (should be zero)
- User feedback on session reliability

## Consequences

### Positive Consequences
- **Eliminates Production Blocker**: Fixes critical state bleeding issue
- **Improved Reliability**: Predictable multi-user behavior
- **Better Testing**: Isolated, repeatable test scenarios
- **Cleaner Architecture**: Clear separation of local vs shared state
- **Scalability**: Supports unlimited concurrent sessions

### Negative Consequences
- **Implementation Effort**: Requires systematic refactoring across components
- **Temporary Complexity**: Components need session context (sessionCode, participantId)
- **Testing Updates**: Existing tests may need updates for session context

### Neutral Consequences
- **Performance**: Minimal overhead for session-scoped stores
- **Real-time Features**: No impact on existing Ably integration
- **User Experience**: Fixes bugs without changing user-facing functionality

## Follow-up Actions

### Immediate (Next Sprint)
- Begin Phase 1 implementation
- Create migration checklist with all affected components
- Set up TypeScript/ESLint rules to prevent regression

### Short-term (Next Month)
- Complete full implementation
- Add comprehensive test suite
- Performance optimization based on metrics

### Long-term (Future Quarters)
- Consider advanced conflict resolution patterns if needed
- Evaluate state persistence for session recovery
- Plan horizontal scaling architecture

## Related Decisions

- **Future ADR needed**: Real-time conflict resolution strategy for complex scenarios
- **Future ADR needed**: Session persistence and recovery mechanisms  
- **Future ADR needed**: Performance optimization for large sessions

## References

- Current codebase analysis (2025-01-05)
- CLAUDE.md architectural documentation
- Existing session-scoped store infrastructure (`/lib/stores/SessionStoreManager.ts`)
- Production issue reports of state bleeding
- Multi-user collaboration best practices research