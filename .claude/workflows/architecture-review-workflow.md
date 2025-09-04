# Architecture Review Workflow

**Location**: `.claude/workflows/architecture-review-workflow.md`  
**Purpose**: Guide main agent in coordinating architectural decisions across specialist agents

## When to Use This Workflow

### **Triggers**
- Major architectural changes needed
- Technical debt requiring systematic resolution
- Technology choice decisions (libraries, patterns, services)
- User requests like: "How should we fix the state synchronization issues?"

## Workflow Phases

### **Phase 1: Issue Analysis** (@architect - 30-45 min)
- Analyze current architecture and identify problems
- Research industry best practices and proven patterns
- Define evaluation criteria for potential solutions
- **Output**: Problem analysis and solution requirements

### **Phase 2: Alternative Research** (@architect + specialists - 45-60 min)
- **@architect**: Research architectural patterns and approaches
- **Domain specialists**: Provide implementation perspective for each alternative
- Evaluate 2-3 concrete alternatives with tradeoff analysis
- **Output**: Detailed alternatives with pros/cons/complexity

### **Phase 3: ADR Creation** (@architect - 30-45 min)
- Create ADR using `.claude/templates/adr-template.md`
- Document decision rationale and implementation plan
- Update `.claude/decisions/README.md` index
- **Output**: Complete ADR with implementation roadmap

### **Phase 4: Implementation Planning** (Domain specialists - 30-60 min each)
- **@frontend-developer**: UI/component implementation implications
- **@realtime-engineer**: Network/synchronization implementation details
- **@test-runner**: Testing strategy for architectural changes
- **Output**: Detailed implementation tasks and timeline

### **Phase 5: Validation** (@test-runner + @code-reviewer - 60-90 min)
- Create tests to validate architectural decisions work as intended
- Review implementation plan for quality and feasibility
- Establish monitoring and success metrics
- **Output**: Validation strategy and rollback plan

## Agent Coordination

### **Execution Pattern**
```
@architect (Analysis) → @architect + Specialists (Research) → 
@architect (ADR) → Domain Specialists (Planning) → Validation Team (Testing)
```

### **Dependencies**
- Phase 2 specialists need Phase 1 analysis complete
- Phase 3 ADR needs Phase 2 alternatives documented
- Phase 4 can run in parallel across specialists
- Phase 5 waits for Phase 4 completion

## Success Criteria

- **Decision Quality**: 3+ alternatives evaluated with clear tradeoffs
- **Documentation**: Complete ADR with implementation plan
- **Feasibility**: Implementation tasks estimated and resourced
- **Validation**: Tests and monitoring strategy defined

## Main Agent Orchestration

```markdown
# Task planning template:
User request: "[architecture issue]"

1. Start @architect for problem analysis (Phase 1)
2. Coordinate @architect + specialists for research (Phase 2)
3. @architect creates ADR (Phase 3)
4. Domain specialists plan implementation (Phase 4)
5. @test-runner + @code-reviewer validate approach (Phase 5)
```