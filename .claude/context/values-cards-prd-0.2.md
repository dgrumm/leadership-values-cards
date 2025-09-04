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
The application follows a structured card reveal and sorting experience:

#### Step 1: Initial Card Discovery & Sort
- User begins with a single face-down deck of 40 cards
- **Interaction Pattern**:
  - Click/flip one card at a time from the deck
  - Read the value and description
  - Drag card to either:
    - Stack A: "Most Important" values
    - Stack B: "Less Important" values
- Continue until all 40 cards are sorted
- System prompts to proceed to Step 2 when deck is empty

#### Step 2: First Reduction (Top 8)
- User works with their "Most Important" stack
- **Interaction Pattern**:
  - Spread cards across canvas to view all simultaneously
  - Select 8 cards to keep
  - Click "Done" to confirm selection
  - Review, sort, and arrange the selected 8 cards
- **Options after completing**:
  - Take Snapshot (save current state)
  - Reveal (share with team)
  - Proceed (continue to next step)

#### Step 3: Second Reduction (Top 5)
- Reduce the 8 cards to top 5 values
- Same interaction pattern as Step 2
- Same completion options (Snapshot/Reveal/Proceed)

#### Step 4: Final Reduction (Top 3)
- Reduce the 5 cards to top 3 values
- Final arrangement and presentation
- Typical reveal point for team sessions

### 2.2 Flexibility
While following the structured process, users maintain control over:
- Pace of card flipping and decision-making
- Card positioning and arrangement on canvas
- When to reveal their selections (after any step)
- How to organize revealed cards for presentation

## 3. User Stories

### 3.1 Individual Participant
- **As a participant**, I need to flip cards one at a time from the initial deck to thoughtfully consider each value
- **As a participant**, I need to drag each flipped card to my chosen stack (Most/Less Important)
- **As a participant**, I need to spread out my important cards to compare them when making reductions
- **As a participant**, I need clear confirmation when I've selected my cards for each step
- **As a participant**, I need the option to snapshot, reveal, or proceed after each reduction step
- **As a participant**, I need to arrange my final cards in any order/grouping I choose for presentation

### 3.2 Team Member
- **As a team member**, I need to join a session using just my name
- **As a team member**, I need to see who else is in the session
- **As a team member**, I need to complete my sorting privately at my own pace
- **As a team member**, I need to view others' revealed values when they choose to share
- **As a team member**, I need to zoom/focus on specific teammates' card arrangements

### 3.3 Session Creator
- **As a session creator**, I need to start a new session and share a join link
- **As a session creator**, I need to see participant progress (which step they're on) without seeing their private selections

## 4. Functional Requirements

### 4.1 Card System

#### Card Design
- **Deck Size**: 40 values cards (CSV to be provided by client)
- **Card Content**: 
  - Front: Value name + brief description (from CSV)
  - Back: Themed abstract design (CSS patterns or generated placeholders for MVP)
- **Visual States**:
  - Face-down (in deck)
  - Face-up (showing value)
  - Highlighted (on hover/selection)
  - Selected (during reduction steps)
  - Dimmed (when not selected for next round)

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
- **Zones**: Visual indicators for "Most Important" and "Less Important" areas in Step 1
- **Organization**: Users can stack, spread, or arrange cards however they prefer

#### Detailed Interaction Flow

##### Step 1: Initial Sort
1. **Starting State**: Single deck positioned centrally, all cards face-down
2. **Card Flip**: Click to flip top card, revealing value
3. **Card Drag**: Drag flipped card to designated area
4. **Visual Feedback**: 
   - Counter showing cards remaining in deck (e.g., "32 cards remaining")
   - Visual zones for "Most Important" and "Less Important" stacks
5. **Completion**: Auto-prompt when deck is empty

##### Steps 2-4: Reduction Phases
1. **Spread Action**: Cards automatically fan out or user manually spreads them
2. **Selection Mode**: 
   - Click cards to select (visual highlight)
   - Counter showing selection progress (e.g., "3 of 8 selected")
3. **Confirmation**: "Done" button becomes active when correct number selected
4. **Post-Confirmation**: 
   - Non-selected cards dim or move aside
   - Selected cards remain active for arrangement
5. **Action Options**: Three clear buttons:
   - "Take Snapshot" - Captures current state
   - "Reveal to Team" - Shares with session participants
   - "Continue to Next Step" - Proceeds to next reduction

#### Standard Interactions
- **Drag**: Move cards to any position
- **Click**: Flip (in deck) or select (during reduction)
- **Double-click**: Show expanded definition popup
- **Multi-select**: During reduction phases only
- **Right-click**: Quick actions menu (optional)

### 4.3 Privacy & Reveal System

#### Privacy Model
- Each participant has a private workspace
- Progress indicators show which step participants are on
- No visibility into card selections or positions until reveal
- Reveal can happen after any completed step (2, 3, or 4)

#### Reveal Functionality
- **Trigger**: Manual "Reveal to Team" button after any reduction step
- **Granularity**: Users can selectively reveal specific stacks or selections:
  - Just current step results (e.g., only top 5)
  - Multiple stacks if organized separately
  - Any custom arrangement they've created
- **Revealed Display**:
  - Cards show face-up with values
  - User's chosen arrangement/grouping preserved
  - Name label identifying whose values they are
- **Persistence**: Once revealed, cannot be hidden again

### 4.4 Session Management

#### Session Lifecycle
- **Creation**: First user creates session, receives shareable link
- **Joining**: Participants enter name, no authentication required
- **Rejoining**: Participants can rejoin if browser closes (name-based reconnection)
- **Duration**: Auto-end after 60 minutes of inactivity
- **Capacity**: 1-50 participants (optimized for 5-10)
- **Management**: Purely collaborative (no admin controls or forced actions)

#### Session States
- Active: Participants actively sorting/revealing
- Idle: No activity for 5+ minutes (warning at 55 minutes)
- Ended: Session terminated, snapshot reminder shown

#### Progress Tracking
- Visual indicator for each participant showing current step:
  - "Sorting initial deck" (Step 1)
  - "Selecting top 8" (Step 2)
  - "Selecting top 5" (Step 3)
  - "Finalizing top 3" (Step 4)
  - "Completed" (finished all steps)

### 4.5 Export Capabilities

#### Snapshot Feature
- **Availability**: After completing any reduction step (2, 3, or 4)
- **Trigger**: Manual "Take Snapshot" button
- **Formats**: 
  - JPG: Standard quality for simple text cards
  - PDF: Include participant name and session date as metadata
- **Content**: Current canvas view with visible cards and arrangements
- **Resolution**: Optimized for readability (text-focused, not high DPI required)
- **Storage**: Download only (no in-app persistence)

## 5. Non-Functional Requirements

### 5.1 Performance
- **Concurrent Users**: Support 50 participants per session
- **Rendering**: DOM manipulation at 60fps (no Canvas/WebGL for MVP)
- **Card Animations**: Smooth flip transitions (<300ms)
- **Real-time Sync**: <100ms latency via Ably WebSockets
- **Session Persistence**: In-memory (MVP), Redis (production)

### 5.2 Compatibility
- **Primary**: Desktop browsers (Chrome, Firefox, Safari, Edge)
- **Screen Size**: Optimized for 1920x1080 and above
- **Not Required for MVP**: Mobile/tablet support

### 5.3 Accessibility
- Keyboard navigation for card flipping and selection
- Screen reader support for card values/descriptions
- High contrast mode option
- Clear visual feedback for all interactions
- Progress indicators for each step

## 6. Visual Design Requirements

### 6.1 Theme System

#### Default Theme: Liquid Glass
- Glassmorphism effects with subtle transparency
- Smooth gradients and soft shadows
- Modern, professional aesthetic
- Clean typography with good contrast
- Elegant card flip animations

#### Additional Themes
V0 to generate 3-4 trending design systems suitable for corporate/leadership contexts:
- Modern, professional aesthetics that convey trust and clarity
- Each theme maintains readability and professionalism
- Consistent interaction patterns across themes
- Examples: Minimalist, Dark Mode Professional, Soft Gradient, Modern Corporate

### 6.2 Layout Structure
```
┌─────────────────────────────────────┐
│ Header: Session Info | Participants │
├─────────────────────────────────────┤
│                                     │
│         Main Canvas Area            │
│    ┌──────┐                        │
│    │ Deck │  [Most Important]      │
│    └──────┘  [Less Important]      │
│                                     │
├─────────────────────────────────────┤
│ Progress: Step 1 of 4 | 15 cards   │
│ [Snapshot] [Reveal] [Continue]      │
└─────────────────────────────────────┘
```

### 6.3 Visual Feedback Elements

#### Progress Indicators
- Card counter during initial sort
- Selection counter during reductions
- Step progress bar or indicator
- Participant status badges

#### Animation Requirements
- Card flip: 300ms with 3D rotation effect
- Card drag: Smooth follow with slight lift shadow
- Stack formation: Cards slightly offset for depth
- Spread action: Smooth fan-out animation
- Selection: Glow or border highlight
- Reveal transition: Fade-in or slide animation

## 7. Technical Considerations

### 7.1 Architecture
- **Real-time Collaboration**: Ably for WebSocket implementation (API key to be provided)
- **Data Persistence**: 
  - Development/MVP: In-memory storage for session data
  - Production: Redis for temporary session storage (60-minute TTL)
- **Canvas Rendering**: DOM manipulation for card interactions (MVP priority on simplicity)
- **Client-side State Management**: Local state for card positions and selections

### 7.2 State Management
```javascript
// Example state structure
participantState = {
  currentStep: 1-4,
  deck: [array of unflipped cards],
  mostImportantStack: [array of cards],
  lessImportantStack: [array of cards],
  currentSelection: [array of selected cards],
  revealedStacks: [array of revealed arrangements],
  snapshots: [array of snapshot metadata]
}
```

### 7.3 Data Flow
- Minimal server-side storage (session data only)
- Client-side card positions and states
- Peer-to-peer or server-mediated sync for reveals
- Progress updates broadcast to all participants

### 7.4 Security & Privacy
- No persistent user data storage
- Session data deleted after timeout
- No authentication required (by design)
- Optional session passwords for private groups

## 8. Success Metrics

### 8.1 User Engagement
- Average session completion rate >80%
- Time to complete exercise: 15-30 minutes
- Reveal rate: >90% of participants share results
- Snapshot usage: >50% of users export results

### 8.2 Technical Performance
- Page load time <3 seconds
- Card flip animation <300ms
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
- Undo/redo functionality for card placement

### Phase 3 Possibilities
- AI-powered insights and value analysis
- Team alignment metrics
- Integration with HR/team tools
- Custom value sets
- Multi-language support
- Offline mode with sync
- Timer options for each step
- Collaborative sorting modes

### 10. Implementation Notes for V0/Claude Code

### Technology Stack (Confirmed)
- **Real-time**: Ably for WebSocket communication
- **State Management**: Client-side with React/Vue state
- **Persistence**: In-memory (MVP) → Redis (production)
- **Rendering**: DOM-based card manipulation
- **Export**: Client-side canvas capture for snapshots

### Key Implementation Patterns
1. **State Management**: Single source of truth for card positions and step progress
2. **Optimistic UI**: Immediate visual feedback, then sync via Ably
3. **Session Recovery**: Name-based reconnection for dropped connections
4. **Progressive Disclosure**: Reveal complexity as users advance through steps
5. **Graceful Degradation**: Function without WebSockets if Ably unavailable

### Component Structure Suggestion
```
- App Container
  - Session Manager
  - Canvas Component
    - Deck Component (starting deck)
    - Card Component (×40)
    - Zone Indicators (Most/Less Important)
    - Selection Counter
  - Progress Tracker
  - Control Panel (Snapshot/Reveal/Continue)
  - Participant List with Status
  - Export Manager
```

### Critical Implementation Details
1. **Card Flip Queue**: Ensure only one card can be flipped at a time from deck
2. **Selection Validation**: Enforce exact counts (8, 5, 3) before enabling "Done"
3. **State Transitions**: Clear handoff between steps
4. **Reveal Granularity**: Allow partial reveals based on current step
5. **Visual Clarity**: Clear differentiation between steps and states

## 11. Acceptance Criteria

### MVP Must-Haves
✅ One-at-a-time card flipping from initial deck  
✅ Clear two-stack sorting in Step 1  
✅ Spread and select mechanics for reductions  
✅ "Done" confirmation for each reduction step  
✅ Snapshot/Reveal/Continue options after each step  
✅ 40 working value cards with descriptions  
✅ Real-time multi-user support (up to 50)  
✅ Progress tracking for all participants  
✅ Liquid glass theme + alternatives  
✅ Desktop browser support  

### MVP Nice-to-Haves
- Sound effects for card flip/drag
- Keyboard shortcuts for common actions
- Auto-save draft selections
- Participant ready indicators
- Quick tutorial/onboarding
- Celebration animation on completion

## 12. Glossary

- **Value Card**: Digital representation of a core value with name and description
- **Deck**: The initial stack of 40 face-down cards
- **Stack**: A group of cards placed together (Most/Less Important)
- **Canvas**: The virtual workspace where cards are arranged
- **Spread**: Fanning out cards for easier viewing and selection
- **Reduction**: The process of selecting fewer cards from a larger set
- **Reveal**: Making private card selections visible to other participants
- **Snapshot**: Exported image/PDF of current canvas state
- **Session**: A unique instance of the exercise with multiple participants
- **Guided Mode**: The structured 4-step reduction process

---

*This PRD is optimized for implementation with V0 and Claude Code, emphasizing clear interaction patterns and requirements while allowing flexibility in technical implementation details.*