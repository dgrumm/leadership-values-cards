Event + Presence System Diagram
sequenceDiagram
      participant Dave as Dave (First Participant)
      participant AblyPresence as Ably Presence Store
      participant AblyEvents as Ably Event Channel
      participant Bob as Bob (Late Joiner)
      participant UI_Dave as Dave's UI State
      participant UI_Bob as Bob's UI State

      Note over Dave, UI_Bob: SCENARIO: Dave joins first, then Bob joins later

      %% Dave's Initial Connection
      rect rgb(240, 248, 255)
          Note over Dave: Dave Opens Session "DEBUG1"
          Dave->>Dave: EventDrivenSessionContext initializes
          Dave->>Dave: useAbly hook connects to Ably
          Dave->>Dave: EventBus created with sessionCode="DEBUG1"

          Note over Dave: Auto-sync session state (finds no existing participants)
          Dave->>AblyPresence: sessionChannel.presence.get()
          AblyPresence-->>Dave: [] (empty array - no existing participants)
          Dave->>Dave: participantSteps = new Map() (stays empty)

          Note over Dave: Dave publishes join
          Dave->>AblyPresence: presence.enter({participantId: "dave-123", name: "Dave", currentStep: 1})
          Dave->>AblyEvents: publishEvent(ParticipantJoinedEvent)

          Note over Dave: Dave's own event comes back
          AblyEvents-->>Dave: ParticipantJoinedEvent (self)
          Dave->>Dave: setParticipantSteps.set("dave-123", {currentStep: 1, participantName: "Dave"})
          Dave->>UI_Dave: participantCount = 1, shows "1 Participant"
      end

      %% Bob's Connection (The Critical Part)
      rect rgb(255, 248, 240)
          Note over Bob: Bob Opens Session "DEBUG1" (30 seconds later)
          Bob->>Bob: EventDrivenSessionContext initializes
          Bob->>Bob: useAbly hook connects to Ably
          Bob->>Bob: EventBus created with sessionCode="DEBUG1"

          Note over Bob: 🔄 [SessionSync] - THE KEY FIX!
          Bob->>AblyPresence: sessionChannel.presence.get()
          AblyPresence-->>Bob: [{data: {participantId: "dave-123", name: "Dave", currentStep: 1}}]

          Note over Bob: Bob syncs existing participants BEFORE joining
          Bob->>Bob: setParticipantSteps.set("dave-123", {currentStep: 1, participantName: "Dave"})
          Bob->>UI_Bob: participantCount = 1 (Dave loaded from presence)

          Note over Bob: Now Bob publishes his own join
          Bob->>AblyPresence: presence.enter({participantId: "bob-456", name: "Bob", currentStep: 1})
          Bob->>AblyEvents: publishEvent(ParticipantJoinedEvent)
      end

      %% Cross-notifications
      rect rgb(240, 255, 240)
          Note over AblyEvents, UI_Bob: Real-time Event Notifications

          AblyEvents-->>Dave: ParticipantJoinedEvent (Bob joined)
          Dave->>Dave: setParticipantSteps.set("bob-456", {currentStep: 1, participantName: "Bob"})
          Dave->>UI_Dave: participantCount = 2, shows "2 Participants" ✅

          AblyEvents-->>Bob: ParticipantJoinedEvent (self)
          Bob->>Bob: setParticipantSteps.set("bob-456", {currentStep: 1, participantName: "Bob"})
          Bob->>UI_Bob: participantCount = 2 (Dave + Bob), shows "2 Participants" ✅
      end

      %% Step Transition Example
      rect rgb(255, 240, 255)
          Note over Dave: Dave Completes Step 1 → Step 2

          Dave->>AblyPresence: presence.update({participantId: "dave-123", currentStep: 2})
          Dave->>AblyEvents: publishEvent(StepTransitionedEvent {fromStep: 1, toStep: 2})

          AblyEvents-->>Bob: StepTransitionedEvent
          Bob->>Bob: setParticipantSteps.set("dave-123", {currentStep: 2, participantName: "Dave"})
          Bob->>UI_Bob: Dave shows "Step 2 of 3" in participants modal ✅

          AblyEvents-->>Dave: StepTransitionedEvent (self)
          Dave->>Dave: setParticipantSteps.set("dave-123", {currentStep: 2, participantName: "Dave"})
          Dave->>UI_Dave: Dave shows "Step 2 of 3" in UI ✅
      end

      %% What happens if Charlie joins even later
      rect rgb(248, 248, 255)
          participant Charlie as Charlie (Even Later Joiner)
          participant UI_Charlie as Charlie's UI State

          Note over Charlie: Charlie joins 5 minutes later
          Charlie->>AblyPresence: sessionChannel.presence.get()
          AblyPresence-->>Charlie: [{dave-123: currentStep: 2}, {bob-456: currentStep: 1}]

          Charlie->>Charlie: setParticipantSteps.set("dave-123", {currentStep: 2, participantName: "Dave"})
          Charlie->>Charlie: setParticipantSteps.set("bob-456", {currentStep: 1, participantName: "Bob"})
          Charlie->>UI_Charlie: participantCount = 2 (synced from presence)

          Charlie->>AblyPresence: presence.enter({participantId: "charlie-789", currentStep: 1})
          Charlie->>AblyEvents: publishEvent(ParticipantJoinedEvent)

          AblyEvents-->>Dave: ParticipantJoinedEvent (Charlie)
          AblyEvents-->>Bob: ParticipantJoinedEvent (Charlie)
          AblyEvents-->>Charlie: ParticipantJoinedEvent (self)

          Dave->>UI_Dave: participantCount = 3 ✅
          Bob->>UI_Bob: participantCount = 3 ✅
          Charlie->>UI_Charlie: participantCount = 3 ✅
      end

      Note over Dave, UI_Charlie: KEY INSIGHT: Hybrid Architecture
      Note over Dave, UI_Charlie: • Ably Presence = Persistent State (survives late joins)
      Note over Dave, UI_Charlie: • Ably Events = Real-time Notifications (immediate updates)
      Note over Dave, UI_Charlie: • participantSteps Map = Local Computed State
      Note over Dave, UI_Charlie: • participantCount = participantSteps.size (always accurate)

Viewer system Diagram

  graph TB
      subgraph "Dave's Browser (Revealer)"
          D1[Dave clicks Reveal button]
          D2[Step2Page handleReveal]
          D3[Step2Store revealTop8]
          D4[ViewerSync.revealArrangement]
          D5[Ably channel publish]

          D1 --> D2
          D2 --> D3
          D3 --> D4
          D4 --> D5
      end

      subgraph "Ably Realtime"
          A1[reveals channel]
          A2[arrangement-revealed event]

          D5 --> A1
          A1 --> A2
      end

      subgraph "Bob's Browser (Viewer)"
          B1[ParticipantCard useSharedViewerSync]
          B2[EventDrivenSessionContext ViewerSync]
          B3[onArrangementUpdate callback]
          B4[setViewerSyncArrangements]
          B5[ParticipantCard shows 'View Top 8' button]
          B6[Bob clicks 'View Top 8']
          B7[Navigate to /canvas/sessionCode/view/participantId]
          B8[Viewer Page loads]
          B9[🔴 BROKEN: Viewer page ViewerSync instance]
          B10[🔴 Shows 'No arrangement to view']

          A2 --> B1
          B1 --> B2
          B2 --> B3
          B3 --> B4
          B4 --> B5
          B5 --> B6
          B6 --> B7
          B7 --> B8
          B8 --> B9
          B9 --> B10
      end

      subgraph "What Should Work"
          C1[Viewer Page uses same ViewerSync]
          C2[getArrangement returns Dave's data]
          C3[Shows Dave's Top 8 cards]

          B8 -.-> C1
          C1 -.-> C2
          C2 -.-> C3
      end

      classDef working fill:#90EE90
      classDef broken fill:#FFB6C1
      classDef shouldWork fill:#87CEEB,stroke-dasharray: 5 5

      class D1,D2,D3,D4,D5,A1,A2,B1,B2,B3,B4,B5,B6,B7,B8 working
      class B9,B10 broken
      class C1,C2,C3 shouldWork



