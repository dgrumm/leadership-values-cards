# Test Creation Workflow

**Location**: `.claude/workflows/test-creation-workflow.md`  
**Purpose**: Guide main agent in coordinating test creation across specialist agents

## When to Use This Workflow

### **Triggers for Test Creation**
- New feature implementation requires test coverage
- Bug reports that need regression tests
- Performance requirements that need validation
- Architectural changes (referenced in ADRs) that need verification

### **User Request Patterns**
```markdown
# Examples that should trigger this workflow:
"We need tests for the Step 2→3 transition"
"Create tests to verify the 8-card constraint"  
"Add multi-user sync tests for card movements"
"Test the new state injection utilities"
```

## Workflow Steps

### **Phase 1: Requirements Analysis** 
**Agent**: @architect  
**Duration**: 15-30 minutes  
**Deliverables**: Test requirements specification

#### **Actions**:
1. **Analyze User Request**: What behavior needs testing?
2. **Review Existing Tests**: Check `/tests/` for coverage gaps
3. **Define Test Scope**: Unit, integration, or E2E requirements
4. **Identify Constraints**: Performance targets, browser support, user scenarios
5. **Create Test Requirements**: Specific acceptance criteria for testing

#### **Output Format**:
```markdown
## Test Requirements for [Feature]

### Scope
- [ ] Unit tests for individual components
- [ ] Integration tests for feature workflow  
- [ ] E2E tests for complete user scenarios
- [ ] Performance tests for speed/reliability

### Acceptance Criteria
1. Test X behavior under Y conditions
2. Validate Z constraint with A, B, C scenarios
3. Verify performance target of N ms/operations

### Dependencies
- Requires state injection utilities from @test-runner
- Needs UI interaction patterns from @frontend-developer  
- Multi-user scenarios require @realtime-engineer input
```

### **Phase 2: Infrastructure Preparation**
**Agent**: @test-runner  
**Duration**: 30-60 minutes  
**Deliverables**: Test utilities and infrastructure

#### **Actions**:
1. **Review Test Requirements**: Understand what infrastructure is needed
2. **Create State Injection Utilities**: Fast setup for test scenarios
3. **Build Debug Monitoring**: Console capture, performance tracking
4. **Generate Test Data**: Spec-compliant session codes, participant names, card decks
5. **Optimize Test Performance**: Parallel execution, smart waiting strategies

#### **Output Format**:
```typescript
// Test utilities for other agents to use
export async function injectStep2State(config: Step2Config): Promise<void> { ... }
export async function setupMultiUserSession(participants: string[]): Promise<void> { ... }
export async function captureDebugEvidence(page: Page): Promise<DebugReport> { ... }
```

### **Phase 3: Feature-Specific Test Implementation**
**Agents**: Domain specialists (@frontend-developer, @realtime-engineer)  
**Duration**: 45-90 minutes per specialist  
**Deliverables**: Working test suites

#### **Frontend Developer Actions**:
1. **UI Interaction Tests**: Button clicks, drag-drop, form inputs
2. **Component Behavior Tests**: State changes, prop handling, event triggers
3. **Animation Tests**: Timing, smoothness, accessibility
4. **Accessibility Tests**: Keyboard navigation, screen reader support

#### **Realtime Engineer Actions**:
1. **Multi-User Tests**: Concurrent actions, conflict resolution
2. **Network Reliability Tests**: Disconnection, reconnection scenarios
3. **Performance Scaling Tests**: Load testing with multiple users
4. **Synchronization Tests**: State consistency across participants

### **Phase 4: Integration & Quality Review**
**Agent**: @code-reviewer  
**Duration**: 30-45 minutes  
**Deliverables**: Test quality assessment and recommendations

#### **Actions**:
1. **Review Test Coverage**: Ensure requirements are fully covered
2. **Assess Test Quality**: DRY principles, maintainability, performance
3. **Validate Test Reliability**: Consistent execution, proper cleanup
4. **Integration Testing**: Verify tests work together without conflicts

## Agent Coordination Patterns

### **Sequential Execution** (Default)
```mermaid
graph TD
    A[@architect: Define Requirements] --> B[@test-runner: Build Infrastructure]
    B --> C[@frontend-developer: UI Tests]
    B --> D[@realtime-engineer: Sync Tests] 
    C --> E[@code-reviewer: Quality Review]
    D --> E
```

### **Parallel Execution** (When Independent)
```mermaid
graph TD
    A[@architect: Define Requirements] --> B[@test-runner: Build Infrastructure]
    B --> C[@frontend-developer: UI Tests]
    B --> D[@realtime-engineer: Sync Tests]
    B --> F[@architect: Integration Tests]
    C --> E[@code-reviewer: Review All]
    D --> E
    F --> E
```

## Main Agent Orchestration

### **Task Planning Template**
```markdown
# Main agent internal reasoning:
User request: "[test request]"

1. **Workflow Selection**: This requires test-creation-workflow.md
2. **Agent Coordination**: 
   - Start with @architect for requirements (Phase 1)
   - Then @test-runner for infrastructure (Phase 2)  
   - Parallel @frontend-developer + @realtime-engineer (Phase 3)
   - Finally @code-reviewer for quality (Phase 4)
3. **Success Criteria**: All phases complete, tests pass, coverage adequate
```

### **Progress Tracking**
```markdown
## Test Creation Progress: [Feature Name]

### Phase 1: Requirements ✅ 
- @architect completed test specification
- Requirements documented in /specs/ or as comment
- Dependencies identified for infrastructure phase

### Phase 2: Infrastructure 🔄 
- @test-runner building state injection utilities
- Debug monitoring setup in progress
- ETA: 30 minutes

### Phase 3: Implementation ⏸️
- Waiting for infrastructure completion
- @frontend-developer and @realtime-engineer ready

### Phase 4: Review ⏸️  
- @code-reviewer will review once implementation complete
```

## Success Metrics

### **Workflow Efficiency**
- **Total Time**: <3 hours for complete test suite creation
- **Agent Handoffs**: Smooth transitions, minimal rework
- **Test Quality**: >95% pass rate, <2% flaky tests

### **Coverage Targets**
- **Unit Tests**: >90% line coverage for new code
- **Integration Tests**: All major user workflows covered
- **E2E Tests**: Complete user journeys functional
- **Performance Tests**: All performance targets validated

### **Deliverable Quality**
- **Spec Compliance**: Test data matches exact specifications
- **Fast Execution**: State injection <500ms, full suite <10 minutes
- **Reliable Results**: Consistent test outcomes across runs

## Troubleshooting

### **Common Issues**
1. **Agent Dependencies**: @test-runner infrastructure not ready for implementers
   - **Solution**: Ensure Phase 2 complete before starting Phase 3

2. **Conflicting Test Approaches**: Different agents create overlapping tests
   - **Solution**: @architect requirements phase should prevent overlap

3. **Performance Issues**: Tests too slow or unreliable
   - **Solution**: @test-runner optimization should address before implementation

4. **Coverage Gaps**: Missing edge cases or error scenarios
   - **Solution**: @code-reviewer should catch and request additions

## Integration with Other Workflows

### **Related Workflows**
- **architecture-review-workflow.md**: When tests validate architectural decisions
- **debugging-workflow.md**: When tests help investigate issues
- **feature-development-workflow.md**: When tests are part of feature implementation

### **ADR Integration**
- Tests that validate ADR decisions should reference ADR number
- ADR acceptance criteria should include testability requirements
- Test creation may trigger need for new ADRs about testing approaches