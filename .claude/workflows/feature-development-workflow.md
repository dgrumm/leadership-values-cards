# Feature Development Workflow

**Location**: `.claude/workflows/feature-development-workflow.md`  
**Purpose**: Guide main agent in coordinating complete feature development across specialist agents

## When to Use This Workflow

### **Triggers**
- New feature implementation requests
- Spec-based development tasks
- Complex features requiring multiple agents
- User requests like: "Implement the reveal mechanism for Step 2"

## Workflow Phases

### **Phase 1: Requirements & Design** (@architect - 30-60 min)
- Analyze feature requirements from specs or user request
- Design system integration and data flow
- Identify technical dependencies and constraints
- **Output**: Feature design document and implementation plan

### **Phase 2: Infrastructure & Testing** (@test-runner - 45-60 min)
- Create test utilities and state injection for feature
- Build performance monitoring and debug capabilities
- Set up test data and scenarios
- **Output**: Testing infrastructure ready for development

### **Phase 3: Core Implementation** (Domain specialists - 90-180 min each)
- **@frontend-developer**: UI components, interactions, animations
- **@realtime-engineer**: WebSocket integration, synchronization
- **@architect**: System integration and business logic
- **Output**: Feature implementation with basic testing

### **Phase 4: Integration & Polish** (@code-reviewer + specialists - 60-90 min)
- Integrate components and resolve conflicts
- Performance optimization and accessibility review
- Error handling and edge case coverage
- **Output**: Production-ready feature implementation

### **Phase 5: Comprehensive Testing** (@test-runner - 45-90 min)
- Execute full test suite including new feature tests
- Multi-user and performance testing
- Integration with existing features validation
- **Output**: Tested and validated feature ready for deployment

## Agent Coordination

### **Execution Pattern**
```
@architect (Design) → @test-runner (Infrastructure) → 
Domain Specialists (Parallel Implementation) → Integration Team (Polish) → @test-runner (Validation)
```

### **Dependencies**
- Phase 2 needs design clarity from Phase 1
- Phase 3 needs testing infrastructure from Phase 2
- Phase 4 needs core implementation from Phase 3
- Phase 5 needs integrated feature from Phase 4

## Success Criteria

- **Completeness**: All spec requirements implemented and tested
- **Quality**: Code review passed, performance targets met
- **Integration**: Feature works with existing system
- **Testing**: >90% coverage, all scenarios validated

## Main Agent Orchestration

```markdown
# Task planning template:
User request: "[feature request]"

1. Start @architect for design and planning (Phase 1)
2. @test-runner builds testing infrastructure (Phase 2)
3. Coordinate specialists for parallel implementation (Phase 3)
4. Integration team polishes and optimizes (Phase 4)
5. @test-runner validates complete feature (Phase 5)
```