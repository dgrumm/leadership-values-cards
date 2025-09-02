# Testing Requirements & Standards

## Mandatory Testing Policy

**CRITICAL**: All code changes MUST pass comprehensive testing before merge/deployment.

### Test Categories Required

#### 1. Unit Tests (Jest)
- **Location**: `/tests/unit/`
- **Command**: `npm run test:unit`
- **Coverage**: Minimum 80% for new code
- **Scope**: Components, hooks, utilities, stores

#### 2. Integration Tests (Jest)
- **Location**: `/tests/integration/`
- **Command**: `npm run test:unit` (included)
- **Scope**: API endpoints, form flows, data flow

#### 3. E2E Tests (Playwright)
- **Location**: `/tests/e2e/`
- **Command**: `npm run test:e2e`
- **Scope**: Complete user journeys, cross-browser compatibility

### Test-First Development

1. **Before Implementation**: Check existing tests that should pass
2. **During Implementation**: Run relevant test subset frequently
3. **After Implementation**: Full test suite must pass
4. **Before Commit**: Pre-commit hook runs critical tests
5. **Before PR**: All tests must pass

### Test Types by Feature Area

#### Core Flow Testing
- Login/session creation
- Step 1 (flip cards, drag to piles)
- Step 2 (select top 8, constraints)
- Step 3 (select top 3, final arrange)
- Export functionality

#### Interaction Testing
- Drag-drop mechanics with animations
- Pile constraint enforcement (8-card limit)
- Card flip animations and timing
- Touch/mobile gesture support

#### Collaboration Testing (Future)
- Multi-user real-time sync
- Presence indicators
- Reveal mechanisms
- Session management

#### Visual Regression Testing
- UI consistency across browsers
- Animation smoothness
- Responsive design breakpoints
- Theme consistency

### Agent Usage for Testing

#### test-runner Agent
- **Use When**: Tests failing after implementation
- **Purpose**: Analyze failures, fix implementation (not tests)
- **Scope**: E2E test debugging, multi-user scenarios

#### code-reviewer Agent  
- **Use When**: Before PR submission
- **Purpose**: Review test coverage, test quality
- **Scope**: Test architecture, missing test cases

### Test Environment Setup

#### Local Development
```bash
# Start dev server with test data
npm run dev

# Run tests in watch mode
npm run test:watch

# Run E2E with UI for debugging
npm run test:e2e:ui
```

#### CI/CD Requirements
- All unit tests must pass
- All E2E tests must pass  
- Coverage threshold: 80%
- No test skips (`test.skip`) allowed
- No debug-only tests (`test.only`) allowed

### Test Data Management

#### Development Data
- Use `/data/csv/development.csv` for consistent test scenarios
- Isolated test sessions with unique codes
- Mock external dependencies (Ably, exports)

#### Test Fixtures
- Page object models in `/tests/e2e/page-objects/`
- Shared test utilities in `/tests/e2e/utils/`
- Reusable test data in `/tests/e2e/fixtures/`

### Debugging Failed Tests

#### Step-by-Step Process
1. **Analyze Error**: Read full error message and stack trace
2. **Identify Root Cause**: Implementation bug vs. timing issue
3. **Fix Implementation**: Never modify tests to make them pass
4. **Verify Fix**: Re-run specific failing test
5. **Full Suite**: Run complete test suite to check regressions

#### Common Issues & Solutions
- **Timing Issues**: Use proper `waitFor` conditions, not timeouts
- **Animation Conflicts**: Ensure animations complete before assertions
- **State Management**: Clear state between tests
- **Network Issues**: Mock external calls, use test data

### Test Performance Standards

#### Acceptable Execution Times
- Unit tests: <5 seconds total
- Integration tests: <30 seconds total  
- E2E tests: <2 minutes per spec
- Full test suite: <5 minutes total

#### Optimization Techniques
- Parallel test execution where safe
- Shared browser contexts for E2E
- Efficient test data setup/teardown
- Smart test ordering (fast tests first)

### Specification Testing

#### Requirement Traceability
- Each spec acceptance criteria → test case
- Critical paths must have E2E coverage
- Edge cases must have unit test coverage
- Error scenarios must be tested

#### Test Documentation in Specs
```markdown
## Test Cases
### AC1: User can flip cards one at a time
- **Unit Test**: `Card.test.ts` - flip animation triggers
- **E2E Test**: `drag-drop-step1.spec.ts` - full flip sequence
- **Expected**: Card reveals value, updates count, prevents double-flip
```

### Quality Gates

#### Pre-Implementation
- [ ] Review existing relevant tests
- [ ] Identify test gaps for new feature
- [ ] Plan test coverage approach

#### Implementation
- [ ] Unit tests pass continuously
- [ ] Integration points tested
- [ ] Error handling tested

#### Pre-Commit
- [ ] Full unit test suite passes
- [ ] Critical E2E tests pass
- [ ] No test skips or focus-only tests
- [ ] TypeScript compilation clean

#### Pre-Merge
- [ ] All tests pass in clean environment
- [ ] Test coverage meets threshold
- [ ] No flaky tests identified
- [ ] Performance benchmarks maintained

---

**Remember**: Tests are not obstacles - they're confidence builders. Good tests catch bugs early and enable fearless refactoring.

---

## Event-Driven Architecture Testing Protocol

### TDD Mandatory for Event System Migration

**CRITICAL**: Event architecture changes MUST follow strict Test-Driven Development.

#### Red-Green-Refactor Cycle Requirements

**RED Phase** (Write Failing Tests First):
- Write comprehensive test for expected behavior BEFORE any implementation
- Test must fail for the right reason (missing implementation, not syntax error)
- Include edge cases, error scenarios, and integration points
- Target 100% test coverage for all event system components

**GREEN Phase** (Minimal Implementation):
- Implement ONLY enough code to make the failing test pass
- No additional features or "nice-to-have" functionality
- Focus on making tests pass with simplest possible implementation
- Verify test passes and no existing tests break

**REFACTOR Phase** (Clean Up):
- Improve code quality without changing functionality
- Extract reusable utilities, optimize performance
- Ensure all tests still pass after refactoring
- Update documentation if architecture patterns change

#### Event System Testing Strategy

**Phase 1: Event Foundation (Test-First)**
```typescript
// 1. RED: Write event validation tests
describe('BaseEvent', () => {
  it('should validate required event properties', () => {
    expect(() => createEvent({})).toThrow('Missing required fields')
  })
})

// 2. GREEN: Implement BaseEvent validation
// 3. REFACTOR: Extract validation utilities
```

**Phase 2: EventBus Integration (Test-First)**
```typescript
// 1. RED: Write Ably integration tests with mocks
describe('EventBus', () => {
  it('should publish events to correct Ably channel', async () => {
    await eventBus.publish(stepEvent)
    expect(mockAblyChannel.publish).toHaveBeenCalledWith('STEP_TRANSITIONED', stepEvent)
  })
})

// 2. GREEN: Implement EventBus with Ably
// 3. REFACTOR: Add error handling, performance optimizations
```

**Phase 3: State Integration (Test-First)**
```typescript
// 1. RED: Write state reducer tests
describe('sessionReducer', () => {
  it('should update participant step on StepTransitionedEvent', () => {
    const result = sessionReducer(initialState, stepTransitionEvent)
    expect(result.currentStep['participant-123']).toBe(2)
  })
})

// 2. GREEN: Implement event reducers
// 3. REFACTOR: Optimize state update performance
```

#### Mandatory Test Gates

**Before Any Implementation**:
- [ ] Write failing test for expected behavior
- [ ] Verify test fails for correct reason
- [ ] Run existing test suite to establish baseline

**After Each Implementation**:
- [ ] Verify new test passes
- [ ] Verify NO existing tests break
- [ ] Run full test suite to check for regressions

**Before Moving to Next Feature**:
- [ ] All unit tests pass (100%)
- [ ] Integration tests pass for component
- [ ] Performance tests meet <50ms criteria
- [ ] Memory leak tests pass (no timer/subscription leaks)

#### Test Categories for Event Architecture

**1. Event Type Tests (Unit)**
- Event validation and serialization
- TypeScript type checking
- Event ID generation and uniqueness
- Timestamp and version handling

**2. EventBus Tests (Integration)**  
- Ably channel integration with mocks
- Event publishing and subscription
- Error handling and reconnection
- Message ordering and deduplication

**3. State Reducer Tests (Unit)**
- Event → state transformation logic
- Optimistic update handling
- Conflict resolution scenarios
- State validation and consistency

**4. Component Integration Tests (E2E)**
- Step transitions work across participants
- Zero flip-flopping behavior
- <50ms latency requirements
- Real-time consistency validation

#### Test-First Development Discipline

**NEVER Code Without Tests**:
- Every single function must have tests before implementation
- No implementation code without failing test first
- No "quick fixes" without corresponding tests
- No commits until all tests pass

**Mandatory Test Coverage**:
- 100% function coverage for event system
- 100% branch coverage for critical paths
- Edge case coverage for all error scenarios  
- Performance test coverage for latency requirements

**Quality Gates (All Must Pass)**:
- Unit tests: All event components, <5 seconds execution
- Integration tests: Ably mocks, error scenarios, <30 seconds execution
- E2E tests: Multi-participant scenarios, race condition validation, <2 minutes per spec
- Performance tests: <50ms latency, memory leak validation

*Last Updated: 2025-09-01*
*Critical Priority: Event-Driven Architecture TDD Implementation*