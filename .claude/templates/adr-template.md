# ADR Template

Save this as: `.claude/templates/adr-template.md`

---

# ADR-XXX: [Title - Brief Description of Decision]

**Date**: YYYY-MM-DD  
**Status**: [Proposed | Accepted | Deprecated | Superseded]  
**Deciders**: [List of people involved in decision]  
**Technical Story**: [Link to issue/spec if applicable]

## Context

Brief description of the problem or situation that requires a decision.

### Current State
- What is the current architecture/approach?
- What problems are we experiencing?
- What constraints do we have?

### Requirements
- What must the solution accomplish?
- What are the non-functional requirements?
- What are the success criteria?

## Decision

The decision that was made and why.

### Chosen Solution
Clear statement of what we decided to do.

### Key Factors
- What were the most important considerations?
- Which requirements drove the decision?
- What assumptions are we making?

## Alternatives Considered

### Option 1: [Name]
**Description**: Brief description of alternative
**Pros**: 
- Benefit 1
- Benefit 2
**Cons**:
- Drawback 1
- Drawback 2
**Complexity**: [Low/Medium/High]
**Risk**: [Low/Medium/High]

### Option 2: [Name]
[Same format as Option 1]

### Option 3: [Name]
[Same format as Option 1]

## Trade-offs Analysis

| Criteria | Option 1 | Option 2 | Option 3 | Chosen |
|----------|----------|----------|----------|---------|
| Performance | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Maintainability | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| Implementation Speed | ⭐⭐⭐⭐ | ⭐⭐ | ⭐ | ⭐⭐⭐ |
| Team Expertise | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Long-term Flexibility | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

## Implementation Plan

### Phase 1: [Timeline]
- [ ] Task 1
- [ ] Task 2

### Phase 2: [Timeline]
- [ ] Task 3
- [ ] Task 4

### Rollback Strategy
- How can this decision be reversed if needed?
- What are the rollback triggers?

## Consequences

### Positive
- Benefit that we expect to achieve
- Problem that will be solved
- Capability that will be enabled

### Negative
- Downsides we accept
- Technical debt we're taking on
- Limitations we're introducing

### Neutral
- Changes that are neither positive nor negative
- Things we'll need to adapt to

## Monitoring & Success Metrics

### Key Performance Indicators
- Metric 1: Target value
- Metric 2: Target value

### Health Checks
- How will we know if this decision is working?
- What signals indicate we need to revisit?

### Review Schedule
- When should we reassess this decision?
- What conditions would trigger an earlier review?

## Related Decisions

- ADR-XXX: [Related decision]
- Links to other relevant ADRs

## References

- [Link to research, documentation, etc.]
- [External references that influenced the decision]

---

**Usage Instructions:**
1. Copy this template to `.claude/decisions/XXX-[slug].md`
2. Replace XXX with next sequential number
3. Fill in all sections thoroughly
4. Update the ADR index in `.claude/decisions/README.md`
5. Reference in commit messages: `feat: implement event sourcing (ADR-001)`