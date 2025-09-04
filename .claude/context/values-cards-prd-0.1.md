# Product Requirements Document: Digital Maxwell Values Cards

## 1. Executive Summary

### 1.1 Purpose
This document defines requirements for a web-based digital version of the Maxwell Values Cards exercise, enabling individuals and remote teams to identify and prioritize their core values through a structured, interactive process.

### 1.2 Vision
Create an engaging, accessible platform for values exploration that maintains the simplicity of the physical card exercise while leveraging digital capabilities for remote collaboration and easy sharing of results.

### 1.3 MVP Scope
- Desktop-first web application
- Single deck of 40 values cards
- 4-step guided reduction process
- Real-time collaboration for up to 50 participants
- Private sorting with manual reveal functionality
- Snapshot export capabilities

## 2. Core Exercise Flow

### 2.1 Guided Mode (4-Step Process)
The application follows the traditional Maxwell Values Cards exercise structure:

1. **Initial Sort**: Quickly separate all 40 cards into two stacks:
   - Stack A: "Most Important" values
   - Stack B: "Less Important" values

2. **First Reduction**: Reduce Stack A to top 8 values

3. **Second Reduction**: Reduce top 8 to top 5 values

4. **Final Reduction**: Reduce top 5 to top 3 values

### 2.2 Flexibility
While following the structured process, users maintain full control over:
- Card positioning and arrangement on canvas
- When to reveal their selections
- How to organize revealed cards for presentation

## 3. User Stories

### 3.1 Individual Participant
- **As a participant**, I need to drag and position value cards freely on my private canvas to organize my thoughts
- **As a participant**, I need to flip cards to see definitions when making decisions
- **As a participant**, I need to move cards between stacks as I refine my choices
- **As a participant**, I need to reveal selected stacks to my team when I'm ready
- **As a participant**, I need to arrange my revealed cards in any order/grouping I choose
- **As a participant**, I need to snapshot my values at any point for personal records

### 3.2 Team Member
- **As a team member**, I need to join a session using just my name
- **As a team member**, I need to see who else is in the session
- **As a team member**, I need to view others' revealed values when they choose to share
- **As a team member**, I need to zoom/focus on specific teammates' card arrangements

### 3.3 Session Creator
- **As a session creator**, I need to start a new session and share a join link
- **As a session creator**, I need to see participant progress (without seeing their private selections)

## 4. Functional Requirements

### 4.1 Card System

#### Card Design
- **Deck Size**: 40 values cards (provided via CSV)
- **Card Content**: 
  - Front: Value name + brief description
  - Back: Themed abstract design with optional "Leadership Values Cards" text overlay
- **Visual States**:
  - Face-up (showing value)
  - Face-down (showing back design)
  - Highlighted (on hover/selection)
  - Dimmed (when in discarded pile)

#### Card Data Structure
```csv
value_name,description
Integrity,"Acting in accordance with moral and ethical principles"
Innovation,"Finding new and creative ways to solve problems"
[... 38 more values]
```

### 4.2 Canvas & Interaction

#### Canvas Properties
- **Type**: Infinite canvas with pan and zoom capabilities
- **Layout**: Free-form positioning (no grid constraints)
- **Organization**: Users can stack, spread, or arrange cards however they prefer

#### Interactions
- **Drag**: Move cards to any position
- **Drop**: Place cards individually or in stacks
- **Click**: Flip card over
- **Double-click**: Show expanded definition popup
- **Right-click**: Quick actions menu (if applicable)
- **Multi-select**: Select multiple cards for batch operations

### 4.3 Privacy & Reveal System

#### Privacy Model
- Each participant has a private workspace
- All card sorting is hidden from others by default
- No indication of card positions or selections until reveal

#### Reveal Functionality
- Manual trigger by participant
- Selective reveal (choose specific stacks/arrangements)
- Revealed cards show:
  - Card faces with values
  - User's chosen arrangement/grouping
  - Optional ranking or priority order
- Once revealed, cannot be hidden again

### 4.4 Session Management

#### Session Lifecycle
- **Creation**: First user creates session, receives shareable link
- **Joining**: Participants enter name, no authentication required
- **Duration**: Auto-end after 60 minutes of inactivity
- **Capacity**: 1-50 participants (optimized for 5-10)

#### Session States
- Active: Participants actively sorting/revealing
- Idle: No activity for 5+ minutes (warning at 55 minutes)
- Ended: Session terminated, snapshot reminder shown

### 4.5 Export Capabilities

#### Snapshot Feature
- **Trigger**: Manual button/command
- **Formats**: 
  - JPG (quick share)
  - PDF (professional documentation)
- **Content**: Current canvas view with all visible cards
- **Storage**: Download only (no in-app persistence)

## 5. Non-Functional Requirements

### 5.1 Performance
- Support 50 concurrent users per session
- Smooth drag-and-drop at 60fps
- Real-time sync with <100ms latency for reveals
- Canvas operations remain smooth with 40+ cards visible

### 5.2 Compatibility
- **Primary**: Desktop browsers (Chrome, Firefox, Safari, Edge)
- **Screen Size**: Optimized for 1920x1080 and above
- **Not Required for MVP**: Mobile/tablet support

### 5.3 Accessibility
- Keyboard navigation for card selection/movement
- Screen reader support for card values/descriptions
- High contrast mode option
- Clear visual feedback for all interactions

## 6. Visual Design Requirements

### 6.1 Theme System

#### Default Theme: Liquid Glass
- Glassmorphism effects with subtle transparency
- Smooth gradients and soft shadows
- Modern, professional aesthetic
- Clean typography with good contrast

#### Additional Themes
V0 to generate 3-4 complementary trending options:
- Potential styles: Neomorphism, Flat Design, Material Design 3, Retro-futuristic
- Each theme maintains readability and professionalism
- Consistent interaction patterns across themes

### 6.2 Layout Structure
```
┌─────────────────────────────────────┐
│ Header: Session Info | Participants │
├─────────────────────────────────────┤
│                                     │
│         Main Canvas Area            │
│                                     │
│    (Individual/Team View)           │
│                                     │
├─────────────────────────────────────┤
│ Controls: Reveal | Snapshot | Zoom  │
└─────────────────────────────────────┘
```

## 7. Technical Considerations

### 7.1 Architecture (V0 to Determine)
- Real-time collaboration framework
- WebSocket or similar for live updates
- Client-side state management
- Efficient canvas rendering (Canvas API or WebGL)

### 7.2 Data Flow
- Minimal server-side storage (session data only)
- Client-side card positions and states
- Peer-to-peer or server-mediated sync for reveals

### 7.3 Security & Privacy
- No persistent user data storage
- Session data deleted after timeout
- No authentication required (by design)
- Optional session passwords for private groups

## 8. Success Metrics

### 8.1 User Engagement
- Average session completion rate >80%
- Time to complete exercise: 15-30 minutes
- Reveal rate: >90% of participants share results

### 8.2 Technical Performance
- Page load time <3 seconds
- Card drag latency <16ms
- Reveal sync time <100ms

## 9. Future Enhancements (Post-MVP)

### Phase 2 Considerations
- Mobile/tablet responsive design
- Multiple themed decks (leadership, personal, team values)
- Persistent user profiles and history
- Guided facilitation tools
- Custom card back designs
- Session recording/playback

### Phase 3 Possibilities
- AI-powered insights and value analysis
- Team alignment metrics
- Integration with HR/team tools
- Custom value sets
- Multi-language support
- Offline mode with sync

## 10. Implementation Notes for V0/Claude Code

### Key Implementation Patterns
1. **State Management**: Single source of truth for card positions
2. **Optimistic UI**: Immediate visual feedback, then sync
3. **Graceful Degradation**: Function without WebSockets if needed
4. **Progressive Enhancement**: Start simple, add polish iteratively

### Component Structure Suggestion
```
- App Container
  - Session Manager
  - Canvas Component
    - Card Component (×40)
    - Participant Areas
  - Control Panel
  - Participant List
  - Export Manager
```

### Critical Success Factors
- Smooth, responsive card manipulation
- Clear visual distinction between private/revealed states
- Intuitive reveal mechanism
- Professional snapshot exports
- Zero-friction session joining

## 11. Acceptance Criteria

### MVP Must-Haves
✅ 40 working value cards with descriptions  
✅ 4-step guided reduction process  
✅ Private sorting with manual reveal  
✅ Real-time multi-user support (up to 50)  
✅ Snapshot export (JPG/PDF)  
✅ Liquid glass theme + alternatives  
✅ Desktop browser support  

### MVP Nice-to-Haves
- Session pause/resume within 60 minutes
- Participant ready indicators
- Sound effects for card interactions
- Animated transitions for reveals
- Quick tutorial/onboarding

## 12. Glossary

- **Value Card**: Digital representation of a core value with name and description
- **Stack**: A group of cards placed together
- **Canvas**: The virtual workspace where cards are arranged
- **Reveal**: Making private card selections visible to other participants
- **Snapshot**: Exported image/PDF of current canvas state
- **Session**: A unique instance of the exercise with multiple participants
- **Guided Mode**: The structured 4-step reduction process

---

*This PRD is optimized for implementation with V0 and Claude Code, emphasizing clear requirements while allowing flexibility in technical implementation details.*