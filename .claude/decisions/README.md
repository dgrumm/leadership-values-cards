# Architecture Decision Records (ADRs)

This directory contains all architectural decisions for the Leadership Values Card Sort project.

## ADR Index

| ADR | Title | Status | Date | Impact |
|-----|-------|--------|------|--------|
| [001](001-multi-user-state-architecture.md) | Multi-User State Architecture for Session Isolation | Proposed | 2025-01-05 | High |

## Quick Reference

### By Status
- **Accepted**: 0 ADRs
- **Proposed**: 1 ADR  
- **Draft**: 0 ADRs
- **Deprecated**: 0 ADRs

### By Impact Level
- **High Impact**: Major architectural changes affecting multiple components
- **Medium Impact**: Significant changes to specific subsystems
- **Low Impact**: Local optimizations or minor pattern choices

### By Category
- **State Management**: ADR-001
- **Real-time Features**: (none yet)  
- **Testing Strategy**: (none yet)
- **Performance**: (none yet)
- **Security**: (none yet)

## Usage Guidelines

### Creating a New ADR
1. Use next sequential number: `XXX-descriptive-slug.md`
2. Copy from `.claude/templates/adr-template.md`
3. Fill out all sections completely
4. Add entry to this index
5. Reference in relevant commits

### ADR Lifecycle
- **Draft**: Initial thinking, not yet decided
- **Proposed**: Ready for review and decision
- **Accepted**: Decision made, implementation may be ongoing
- **Deprecated**: No longer valid, superseded by newer ADR

### Review Process
- Technical decisions should be reviewed by relevant agents
- High-impact ADRs should be discussed before acceptance
- All ADRs should be updated when circumstances change

## Related Documentation

- `.claude/memory/project-decisions.md` - Historical implementation decisions
- `.claude/templates/` - Decision-making templates
- `/specs/` - Feature specifications that may reference ADRs

---

**Last Updated**: 2025-01-05  
**Next ADR Number**: 002