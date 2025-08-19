# Leadership Values Card Sort - Product Requirements Document v0.4

## 1. Product Overview

### 1.1 Purpose
A collaborative web application for teams to identify and prioritize their leadership values through a guided card-sorting exercise. Participants sort a deck of value cards through progressive elimination rounds, narrowing from ~40 values to their top 3 most important leadership values.

### 1.2 Key Features
- Zero-friction session creation with 6-character alphanumeric codes
- Drag-and-drop card sorting interface with snap-to-pile mechanics
- Progressive reduction methodology (All → More/Less → Top 8 → Top 3)
- Real-time collaboration with optional reveal and discussion
- Snapshot capability for saving and sharing results (JPG, PNG, PDF)
- Desktop-optimized experience with zoom controls
- Multiple theme options for professional contexts

### 1.3 Target Users
- Leadership teams conducting values alignment exercises
- HR professionals facilitating team building
- Consultants running organizational culture workshops
- Remote teams seeking shared understanding

## 2. User Flow & Screens

### 2.1 Welcome/Login Screen

#### Layout
- Centered card with application title "Welcome to Leadership Values Cards Exercise"
- Two input fields:
  - "Your Name" (text input)
  - "Session Code" (6-character alphanumeric input)
- "Join Session ➜" button (primary action)
- Settings icon to generate new session code

#### Functionality
- **New Session**: Clicking settings generates random 6-character uppercase code (e.g., "ABC123")
- **Join Session**: Enter existing code and name to join
- **Validation**: 
  - Name required (min 1 character, max 50 characters)
  - Session code must be 6 characters alphanumeric
  - Error message if session doesn't exist: "Session has ended. Would you like to start a new one?"
- **Data Storage**: Save name and session code to localStorage
- **Navigation**: Redirect to `/canvas?session=[CODE]&name=[NAME]`

### 2.2 Post-Login Animation Screen

#### Layout
- Same header with "← Leave Session" and participant count "👥5 Participants"
- Center of screen shows personalized card deck
- Card deck displays "[Name]'s Leadership Values" on top card
- "Step 1 ➜" button appears after animation

#### Animation Sequence
1. Card deck spins/shuffles (1-2 seconds)
2. Cards remain face-down after animation
3. Button becomes active
4. Animation should be quick and fluid (< 2000ms total)

### 2.3 Step 1: Initial Sort

#### Layout Structure
```
[← Leave Session]  [👥5 Participants]        [Step 1 of 3] [x]

┌─────────────────────┐     ┌─────────────────────┐
│   More Important    │     │   Less Important    │
│                     │     │                     │
│   (drop zone)       │     │   (drop zone)       │
└─────────────────────┘     └─────────────────────┘

        ┌──────────┐
        │ CARD     │  ← Flipped card (staging area)
        └──────────┘

┌─────────────────────┐
│ Leadership Value    │
│ Cards               │  ← Main deck (face-down)
└─────────────────────┘
```

#### Functionality
- **First-time Modal**: Explain exercise rules
  - "Sort the leadership values into two piles"
  - "Click the deck to flip cards one at a time"
  - "Drag cards to sort them, or click the pile name"
  - "You can move cards between piles at any time"
- **Card Flipping**: Click deck to flip top card to staging area with smooth animation
- **Card Display**: 
  - Value name in large, bold text
  - Description in smaller text below
  - Card has subtle shadow for depth
- **Sorting Methods**:
  - Drag card to either pile
  - Click pile title for quick placement from staging area
  - Cards snap to pile when >50% overlaps
- **Card Movement**: 
  - Cards can be moved between piles anytime
  - Smooth animation when cards snap to piles
  - Cards stack with slight offset to show multiple cards
- **Progression**: 
  - "Step 2 ➜" button appears when main deck is empty
  - Both piles must have at least one card
- **Canvas Behavior**: Cards stay within bounded pile areas with snap-to-pile mechanics

### 2.4 Step 2: Reduce to Top 8

#### Transition Animation
1. Less Important pile → stacks neatly → flips face-down → moves to bottom-right discard area (500ms)
2. More Important pile → stacks neatly → flips face-down → moves to main deck position (500ms)
3. Pile labels change to "Top 8 Most Important" and "Less Important"
4. Counter appears: "(0/8)" next to Top 8 pile

#### Layout
- Same structure as Step 1 with updated labels
- "Top 8 Most Important" pile shows dynamic counter (e.g., "3/8")
- Small discard pile visible in bottom-right corner
- Step indicator shows "Step 2 of 3"

#### Functionality
- **Instructions Modal**: "Select your Top 8 most important values"
- **Strict Limit**: Exactly 8 cards maximum in Top 8 pile
- **Overflow Behavior**: 
  - 9th card bounces back with elastic animation (400ms)
  - Warning message: "Remove a card from Top 8 to add another"
  - Message auto-dismisses after 3 seconds
- **Counter Updates**: Real-time update of card count
- **Review Button**: "Review Top 8 ➜" appears when:
  - Exactly 8 cards in Top 8 pile
  - Main deck is empty
  - All cards are sorted

### 2.5 Review Top 8 Screen

#### Layout Transition
1. Less Important pile → animates to discard area (300ms)
2. Top 8 pile frame expands to fill 80% of canvas (500ms)
3. Cards distribute in flexible grid within frame
4. Three buttons appear above frame with fade-in (200ms)

#### Layout Structure
```
[← Leave Session]  [👥5 Participants]        [Step 2 of 3] [x]

        [📸 Snapshot]  [👁 Reveal]  [Next Step ➜]

┌───────────────────────────────────────────────────┐
│  Top 8 Most Important Values                     │
│                                                   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│  │Card │ │Card │ │Card │ │Card │               │
│  └─────┘ └─────┘ └─────┘ └─────┘               │
│                                                   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│  │Card │ │Card │ │Card │ │Card │               │
│  └─────┘ └─────┘ └─────┘ └─────┘               │
└───────────────────────────────────────────────────┘
```

#### Functionality
- **Card Arrangement**: 
  - Users can freely drag cards within frame
  - Cards don't snap to grid - allowing custom groupings
  - Visual feedback on hover (slight lift/shadow)
- **Snapshot Feature**: 
  - Downloads in JPG, PNG, or PDF format
  - Includes header with:
    - User's name
    - Session code: "Session: ABC123"
    - Timestamp
    - "Top 8 Leadership Values"
  - Preserves exact card arrangement
- **Reveal Feature**: 
  - Makes arrangement visible to other participants
  - Shows confirmation: "Your Top 8 values are now visible to the group"
  - Updates participant status in group view
- **Navigation**: 
  - "Next Step" proceeds to Step 3
  - Optional: Back button to return to sorting (if not too complex)

### 2.6 Step 3: Reduce to Top 3 (Final Selection)

#### Setup Transition
- Top 8 cards → stack → flip face-down → move to main deck position
- Create new empty piles: "Top 3 Most Important" and "Less Important"
- Previous Less Important cards remain in discard area

#### Layout
- Identical structure to Step 2
- "Top 3 Most Important" with "(0/3)" counter
- Step indicator: "Step 3 of 3"

#### Functionality
- **Instructions**: "Select your Top 3 most important values"
- **Strict Limit**: Exactly 3 cards in Top 3 pile
- **Same overflow behavior as Step 2**
- **Review Button**: "Review Top 3 ➜" when complete

### 2.7 Review Top 3 Screen (Final)

#### Layout
```
[← Leave Session]  [👥5 Participants]        [Step 3 of 3] [x]

        [📸 Snapshot]  [👁 Reveal]  [Complete ✓]

┌───────────────────────────────────────────────────┐
│  Top 3 Most Important Values                     │
│                                                   │
│         ┌─────────┐                              │
│         │ Card 1  │                              │
│         └─────────┘                              │
│                                                   │
│         ┌─────────┐                              │
│         │ Card 2  │                              │
│         └─────────┘                              │
│                                                   │
│         ┌─────────┐                              │
│         │ Card 3  │                              │
│         └─────────┘                              │
└───────────────────────────────────────────────────┘
```

#### Functionality
- **Card Arrangement**: Can arrange vertically, horizontally, or triangular
- **Snapshot**: Includes "Top 3 Leadership Values - Final Selection"
- **Complete Button**: 
  - Shows completion message: "Congratulations! You've identified your top 3 leadership values"
  - Participant status updates to "Completed"
- **End State**: 
  - Users remain in session for discussion
  - Can still view others' selections
  - Session persists until all leave or 60-minute timeout

### 2.8 Participants View

#### Access
- Click "👥 Participants" button from any screen
- Opens as overlay or sidebar

#### Layout
```
[← Back to Exercise]

Session Participants (5)

┌──────────────────────────────────┐
│ 😊 Janice                        │
│ Status: Still sorting...         │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 🎨 David                         │
│ Status: Revealed Top 8           │
│ [View David's Top 8]             │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│ 🎭 Felix                         │
│ Status: Completed - Top 3        │
│ [View Felix's Top 3]             │
└──────────────────────────────────┘
```

#### Functionality
- **Real-time Updates**: 
  - Status changes when users progress/reveal
  - Participant count updates on join/leave
- **View Others' Selections**: 
  - Click button to see revealed arrangements
  - Opens in read-only mode
  - Shows who else is viewing (avatar indicators)
- **Privacy**: Only see cards after participant reveals them

### 2.9 Viewing Others' Arrangements

#### Layout
- Full-screen view of participant's arrangement
- Header: "[Name]'s Top [8/3] Leadership Values"
- "← Back to Participants" button
- Small avatars of other viewers in corner

#### Functionality
- **Read-only**: Cannot move or rearrange cards
- **Live Updates**: If owner is still arranging (post-reveal), see real-time movements
- **Viewer Presence**: 
  - See all participants actively viewing the collection
  - Each viewer shows name and emoji avatar
  - All viewers see card movements done by the collection's author
- **Navigation**: Can switch between different participants' views

## 3. Technical Specifications

### 3.1 Card Data Management

#### CSV Structure
```csv
value_name,description
Trust,"Firm reliance on the integrity, ability, or character of a person or thing"
Teamwork,"Cooperative effort by a group or team"
Commitment,"Being bound emotionally or intellectually to a course of action"
Balance,"Balancing time and effort between work, home, and hobbies"
Achievement,"Aspires to the highest levels of excellence"
Innovation,"Creating new ideas and putting them into practice"
Integrity,"Adherence to moral and ethical principles"
Respect,"Showing consideration and appreciation for others"
```

#### Deck Configuration
- **File Loading**: Load CSV at application build/startup via make command
- **Multiple Decks**: Support different CSV files selected at build time:
  - `dev.csv` (16 cards for testing)
  - `professional.csv` (40 cards standard)
  - `extended.csv` (72 cards comprehensive)
- **Shuffle Algorithm**: Fisher-Yates shuffle on session start
- **Distribution**: Each participant gets same cards, different order

### 3.2 Session Management

#### Creation & Joining
- **Code Generation**: 
  ```javascript
  Math.random().toString(36).substring(2, 8).toUpperCase()
  ```
- **Storage**: 
  - localStorage: `sessionCode`, `participantName`
  - URL parameters: `/canvas?session=ABC123&name=John`
- **Fallback Hierarchy**: 
  1. URL parameters
  2. localStorage
  3. Default "DEMO" session

#### Session Lifecycle
- **Creation**: First participant creates session
- **Joining**: Additional participants join with code
- **Persistence**: Exists while ≥1 participant connected
- **Timeout**: 60-minute inactivity timer
- **Cleanup**: Remove session when last participant leaves

### 3.3 Real-time Collaboration

#### Technology Stack
- **WebSocket**: Ably for real-time communication (API key to be provided)
- **Channels**: One per session code
- **Message types**: card-move, status-update, reveal, viewer-presence
- **State Management**: Client-side with React/Vue state
- **Persistence**: 
  - Development/MVP: In-memory storage for session data
  - Production: Redis for temporary session storage (60-minute TTL)

#### Visibility Rules
| State | Others Can See |
|-------|---------------|
| Sorting (not revealed) | Name, emoji, status only |
| Revealed Top 8 | Card selections, arrangements, live movements |
| Revealed Top 3 | Card selections, arrangements, live movements |
| Viewing someone's reveal | Viewer's avatar and name |

#### Participant Identity
- **Color Assignment**: From predefined palette
  ```javascript
  colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57']
  ```
- **Emoji Assignment**: Random from set
  ```javascript
  emojis = ['😊', '🎨', '🎭', '🎪', '🎯', '🎸', '🎺', '🎪', '🌟', '💫']
  ```
- **Persistence**: Maintained throughout session
- **Display**: Show in participants list, viewer avatars, and status

### 3.4 Interaction Patterns

#### Drag and Drop Implementation
```javascript
// Drag start
- Add 'dragging' class
- Set opacity to 0.7
- Create shadow copy at original position

// During drag
- Follow cursor position
- Check overlap with drop zones
- Highlight valid drop zones

// Drop
- If >50% overlap with pile: snap to pile
- If <50% overlap: return to original position
- Animate transition (200ms ease-out)
```

#### Animation Timings
| Animation | Duration | Easing |
|-----------|----------|--------|
| Post-login shuffle | 1000-2000ms | ease-in-out |
| Card flip | 200-300ms | ease-in-out |
| Card movement | 200ms | ease-out |
| Pile transition | 500ms | ease-out |
| Snap to pile | 200ms | ease-out |
| Bounce back | 400ms | elastic |
| Fade in/out | 200ms | ease |
| Frame expansion | 500ms | ease-out |

### 3.5 Canvas & Zoom Controls

#### Canvas Properties
- **Type**: Bounded canvas with zoom controls
- **Default View**: All elements fit within standard screen (1920x1080)
- **Zoom Controls**: 
  - Zoom in/out buttons
  - Keyboard shortcuts (Ctrl/Cmd + +/-)
  - Pinch-to-zoom on trackpad
  - Zoom range: 50% to 200%
- **Pan**: Click and drag to pan when zoomed in

### 3.6 Visual Design

#### Theme System

##### Default Theme: Liquid Glass
- Glassmorphism effects with subtle transparency
- Smooth gradients and soft shadows
- Modern, professional aesthetic
- Clean typography with good contrast
- Elegant card flip animations

##### Additional Themes
3-4 trending design systems suitable for corporate/leadership contexts:
- **Minimalist**: Clean lines, ample whitespace, subtle animations
- **Dark Mode Professional**: Dark backgrounds with high contrast text
- **Soft Gradient**: Gentle color transitions, warm tones
- **Modern Corporate**: Bold typography, brand-friendly color schemes

Each theme maintains:
- Readability and professionalism
- Consistent interaction patterns
- Accessibility standards
- Trust and clarity conveyance

#### Layout Specifications
- **Minimum Resolution**: 1920x1080
- **Header Height**: 60px fixed
- **Canvas Area**: Remaining viewport height
- **Pile Dimensions**: 300px × 400px
- **Card Dimensions**: 200px × 280px
- **Spacing**: 20px minimum between elements

#### Color Palette
```css
:root {
  --primary: #4A90E2;
  --secondary: #7B68EE;
  --success: #5CB85C;
  --warning: #F0AD4E;
  --danger: #D9534F;
  --card-bg: #FFFFFF;
  --card-border: #E0E0E0;
  --pile-border: #B0B0B0;
  --canvas-bg: #F5F5F5;
}
```

#### Typography
- **Headers**: Inter or system-ui, 24px, bold
- **Card Titles**: Inter or system-ui, 18px, semibold
- **Card Descriptions**: Inter or system-ui, 14px, regular
- **Buttons**: Inter or system-ui, 16px, medium

## 4. Edge Cases & Error Handling

### 4.1 Session Errors

| Error | Message | Action |
|-------|---------|--------|
| Invalid code | "Session not found. Check the code or start a new session." | Return to welcome |
| Expired session | "This session has ended. Start a new session?" | Offer new session |
| Connection lost | "Connection lost. Attempting to reconnect..." | Auto-retry 3x |
| Server error | "Something went wrong. Please try again." | Log error, retry |

### 4.2 Interaction Constraints

#### Pile Rules
- **Empty Deck**: Cannot proceed if cards remain in deck
- **Pile Minimums**: Each pile needs ≥1 card in Step 1
- **Pile Maximums**: Enforced limits (8 for Top 8, 3 for Top 3)
- **Overflow Handling**: 
  1. Card bounces back to original position
  2. Show warning message for 3 seconds
  3. Highlight cards that need removal

#### Name Handling
- **Minimum Length**: 1 character required
- **Maximum Length**: 50 characters
- **Duplicate Names**: Append number (John, John-2, John-3)
- **Special Characters**: Allow alphanumeric, spaces, hyphens

### 4.3 Progressive Disclosure

#### Navigation Rules
- **Forward Only** (v1): Must complete steps sequentially
- **Optional Back** (if simple): Can return to previous step
- **Skip Prevention**: Cannot skip to Step 3 without completing Step 2
- **Partial Completion**: Can reveal at Top 8 or wait for Top 3

## 5. Export Capabilities

### 5.1 Snapshot Feature
- **Availability**: After completing any reduction step (2 or 3)
- **Trigger**: Manual "Take Snapshot" button
- **Formats**: 
  - **JPG**: Standard quality for quick sharing
  - **PNG**: Higher quality with transparency support
  - **PDF**: Vector format with metadata (participant name, session date)
- **Content**: Current canvas view with visible cards and arrangements
- **Resolution**: Optimized for readability at standard screen sizes
- **Storage**: Download only (no in-app persistence)

## 6. Data Models

### 6.1 Session Object
```javascript
{
  sessionCode: "ABC123",
  createdAt: "2024-01-01T00:00:00Z",
  lastActivity: "2024-01-01T00:15:00Z",
  deckType: "professional",
  maxParticipants: 50,
  participants: [...]
}
```

### 6.2 Participant Object
```javascript
{
  name: "John",
  emoji: "😊",
  color: "#FF6B6B",
  joinedAt: "2024-01-01T00:00:00Z",
  currentStep: 2,
  status: "sorting", // sorting, revealed-8, revealed-3, completed
  top8Cards: [],
  top3Cards: [],
  cardPositions: {...},
  isViewing: null // participant ID being viewed, or null
}
```

### 6.3 Card Object
```javascript
{
  id: "trust",
  value_name: "Trust",
  description: "Firm reliance on the integrity...",
  position: { x: 100, y: 200 },
  pile: "top8" // deck, staging, more, less, top8, top3, discard
}
```

## 7. Performance Requirements

### 7.1 Response Times
- Page load: < 2 seconds
- Post-login animation: < 2 seconds total
- Card flip animation: 200-300ms
- Card movement: 200ms
- Drag response: < 16ms (60fps)
- Session join: < 1 second
- Real-time updates: < 100ms latency

### 7.2 Capacity
- Sessions per instance: 100 concurrent
- Participants per session: 50 maximum
- Card deck size: 16-72 cards
- Session timeout: 60 minutes inactivity

## 8. Browser Support
- Chrome 90+ (primary)
- Firefox 88+
- Safari 14+
- Edge 90+
- Desktop only (no mobile optimization)

## 9. Accessibility (Future Enhancement)
- Keyboard navigation for all actions
- Screen reader support for card values/descriptions
- High contrast mode option
- Clear visual feedback for all interactions
- Focus indicators on interactive elements
- ARIA labels on interactive elements

## 10. Success Metrics

### 10.1 Engagement Metrics
- **Session Completion Rate**: % of participants reaching Top 3
- **Average Time per Step**: 
  - Step 1: Target 5-10 minutes
  - Step 2: Target 3-5 minutes
  - Step 3: Target 2-3 minutes
- **Total Session Duration**: Target 15-25 minutes

### 10.2 Collaboration Metrics
- **Reveal Rate**: % who share Top 8 or Top 3
- **Multi-participant Rate**: % of sessions with >1 person
- **View Others Rate**: % who view others' selections
- **Snapshot Download Rate**: % who save results

### 10.3 Technical Metrics
- **Error Rate**: < 1% of sessions
- **Connection Stability**: > 99% uptime
- **Animation Performance**: Consistent 60fps
- **Load Time**: < 2 seconds

## 11. Implementation Architecture

### 11.1 Technology Stack
- **Frontend Framework**: React or Vue.js
- **Real-time Communication**: Ably WebSockets
- **State Management**: Client-side with framework state (React Context/Vuex)
- **Persistence**: 
  - Development: In-memory storage
  - Production: Redis with 60-minute TTL
- **Canvas Rendering**: DOM manipulation (no Canvas/WebGL for MVP)
- **Export Generation**: Client-side canvas capture

### 11.2 Component Structure
```
- App Container
  - Session Manager
  - Canvas Component
    - Zoom Controls
    - Deck Component (starting deck)
    - Card Component (×40)
    - Pile Components (More/Less Important)
    - Staging Area
    - Selection Counter
  - Progress Tracker
  - Control Panel (Snapshot/Reveal/Continue)
  - Participant List with Status
  - Export Manager
  - Theme Manager
```

### 11.3 State Management Pattern
```javascript
// Example state structure
appState = {
  session: {
    code: "ABC123",
    participants: [],
    deckType: "professional"
  },
  currentParticipant: {
    name: "John",
    currentStep: 1,
    deck: [],
    piles: {
      more: [],
      less: [],
      top8: [],
      top3: []
    },
    revealed: {
      top8: false,
      top3: false
    }
  },
  ui: {
    theme: "liquid-glass",
    zoomLevel: 100,
    activeModal: null
  },
  viewers: [] // participants viewing current user's reveal
}
```

## 12. Future Enhancements (Post-MVP)

### Phase 2 Considerations
- Mobile/tablet responsive design
- Multiple themed decks (leadership, personal, team values)
- Persistent user profiles and history
- Guided facilitation tools
- Custom card back designs
- Session recording/playback
- Undo/redo functionality for card placement
- Keyboard shortcuts for all actions

### Phase 3 Possibilities
- AI-powered insights and value analysis
- Team alignment metrics
- Integration with HR/team tools
- Custom value sets via UI
- Multi-language support
- Offline mode with sync
- Timer options for each step
- Collaborative sorting modes
- Analytics dashboard
- Export to various formats (CSV, JSON)

---

*This document represents the complete product requirements for Leadership Values Card Sort v0.4. It consolidates requirements from previous versions and incorporates all clarifications. This should be treated as the single source of truth for development.*