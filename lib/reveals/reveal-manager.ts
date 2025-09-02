import { EventBus } from '../events/event-bus';
import { 
  EVENT_TYPES, 
  createBaseEvent,
  SelectionRevealedEvent,
  SelectionUnrevealedEvent,
  ArrangementUpdatedEvent,
  ViewerJoinedEvent,
  ViewerLeftEvent,
  BaseEvent 
} from '../events/types';

// Reveal state interface
export interface RevealState {
  participantId: string;
  sessionCode: string;
  revealType: 'top8' | 'top3';
  isRevealed: boolean;
  cardPositions: Array<{
    cardId: string;
    x: number;
    y: number;
    pile: string;
  }>;
  lastUpdated: number;
  viewerCount: number;
}

// Card position interface
export interface CardPosition {
  cardId: string;
  x: number;
  y: number;
  pile: string;
}

// Reveal manager for handling reveal operations
export class RevealManager {
  private eventBus: EventBus;
  private sessionCode: string;
  private participantId: string;
  private participantName: string;
  private revealed: Map<string, RevealState> = new Map(); // participantId -> RevealState
  private viewers: Map<string, Set<string>> = new Map();   // participantId -> Set<viewerId>
  private isCleanedUp = false;
  private eventSubscriptions: Array<() => void> = [];

  constructor(eventBus: EventBus, sessionCode: string, participantId: string, participantName: string) {
    this.eventBus = eventBus;
    this.sessionCode = sessionCode;
    this.participantId = participantId;
    this.participantName = participantName;
    
    this.setupEventListeners();
  }

  // Reveal selection to other participants
  async revealSelection(revealType: 'top8' | 'top3', cardPositions: CardPosition[]): Promise<void> {
    if (this.isCleanedUp) {
      throw new Error('RevealManager has been cleaned up');
    }

    const revealEvent: SelectionRevealedEvent = {
      ...createBaseEvent({
        type: EVENT_TYPES.SELECTION_REVEALED,
        sessionCode: this.sessionCode,
        participantId: this.participantId
      }),
      payload: {
        revealType,
        cardPositions,
        participantName: this.participantName
      }
    };
    
    await this.eventBus.publishEvent(revealEvent);

    // Update local state
    const revealState: RevealState = {
      participantId: this.participantId,
      sessionCode: this.sessionCode,
      revealType,
      isRevealed: true,
      cardPositions,
      lastUpdated: Date.now(),
      viewerCount: 0
    };

    this.revealed.set(this.participantId, revealState);
  }

  // Hide previously revealed selection
  async unrevealSelection(revealType: 'top8' | 'top3'): Promise<void> {
    if (this.isCleanedUp) {
      throw new Error('RevealManager has been cleaned up');
    }

    const unrevealEvent: SelectionUnrevealedEvent = {
      ...createBaseEvent({
        type: EVENT_TYPES.SELECTION_UNREVEALED,
        sessionCode: this.sessionCode,
        participantId: this.participantId
      }),
      payload: {
        revealType,
        participantName: this.participantName
      }
    };
    
    await this.eventBus.publishEvent(unrevealEvent);

    // Update local state
    const existingState = this.revealed.get(this.participantId);
    if (existingState && existingState.revealType === revealType) {
      this.revealed.delete(this.participantId);
    }
  }

  // Update arrangement for live sync during reveal
  async updateArrangement(revealType: 'top8' | 'top3', cardPositions: CardPosition[]): Promise<void> {
    if (this.isCleanedUp) {
      throw new Error('RevealManager has been cleaned up');
    }

    const existingState = this.revealed.get(this.participantId);
    if (!existingState || !existingState.isRevealed || existingState.revealType !== revealType) {
      throw new Error('Cannot update arrangement - not currently revealed');
    }

    const updateEvent: ArrangementUpdatedEvent = {
      ...createBaseEvent({
        type: EVENT_TYPES.ARRANGEMENT_UPDATED,
        sessionCode: this.sessionCode,
        participantId: this.participantId
      }),
      payload: {
        revealType,
        cardPositions,
        participantName: this.participantName
      }
    };
    
    await this.eventBus.publishEvent(updateEvent);

    // Update local state
    existingState.cardPositions = cardPositions;
    existingState.lastUpdated = Date.now();
  }

  // Join as viewer for another participant's revealed selection
  async joinViewer(targetParticipantId: string): Promise<void> {
    if (this.isCleanedUp) {
      throw new Error('RevealManager has been cleaned up');
    }

    const targetReveal = this.revealed.get(targetParticipantId);
    if (!targetReveal || !targetReveal.isRevealed) {
      throw new Error('Target participant has not revealed their selection');
    }

    const viewerEvent: ViewerJoinedEvent = {
      ...createBaseEvent({
        type: EVENT_TYPES.VIEWER_JOINED,
        sessionCode: this.sessionCode,
        participantId: this.participantId
      }),
      payload: {
        targetParticipantId,
        viewerName: this.participantName
      }
    };
    
    await this.eventBus.publishEvent(viewerEvent);
  }

  // Leave as viewer for another participant's revealed selection
  async leaveViewer(targetParticipantId: string): Promise<void> {
    if (this.isCleanedUp) {
      throw new Error('RevealManager has been cleaned up');
    }

    const viewerLeftEvent: ViewerLeftEvent = {
      ...createBaseEvent({
        type: EVENT_TYPES.VIEWER_LEFT,
        sessionCode: this.sessionCode,
        participantId: this.participantId
      }),
      payload: {
        targetParticipantId,
        viewerName: this.participantName
      }
    };
    
    await this.eventBus.publishEvent(viewerLeftEvent);
  }

  // Get reveal state for a participant
  getRevealState(participantId: string): RevealState | undefined {
    return this.revealed.get(participantId);
  }

  // Get all revealed participants
  getRevealedParticipants(): RevealState[] {
    return Array.from(this.revealed.values()).filter(state => state.isRevealed);
  }

  // Get viewer count for a participant
  getViewerCount(participantId: string): number {
    const viewers = this.viewers.get(participantId);
    return viewers ? viewers.size : 0;
  }

  // Get viewers for a participant
  getViewers(participantId: string): string[] {
    const viewers = this.viewers.get(participantId);
    return viewers ? Array.from(viewers) : [];
  }

  // Check if current participant is revealed
  isRevealed(revealType?: 'top8' | 'top3'): boolean {
    const state = this.revealed.get(this.participantId);
    if (!state || !state.isRevealed) return false;
    if (revealType) return state.revealType === revealType;
    return true;
  }

  // Setup event listeners
  private setupEventListeners(): void {
    const subscriptions = [
      this.eventBus.subscribeToEventType(EVENT_TYPES.SELECTION_REVEALED, this.handleRevealEvent.bind(this)),
      this.eventBus.subscribeToEventType(EVENT_TYPES.SELECTION_UNREVEALED, this.handleUnrevealEvent.bind(this)),
      this.eventBus.subscribeToEventType(EVENT_TYPES.ARRANGEMENT_UPDATED, this.handleArrangementUpdate.bind(this)),
      this.eventBus.subscribeToEventType(EVENT_TYPES.VIEWER_JOINED, this.handleViewerJoined.bind(this)),
      this.eventBus.subscribeToEventType(EVENT_TYPES.VIEWER_LEFT, this.handleViewerLeft.bind(this))
    ];

    this.eventSubscriptions = subscriptions;
  }

  // Event handlers
  private handleRevealEvent(event: SelectionRevealedEvent): void {
    const { participantId } = event;
    const { revealType, cardPositions } = event.payload;

    const revealState: RevealState = {
      participantId,
      sessionCode: this.sessionCode,
      revealType,
      isRevealed: true,
      cardPositions,
      lastUpdated: event.timestamp,
      viewerCount: 0
    };

    this.revealed.set(participantId, revealState);
  }

  private handleUnrevealEvent(event: SelectionUnrevealedEvent): void {
    const { participantId } = event;
    const { revealType } = event.payload;

    const existingState = this.revealed.get(participantId);
    if (existingState && existingState.revealType === revealType) {
      this.revealed.delete(participantId);
      this.viewers.delete(participantId); // Clear viewers when unrevealed
    }
  }

  private handleArrangementUpdate(event: ArrangementUpdatedEvent): void {
    const { participantId } = event;
    const { revealType, cardPositions } = event.payload;

    const existingState = this.revealed.get(participantId);
    if (existingState && existingState.revealType === revealType && existingState.isRevealed) {
      existingState.cardPositions = cardPositions;
      existingState.lastUpdated = event.timestamp;
    }
  }

  private handleViewerJoined(event: ViewerJoinedEvent): void {
    const { participantId } = event;
    const { targetParticipantId } = event.payload;

    // Add viewer to target participant's viewer set
    if (!this.viewers.has(targetParticipantId)) {
      this.viewers.set(targetParticipantId, new Set());
    }
    this.viewers.get(targetParticipantId)!.add(participantId);

    // Update viewer count in reveal state
    const revealState = this.revealed.get(targetParticipantId);
    if (revealState) {
      revealState.viewerCount = this.viewers.get(targetParticipantId)!.size;
    }
  }

  private handleViewerLeft(event: ViewerLeftEvent): void {
    const { participantId } = event;
    const { targetParticipantId } = event.payload;

    // Remove viewer from target participant's viewer set
    const viewers = this.viewers.get(targetParticipantId);
    if (viewers) {
      viewers.delete(participantId);
      
      if (viewers.size === 0) {
        this.viewers.delete(targetParticipantId);
      }
    }

    // Update viewer count in reveal state
    const revealState = this.revealed.get(targetParticipantId);
    if (revealState) {
      revealState.viewerCount = viewers ? viewers.size : 0;
    }
  }

  // Cleanup
  cleanup(): void {
    // Unsubscribe from all events
    this.eventSubscriptions.forEach(unsubscribe => unsubscribe());
    this.eventSubscriptions = [];
    
    // Clear state
    this.revealed.clear();
    this.viewers.clear();
    
    // Mark as cleaned up
    this.isCleanedUp = true;
  }
}