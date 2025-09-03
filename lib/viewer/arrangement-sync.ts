import { getAblyService } from '@/lib/ably/ably-service';
import type { ArrangementViewData } from '@/types/viewer';
import type { RealtimeChannel } from 'ably';

interface ArrangementUpdateMessage {
  participantId: string;
  participantName: string;
  revealType: 'top8' | 'top3';
  cardPositions: Array<{
    cardId: string;
    x: number;
    y: number;
    pile: string;
  }>;
  timestamp: number;
}

export class ArrangementSync {
  private ablyService = getAblyService();
  private revealsChannel: RealtimeChannel | null = null;
  private currentSessionCode: string | null = null;
  
  // Debouncing for performance as per spec (200ms)
  private readonly UPDATE_DEBOUNCE_MS = 200;
  private readonly HIGHLIGHT_DURATION_MS = 300;
  
  private updateCallbacks = new Map<string, (arrangement: ArrangementViewData) => void>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  async initializeForSession(sessionCode: string): Promise<void> {
    if (this.currentSessionCode === sessionCode) {
      return; // Already initialized
    }

    // Clean up previous session
    if (this.currentSessionCode) {
      await this.cleanup();
    }

    // Wait for Ably to be ready before trying to get channels
    if (!this.ablyService.isReady()) {
      await this.ablyService.init();
    }

    this.currentSessionCode = sessionCode;
    this.revealsChannel = this.ablyService.getChannel(sessionCode, 'reveals');
  }

  subscribeToArrangementUpdates(
    participantId: string,
    callback: (arrangement: ArrangementViewData) => void
  ): () => void {
    if (!this.revealsChannel || !this.currentSessionCode) {
      console.warn('ArrangementSync not properly initialized');
      return () => {}; // No-op cleanup
    }

    // Store callback
    this.updateCallbacks.set(participantId, callback);

    const handleArrangementUpdate = (message: { data: ArrangementUpdateMessage }) => {
      const { participantId: msgParticipantId, participantName, revealType, cardPositions, timestamp } = message.data;
      
      // Only process updates for the target participant
      if (msgParticipantId !== participantId) {
        return;
      }

      // Debounce updates for performance
      this.debouncedUpdate(participantId, {
        participantId: msgParticipantId,
        participantName,
        revealType,
        cardPositions,
        lastUpdated: timestamp
      });
    };

    // Subscribe to arrangement updates
    const unsubscribe = this.ablyService.subscribe(
      this.currentSessionCode,
      'reveals',
      'arrangement-updated',
      handleArrangementUpdate
    );

    // Return cleanup function
    return () => {
      unsubscribe();
      this.updateCallbacks.delete(participantId);
      
      // Clean up debounce timer
      const timer = this.debounceTimers.get(participantId);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(participantId);
      }
    };
  }

  private debouncedUpdate(participantId: string, arrangement: ArrangementViewData): void {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(participantId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(() => {
      const callback = this.updateCallbacks.get(participantId);
      if (callback) {
        callback(arrangement);
      }
      this.debounceTimers.delete(participantId);
    }, this.UPDATE_DEBOUNCE_MS);

    this.debounceTimers.set(participantId, timer);
  }

  // Method to manually trigger arrangement update (for testing or immediate sync)
  async publishArrangementUpdate(arrangement: ArrangementViewData): Promise<void> {
    if (!this.revealsChannel) {
      throw new Error('ArrangementSync not initialized');
    }

    const updateMessage: ArrangementUpdateMessage = {
      participantId: arrangement.participantId,
      participantName: arrangement.participantName,
      revealType: arrangement.revealType,
      cardPositions: arrangement.cardPositions,
      timestamp: arrangement.lastUpdated
    };

    await this.revealsChannel.publish('arrangement-updated', updateMessage);
  }

  // Get current arrangement state (if available from channel history or cache)
  async getCurrentArrangement(participantId: string): Promise<ArrangementViewData | null> {
    if (!this.revealsChannel || !this.currentSessionCode) {
      return null;
    }

    try {
      // In a production implementation, this might query channel history 
      // or a persistent state store. For now, return null and rely on real-time updates.
      return null;
    } catch (error) {
      console.warn('Failed to get current arrangement:', error);
      return null;
    }
  }

  // Animation helper for card position changes
  animateCardTo(cardId: string, position: { x: number; y: number }): void {
    const cardElement = document.getElementById(cardId);
    if (!cardElement) return;

    // Apply smooth transition as per spec (300ms ease-out)
    cardElement.style.transition = 'transform 300ms ease-out';
    cardElement.style.transform = `translate(${position.x}px, ${position.y}px)`;
  }

  // Highlight recently changed cards as per spec (300ms glow effect)
  highlightRecentChanges(cardPositions: Array<{ cardId: string }>, timestamp: number): void {
    const now = Date.now();
    const recentThreshold = 2000; // 2 seconds

    if (now - timestamp < recentThreshold) {
      cardPositions.forEach(({ cardId }) => {
        const cardElement = document.getElementById(cardId);
        if (cardElement) {
          // Add highlight class
          cardElement.classList.add('viewer-highlight');
          
          // Remove after highlight duration
          setTimeout(() => {
            cardElement.classList.remove('viewer-highlight');
          }, this.HIGHLIGHT_DURATION_MS);
        }
      });
    }
  }

  async cleanup(): Promise<void> {
    // Clear all debounce timers
    this.debounceTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.debounceTimers.clear();

    // Clear callbacks
    this.updateCallbacks.clear();

    // Reset session data
    this.currentSessionCode = null;
    this.revealsChannel = null;
  }
}

// Singleton instance
let arrangementSyncInstance: ArrangementSync | null = null;

export function getArrangementSync(): ArrangementSync {
  if (!arrangementSyncInstance) {
    arrangementSyncInstance = new ArrangementSync();
  }
  return arrangementSyncInstance;
}

// Testing helper
export function resetArrangementSync(): void {
  if (arrangementSyncInstance) {
    arrangementSyncInstance.cleanup();
    arrangementSyncInstance = null;
  }
}