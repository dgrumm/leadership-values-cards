# ADR-004: Canvas Layout Architecture Decision

**Date**: 2025-01-05  
**Status**: Accepted  
**Author**: Design Review Analysis  
**Relates to**: ADR-003 (Design Review), Spec 06.1 (Layout Redesign)

## Context

The Leadership Values Card Sort application required a fundamental layout architecture decision between two approaches:
1. **Canvas Layout**: 2D spatial workspace mimicking physical card sorting on a table
2. **Horizontal Progression**: Left-to-right workflow with sequential step progression

This decision impacts the core user experience, technical architecture, and scalability across devices.

## Decision

**We will implement the Canvas Layout architecture** for the following reasons:

### Primary Rationale

**Cognitive Authenticity**: The canvas layout directly mirrors how people naturally think about and organize values in physical card-sorting exercises. Users expect to:
- Spread cards across a surface
- Create spatial clusters before formal categorization  
- Use proximity to represent relationships and importance
- Maintain visual context of all decisions simultaneously

**Spatial Intelligence Utilization**: Research in decision science shows people use spatial positioning to represent:
- Importance (proximity to center or special areas)
- Relationships (visual clustering indicates connection)
- Uncertainty (distance from committed piles)
- Emotional resonance (physical placement reflects internal prioritization)

**Non-Linear Decision Support**: Value clarification is inherently iterative and reflective. The canvas supports:
- Easy backtracking and reconsideration
- Parallel processing of multiple value clusters
- Natural rhythm of exploration → grouping → narrowing → finalizing

### UX Analysis Summary

| Aspect | Canvas Layout | Horizontal Progression |
|--------|---------------|----------------------|
| Cognitive Load | Lower - spatial memory utilization | Higher - sequential processing burden |
| Decision Pattern | Supports natural value-sorting behavior | Forces artificial workflow constraints |
| User Control | Full agency over exploration rhythm | Prescribed step-by-step progression |
| Context Retention | All stages visible simultaneously | Previous decisions become invisible |

### Technical Considerations

**Scalability Strategy**:
- **Desktop** (Primary): Full canvas experience with rich spatial interactions
- **Tablet** (Secondary): Adapted canvas with gesture-friendly touch interactions  
- **Mobile** (Acceptable limitation): Consider focused companion experience or exclusion

**Architecture Impact**:
- Maintains current flexible component architecture
- Supports existing Framer Motion animation system
- Aligns with drag-and-drop interaction patterns already implemented

## Alternatives Considered

### Horizontal Progression Layout
**Advantages**:
- Better responsive behavior across devices
- Clearer step-by-step progression guidance
- Potentially simpler mobile implementation

**Disadvantages**:
- Conflicts with natural card-sorting cognitive patterns
- Increases working memory load by hiding previous context
- Feels like "digital workflow" rather than thoughtful reflection tool
- Artificially constrains the exploratory nature essential to values work

### Hybrid Approach
**Considered**: Toggle between canvas and progression modes
**Rejected**: Adds complexity without solving core UX concerns, risks fragmenting the experience

## Implementation Guidance

### Design Principles
- Design the canvas to feel like a **collaborative workspace** rather than a formal process
- Include visual affordances that reinforce the "thinking space" metaphor
- Use natural card behaviors and organic spatial flows
- Maintain visual hierarchy while preserving spatial freedom

### Animation & Interactions
- Preserve existing card flip and transition animations (200-300ms)
- Add spatial snap-to-pile behaviors (200ms ease-out)
- Include constraint violation feedback with bounce animations (400ms elastic)
- Support gesture-based interactions for tablet experience

### Responsive Strategy
- Optimize primarily for desktop experience (1440px+ viewports)
- Adapt canvas proportions and touch targets for tablet (768px-1439px)
- Consider simplified mobile companion or graceful exclusion (<768px)

## Consequences

### Positive
- ✅ Authentic card-sorting experience that leverages natural cognitive patterns
- ✅ Supports iterative, reflective decision-making process
- ✅ Maintains user agency and exploration freedom
- ✅ Aligns with existing technical architecture
- ✅ Preserves what makes card sorting uniquely valuable as a values clarification tool

### Negative  
- ⚠️ Mobile implementation complexity (mitigated by acceptable exclusion strategy)
- ⚠️ May require tablet-specific interaction adaptations
- ⚠️ Less conventional than step-by-step workflow patterns

### Neutral
- 📋 Requires clear spatial affordances to guide new users
- 📋 Must balance freedom with appropriate constraints and feedback
- 📋 Success depends on thoughtful implementation of spatial interaction patterns

## References

- ADR-003: Comprehensive Design Review Analysis
- `.claude/context/design-principles.md` - Spatial relationship guidelines
- UX research on spatial cognition and decision-making interfaces
- Existing drag-and-drop architecture in codebase

## Next Actions

1. Update remaining specifications to align with canvas layout approach
2. Implement spatial affordances and visual workspace metaphors
3. Optimize tablet touch interactions and gesture support
4. Conduct user testing to validate cognitive alignment assumptions