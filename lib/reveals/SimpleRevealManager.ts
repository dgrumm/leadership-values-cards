import type { AblyService } from '@/lib/ably/ably-service';
import type { Card } from '@/lib/types/card';
import { EventBus, getEventBus } from '@/lib/events/event-bus';
import { 
  EVENT_TYPES, 
  createBaseEvent,
  SelectionRevealedEvent
} from '@/lib/events/types';

// Reveal snapshot stored in Ably Presence data
export interface RevealSnapshot {
  type: 'top8' | 'top3';
  participantName: string;
  revealedAt: string;
  cards: Array<{
    id: string;
    value_name: string;
    description: string;
    position: { x: number; y: number };
    pile: string;
  }>;
}

// Presence data structure (what gets stored in Ably Presence)
export interface PresenceData {
  participantId: string;
  name: string;
  currentStep: 1 | 2 | 3;
  status: 'sorting' | 'revealed-8' | 'revealed-3';
  hasReveal: boolean;
  lastRevealedAt?: number;
  revealSnapshot?: RevealSnapshot;
}

// SimpleRevealManager - Snapshot-based reveals using Ably Presence
export class SimpleRevealManager {
  private ablyService: AblyService;
  private eventBus: EventBus;
  private sessionCode: string;
  private participantId: string;
  private participantName: string;
  private presenceChannel: any;

  constructor(
    ablyService: AblyService, 
    eventBus: EventBus,
    sessionCode: string, 
    participantId: string, 
    participantName: string
  ) {
    this.ablyService = ablyService;
    this.eventBus = eventBus;
    this.sessionCode = sessionCode;
    this.participantId = participantId;
    this.participantName = participantName;
    this.presenceChannel = ablyService.getChannel(sessionCode, 'presence');
  }

  /**
   * Reveal selection as immutable snapshot
   * Stores snapshot in Ably Presence data and publishes notification event
   */
  async revealSelection(type: 'top8' | 'top3', cards: Card[]): Promise<void> {
    try {
      // 1. Create immutable snapshot
      const snapshot: RevealSnapshot = {
        type,
        participantName: this.participantName,
        revealedAt: new Date().toISOString(),
        cards: cards.map(card => ({
          id: card.id,
          value_name: card.value_name,
          description: card.description,
          position: card.position,
          pile: card.pile
        }))
      };

      // 2. Store in presence data (single source of truth)
      const presenceData: PresenceData = {
        participantId: this.participantId,
        name: this.participantName,
        currentStep: type === 'top8' ? 2 : 3,
        status: type === 'top8' ? 'revealed-8' : 'revealed-3',
        hasReveal: true,
        lastRevealedAt: Date.now(),
        revealSnapshot: snapshot
      };

      await this.presenceChannel.presence.update(presenceData);

      // 3. Publish notification event (for real-time UI updates)
      const revealEvent: SelectionRevealedEvent = {
        ...createBaseEvent({
          type: EVENT_TYPES.SELECTION_REVEALED,
          sessionCode: this.sessionCode,
          participantId: this.participantId
        }),
        payload: {
          revealType: type,
          participantName: this.participantName,
          revealedAt: snapshot.revealedAt,
          // Legacy format for existing event handlers
          cardPositions: cards.map(card => ({
            cardId: card.id,
            x: card.position.x,
            y: card.position.y,
            pile: card.pile
          }))
        }
      };

      await this.eventBus.publishEvent(revealEvent);

      console.log(`📋 [SimpleRevealManager] Revealed ${type} for ${this.participantName}`, {
        participantId: this.participantId,
        cardCount: cards.length,
        snapshotSize: JSON.stringify(snapshot).length
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ [SimpleRevealManager] Failed to reveal selection:`, {
        participantId: this.participantId,
        type,
        error: message
      });
      throw new Error(`Failed to reveal ${type}: ${message}`);
    }
  }

  /**
   * Get reveal snapshot for a specific participant
   * Returns null if participant has no reveal or doesn't exist
   */
  async getReveal(targetParticipantId: string): Promise<RevealSnapshot | null> {
    try {
      const members = await this.presenceChannel.presence.get();
      
      const participant = members.find((m: any) => 
        m.data?.participantId === targetParticipantId
      );

      if (!participant?.data?.hasReveal || !participant?.data?.revealSnapshot) {
        return null;
      }

      return participant.data.revealSnapshot;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ [SimpleRevealManager] Failed to get reveal:`, {
        targetParticipantId,
        error: message
      });
      return null;
    }
  }

  /**
   * Get all revealed participants in the session
   * Returns array of participant data with reveal info
   */
  async getAllReveals(): Promise<Array<{ 
    participantId: string; 
    name: string; 
    revealType: 'top8' | 'top3';
    revealedAt: string;
    hasReveal: boolean;
  }>> {
    try {
      const members = await this.presenceChannel.presence.get();
      
      return members
        .filter((m: any) => m.data?.hasReveal && m.data?.revealSnapshot)
        .map((m: any) => ({
          participantId: m.data.participantId,
          name: m.data.name,
          revealType: m.data.revealSnapshot.type,
          revealedAt: m.data.revealSnapshot.revealedAt,
          hasReveal: true
        }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ [SimpleRevealManager] Failed to get all reveals:`, {
        error: message
      });
      return [];
    }
  }

  /**
   * Unreveal selection (remove snapshot from presence data)
   * Used if participant wants to hide their reveal
   */
  async unrevealSelection(): Promise<void> {
    try {
      // Clear reveal data but keep presence
      const presenceData: PresenceData = {
        participantId: this.participantId,
        name: this.participantName,
        currentStep: 2, // Back to sorting
        status: 'sorting',
        hasReveal: false,
        revealSnapshot: undefined // Remove snapshot
      };

      await this.presenceChannel.presence.update(presenceData);

      console.log(`🫣 [SimpleRevealManager] Unrevealed selection for ${this.participantName}`, {
        participantId: this.participantId
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ [SimpleRevealManager] Failed to unreveal selection:`, {
        participantId: this.participantId,
        error: message
      });
      throw new Error(`Failed to unreveal selection: ${message}`);
    }
  }

  /**
   * Check if current participant has a reveal
   */
  async hasReveal(): Promise<{ hasReveal: boolean; type?: 'top8' | 'top3' }> {
    try {
      const snapshot = await this.getReveal(this.participantId);
      return {
        hasReveal: !!snapshot,
        type: snapshot?.type
      };
    } catch (error) {
      return { hasReveal: false };
    }
  }

  /**
   * Validate reveal snapshot structure
   */
  static validateRevealSnapshot(snapshot: unknown): RevealSnapshot {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('Invalid snapshot format');
    }
    
    const s = snapshot as any;
    
    if (!['top8', 'top3'].includes(s.type)) {
      throw new Error('Invalid reveal type - must be top8 or top3');
    }
    
    if (!s.participantName || typeof s.participantName !== 'string') {
      throw new Error('Invalid participant name');
    }
    
    if (!s.revealedAt || typeof s.revealedAt !== 'string') {
      throw new Error('Invalid revealed timestamp');
    }
    
    if (!Array.isArray(s.cards) || s.cards.length === 0) {
      throw new Error('Invalid cards array - must be non-empty array');
    }
    
    // Validate each card
    s.cards.forEach((card: any, index: number) => {
      if (!card.id || typeof card.id !== 'string') {
        throw new Error(`Invalid card ID at index ${index}`);
      }
      if (!card.value_name || typeof card.value_name !== 'string') {
        throw new Error(`Invalid card value_name at index ${index}`);
      }
      if (!card.description || typeof card.description !== 'string') {
        throw new Error(`Invalid card description at index ${index}`);
      }
      if (!card.position || typeof card.position.x !== 'number' || typeof card.position.y !== 'number') {
        throw new Error(`Invalid card position at index ${index}`);
      }
      if (!card.pile || typeof card.pile !== 'string') {
        throw new Error(`Invalid card pile at index ${index}`);
      }
    });
    
    return s as RevealSnapshot;
  }
}

// Utility function to create SimpleRevealManager instance
export function createSimpleRevealManager(
  ablyService: AblyService,
  eventBus: EventBus,
  sessionCode: string,
  participantId: string,
  participantName: string
): SimpleRevealManager {
  return new SimpleRevealManager(ablyService, eventBus, sessionCode, participantId, participantName);
}