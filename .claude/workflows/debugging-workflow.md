# Debugging Workflow

**Location**: `.claude/workflows/debugging-workflow.md`  
**Purpose**: Guide main agent in coordinating systematic bug investigation and resolution

## When to Use This Workflow

### **Triggers**
- Production bugs or critical issues reported
- Intermittent test failures that need investigation
- Performance problems requiring analysis
- User requests like: "The state synchronization is flip-flopping between values"

## Workflow Phases

### **Phase 1: Issue Reproduction** (@test-runner - 30-45 min)
- Use Playwright to reproduce the issue reliably
- Capture browser console logs, network activity, DOM state
- Create minimal reproduction case
- **Output**: Reliable reproduction steps and debug evidence

### **Phase 2: Evidence Analysis** (@test-runner - 15-30 min)
- Analyze console logs for patterns and error messages
- Review network requests/responses for timing issues
- Extract performance metrics and timing data
- **Output**: Structured evidence with initial analysis

### **Phase 3: Root Cause Analysis** (@architect + domain specialist - 45-60 min)
- **@architect**: System-level analysis of evidence
- **Domain specialist**: Deep dive into relevant subsystem
- Identify root cause and contributing factors
- **Output**: Root cause identification with supporting evidence

### **Phase 4: Solution Implementation** (Domain specialist - 60-120 min)
- Design and implement fix based on root cause
- Ensure fix addresses the core issue, not just symptoms
- Test fix against reproduction case
- **Output**: Working fix with verification

### **Phase 5: Regression Prevention** (@test-runner - 30-45 min)
- Create automated test based on reproduction case
- Add monitoring/alerting to detect similar issues
- Validate fix doesn't break existing functionality
- **Output**: Regression test and monitoring

## Agent Coordination

### **Execution Pattern**
```
@test-runner (Reproduction) → @test-runner (Evidence) → 
@architect + Specialist (Root Cause) → Specialist (Fix) → @test-runner (Prevention)
```

### **Dependencies**
- Phase 2 needs reliable reproduction from Phase 1
- Phase 3 needs structured evidence from Phase 2
- Phase 4 needs root cause understanding from Phase 3
- Phase 5 needs working fix from Phase 4

## Success Criteria

- **Reproduction**: Issue can be triggered reliably in <5 attempts
- **Evidence**: Complete browser logs, network traces, performance data
- **Understanding**: Clear root cause with supporting evidence
- **Resolution**: Fix addresses root cause and passes regression test

## Main Agent Orchestration

```markdown
# Task planning template:
User request: "[bug report]"

1. Start @test-runner to reproduce and capture evidence (Phases 1-2)
2. Coordinate @architect + relevant specialist for analysis (Phase 3)
3. Domain specialist implements fix (Phase 4)
4. @test-runner creates regression prevention (Phase 5)
```