# Test Creation Workflow

**Location**: `.claude/workflows/test-creation-workflow.md`  
**Purpose**: Guide main agent in coordinating test creation across specialist agents

## When to Use This Workflow

### **Triggers**
- New feature needs test coverage
- Bug reports require regression tests  
- Performance requirements need validation
- User requests like: "Create tests for Step 2→3 transition"

## Workflow Phases

### **Phase 1: Requirements** (@architect - 15-30 min)
- Analyze what behavior needs testing
- Define test scope (unit/integration/E2E)
- Identify performance targets and constraints
- **Output**: Test requirements specification

### **Phase 2: Infrastructure** (@test-runner - 30-60 min)  
- Create state injection utilities for fast setup
- Build debug monitoring and evidence collection
- Generate spec-compliant test data
- **Output**: Test utilities for other agents to use

### **Phase 3: Implementation** (Domain specialists - 45-90 min each)
- **@frontend-developer**: UI interactions, animations, accessibility
- **@realtime-engineer**: Multi-user sync, network reliability  
- **@architect**: End-to-end integration scenarios
- **Output**: Working test suites

### **Phase 4: Quality Review** (@code-reviewer - 30-45 min)
- Validate test coverage and reliability
- Review code quality and maintainability  
- Ensure integration without conflicts
- **Output**: Quality assessment and recommendations

## Agent Coordination

### **Execution Pattern**
```
@architect (Requirements) → @test-runner (Infrastructure) → 
Domain Specialists (Parallel Implementation) → @code-reviewer (Review)
```

### **Dependencies**
- Phase 2 must complete before Phase 3
- All Phase 3 agents can work in parallel
- Phase 4 waits for all implementations

## Success Criteria

- **Speed**: Complete test suite creation in <3 hours
- **Coverage**: >90% for new code, all user workflows covered  
- **Reliability**: >95% pass rate, <2% flaky tests
- **Performance**: State injection <500ms, full suite <10 minutes

## Main Agent Orchestration

```markdown
# Task planning template:
User request: "[test request]"

1. Start @architect for requirements (Phase 1)
2. Then @test-runner for infrastructure (Phase 2)  
3. Coordinate domain specialists in parallel (Phase 3)
4. Finally @code-reviewer for quality validation (Phase 4)
```