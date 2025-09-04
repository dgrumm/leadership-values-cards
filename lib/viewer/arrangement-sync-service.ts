import type { AblyService } from '@/lib/ably/ably-service';
import type { ArrangementViewData } from '@/types/viewer';
import { EVENT_TYPES, type SelectionRevealedEvent, type ArrangementUpdatedEvent } from '@/lib/events/types';

/**
 * Service for syncing arrangement data in real-time for viewer mode
 * Handles debounced updates and maintains connection to target participant's state
 */
export class ArrangementSyncService {
  private ablyService: AblyService;
  private sessionCode: string;
  private currentArrangements = new Map<string, ArrangementViewData>();
  private updateCallbacks = new Map<string, (arrangement: ArrangementViewData) => void>();
  private unsubscribeFunctions = new Map<string, () => void>();
  
  // Debounce settings
  private readonly DEBOUNCE_MS = 200;
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(ablyService: AblyService, sessionCode: string) {
    this.ablyService = ablyService;
    this.sessionCode = sessionCode;
  }

  /**
   * Initialize the service and setup base event listeners
   */
  async initialize(): Promise<void> {
    try {
      // UPDATED: Listen to ViewerSync channels instead of old RevealManager events
      const revealsChannel = await this.ablyService.getChannel(this.sessionCode, 'reveals');
      
      // Listen for arrangement revealed events from ViewerSync
      await revealsChannel.subscribe('arrangement-revealed', (message) => {
        console.log(`🎉 [ArrangementSync] Received arrangement-revealed from ViewerSync:`, message);
        this.handleViewerSyncReveal(message.data);
      });
      
      // Listen for arrangement update events from ViewerSync
      await revealsChannel.subscribe('arrangement-updated', (message) => {
        console.log(`🔄 [ArrangementSync] Received arrangement-updated from ViewerSync:`, message);
        this.handleViewerSyncUpdate(message.data);
      });

      // Listen for arrangement hidden events from ViewerSync
      await revealsChannel.subscribe('arrangement-hidden', (message) => {
        console.log(`👁️‍🗨️ [ArrangementSync] Received arrangement-hidden from ViewerSync:`, message);
        this.handleViewerSyncHidden(message.data);
      });
      
      console.log(`📡 [ArrangementSync] Initialized for session ${this.sessionCode} on reveals channel (ViewerSync)`);
    } catch (error) {
      console.error('[ArrangementSync] Failed to initialize:', error);
      throw new Error('Failed to initialize arrangement sync service');
    }
  }

  /**
   * Subscribe to live arrangement updates for a specific participant
   */
  subscribeToParticipant(
    participantId: string, 
    onUpdate: (arrangement: ArrangementViewData) => void
  ): () => void {
    console.log(`👀 [ArrangementSync] Subscribing to participant: "${participantId}"`);
    console.log(`📝 [ArrangementSync] Full participant ID details:`, { 
      participantId, 
      length: participantId.length,
      encoded: encodeURIComponent(participantId)
    });
    
    // Store the callback
    this.updateCallbacks.set(participantId, onUpdate);

    // Try to get current arrangement immediately
    this.getCurrentArrangement(participantId).then((arrangement) => {
      if (arrangement) {
        onUpdate(arrangement);
      }
    }).catch((error) => {
      console.warn(`[ArrangementSync] Failed to get current arrangement for ${participantId}:`, error);
    });

    // Return cleanup function
    const cleanup = () => {
      this.updateCallbacks.delete(participantId);
      
      // Clear any pending debounce timer
      const timer = this.debounceTimers.get(participantId);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(participantId);
      }
      
      console.log(`👋 [ArrangementSync] Unsubscribed from participant ${participantId}`);
    };

    this.unsubscribeFunctions.set(participantId, cleanup);
    return cleanup;
  }

  /**
   * Get current arrangement for a participant (if available)
   */
  async getCurrentArrangement(participantId: string): Promise<ArrangementViewData | null> {
    // Check if we have cached data first
    const cached = this.currentArrangements.get(participantId);
    if (cached) {
      console.log(`✅ [ArrangementSync] Found cached arrangement for ${participantId}`);
      return cached;
    }

    try {
      // Query ViewerSync reveals channel for this participant's arrangements
      console.log(`🔍 [ArrangementSync] Querying ViewerSync reveals channel for participant ${participantId}`);
      
      const revealsChannel = await this.ablyService.getChannel(this.sessionCode, 'reveals');
      const history = await revealsChannel.history({ limit: 50 });
      
      console.log(`📚 [ArrangementSync] Retrieved ${history.items.length} ViewerSync events`);
      
      // Find the most recent arrangement-revealed event for this participant
      const recentReveal = history.items.reverse().find(message => {
        const isRevealEvent = message.name === 'arrangement-revealed';
        const matchesParticipant = message.data?.participantId === participantId;
        const isCurrentlyRevealed = message.data?.isRevealed === true;
        
        console.log(`📝 [ArrangementSync] Checking ViewerSync event: ${message.name} for participant ${message.data?.participantId} (target: ${participantId}) revealed: ${message.data?.isRevealed}`);
        
        return isRevealEvent && matchesParticipant && isCurrentlyRevealed;
      });
      
      if (recentReveal) {
        console.log(`🎉 [ArrangementSync] Found recent ViewerSync reveal for ${participantId}:`, recentReveal.data);
        
        // Convert ViewerSync format to ArrangementViewData
        const data = recentReveal.data;
        const revealType = data.step === 'step2' ? 'top8' : 'top3';
        const cardPositions = data.cards?.map((card: any, index: number) => ({
          cardId: card.id,
          x: card.position?.x || (50 + (index % 4) * 200), // Grid: 4 cards per row, 200px apart
          y: card.position?.y || (50 + Math.floor(index / 4) * 150), // Grid: 150px between rows
          pile: card.pile || revealType,
          // Include the complete card data for rendering
          card: {
            id: card.id,
            value_name: card.value_name,
            description: card.description,
            position: { x: 0, y: 0 },
            pile: card.pile
          }
        })) || [];

        const arrangement: ArrangementViewData = {
          participantId,
          participantName: data.participantName || participantId,
          revealType: revealType as 'top8' | 'top3',
          cardPositions,
          lastUpdated: data.lastUpdated || recentReveal.timestamp
        };
        
        // Cache the arrangement for future requests
        this.currentArrangements.set(participantId, arrangement);
        
        return arrangement;
      } else {
        console.log(`📭 [ArrangementSync] No ViewerSync reveal found for participant ${participantId}`);
        return null;
      }
    } catch (error) {
      console.error(`[ArrangementSync] Failed to query channel history for ${participantId}:`, error);
      // Gracefully degrade to null for missing arrangements
      return null;
    }
  }

  /**
   * Handle ViewerSync arrangement-revealed events
   */
  private handleViewerSyncReveal(arrangement: any): void {
    const { participantId, participantName, step, cards, isRevealed } = arrangement;
    
    console.log(`🎉 [ArrangementSync] Processing ViewerSync reveal from participant ${participantId}`);
    console.log(`📋 [ArrangementSync] Currently subscribed to participants:`, Array.from(this.updateCallbacks.keys()));
    
    if (!participantId || !this.updateCallbacks.has(participantId)) {
      console.log(`⏭️ [ArrangementSync] Ignoring event - no subscription for participant ${participantId}`);
      return;
    }

    if (!isRevealed) {
      console.log(`⏭️ [ArrangementSync] Ignoring event - arrangement not revealed for participant ${participantId}`);
      return;
    }

    // Convert ViewerSync format to ArrangementViewData format
    const revealType = step === 'step2' ? 'top8' : 'top3';
    const cardPositions = cards.map((card: any, index: number) => ({
      cardId: card.id,
      x: card.position?.x || (50 + (index % 4) * 200), // Grid: 4 cards per row, 200px apart
      y: card.position?.y || (50 + Math.floor(index / 4) * 150), // Grid: 150px between rows
      pile: card.pile || revealType,
      // Include the complete card data for rendering
      card: {
        id: card.id,
        value_name: card.value_name,
        description: card.description,
        position: { x: 0, y: 0 },
        pile: card.pile
      }
    }));

    const arrangementData: ArrangementViewData = {
      participantId,
      participantName: participantName || participantId,
      revealType: revealType as 'top8' | 'top3',
      cardPositions,
      lastUpdated: arrangement.lastUpdated || Date.now()
    };

    this.currentArrangements.set(participantId, arrangementData);
    
    const callback = this.updateCallbacks.get(participantId);
    if (callback) {
      this.debounceUpdate(participantId, callback, arrangementData);
    }
  }

  /**
   * Handle ViewerSync arrangement-updated events
   */
  private handleViewerSyncUpdate(data: any): void {
    const { participantId, delta } = data;
    
    if (!participantId || !this.updateCallbacks.has(participantId)) {
      return;
    }

    const current = this.currentArrangements.get(participantId);
    if (!current) {
      console.log(`⚠️ [ArrangementSync] Received update for ${participantId} but no current arrangement`);
      return;
    }

    // Apply the delta update
    const updated = { ...current, ...delta, lastUpdated: Date.now() };
    this.currentArrangements.set(participantId, updated);

    const callback = this.updateCallbacks.get(participantId);
    if (callback) {
      this.debounceUpdate(participantId, callback, updated);
    }
  }

  /**
   * Handle ViewerSync arrangement-hidden events
   */
  private handleViewerSyncHidden(data: any): void {
    const { participantId } = data;
    
    if (!participantId) return;
    
    console.log(`👁️‍🗨️ [ArrangementSync] Arrangement hidden for ${participantId}`);
    this.currentArrangements.delete(participantId);
    
    // Notify subscriber that arrangement is no longer available
    const callback = this.updateCallbacks.get(participantId);
    if (callback) {
      callback(null as any); // Signal that arrangement is hidden
    }
  }

  /**
   * Handle selection revealed events (initial reveal) - LEGACY SUPPORT
   */
  private handleSelectionRevealed(event: SelectionRevealedEvent): void {
    const { participantId, payload } = event;
    
    console.log(`🎉 [ArrangementSync] Processing reveal event from participant ${participantId}`);
    console.log(`📋 [ArrangementSync] Currently subscribed to participants:`, Array.from(this.updateCallbacks.keys()));
    
    if (!participantId || !this.updateCallbacks.has(participantId)) {
      console.log(`⏭️ [ArrangementSync] Ignoring event - no subscription for participant ${participantId}`);
      return; // No one subscribed to this participant
    }

    console.log(`🎉 [ArrangementSync] Participant ${participantId} revealed their selection`);

    // Extract participant name from payload or use participantId as fallback
    const participantName = payload.participantName || participantId;

    // Create arrangement data from reveal event
    const arrangement: ArrangementViewData = {
      participantId,
      participantName,
      revealType: payload.revealType,
      cardPositions: payload.cardPositions,
      lastUpdated: event.timestamp
    };

    // Cache the arrangement
    this.currentArrangements.set(participantId, arrangement);

    // Immediately notify subscriber (no debouncing for initial reveals)
    const callback = this.updateCallbacks.get(participantId);
    if (callback) {
      callback(arrangement);
    }
  }

  /**
   * Handle arrangement update events (live card movements after reveal) with debouncing
   */
  private handleArrangementUpdate(event: ArrangementUpdatedEvent): void {
    const { participantId, payload } = event;
    
    if (!participantId || !this.updateCallbacks.has(participantId)) {
      return; // No one subscribed to this participant
    }

    console.log(`📝 [ArrangementSync] Received arrangement update for ${participantId}`);

    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(participantId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced update
    const timer = setTimeout(() => {
      // Get existing arrangement or create basic one
      const existingArrangement = this.currentArrangements.get(participantId);
      const participantName = existingArrangement?.participantName || payload.participantName || participantId;
      
      const arrangement: ArrangementViewData = {
        participantId,
        participantName,
        revealType: existingArrangement?.revealType || payload.revealType,
        cardPositions: payload.cardPositions,
        lastUpdated: event.timestamp
      };

      // Cache the arrangement
      this.currentArrangements.set(participantId, arrangement);

      // Notify subscriber
      const callback = this.updateCallbacks.get(participantId);
      if (callback) {
        callback(arrangement);
      }

      // Clean up timer reference
      this.debounceTimers.delete(participantId);
    }, this.DEBOUNCE_MS);

    this.debounceTimers.set(participantId, timer);
  }

  /**
   * Clean up all subscriptions and timers
   */
  cleanup(): void {
    console.log('🧹 [ArrangementSync] Cleaning up service');
    
    // Clear all debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    // Call all cleanup functions
    this.unsubscribeFunctions.forEach(cleanup => cleanup());
    this.unsubscribeFunctions.clear();
    
    // Clear caches
    this.currentArrangements.clear();
    this.updateCallbacks.clear();
  }

  /**
   * Get all participants we're currently tracking
   */
  getTrackedParticipants(): string[] {
    return Array.from(this.updateCallbacks.keys());
  }

  /**
   * Check if we have a cached arrangement for a participant
   */
  hasCachedArrangement(participantId: string): boolean {
    return this.currentArrangements.has(participantId);
  }
}