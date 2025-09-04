import type { AblyService } from '@/lib/ably/ably-service';
import type { Card } from '@/lib/types/card';

export interface ViewerArrangement {
  participantId: string;
  participantName: string;
  step: 'step2' | 'step3';
  cards: Card[];
  isRevealed: boolean;
  lastUpdated: number;
}

export interface ViewerSyncOptions {
  sessionCode: string;
  ablyService: AblyService;
  onArrangementUpdate: (arrangement: ViewerArrangement) => void;
  onArrangementRemoved: (participantId: string) => void;
}

export class ViewerSync {
  private ablyService: AblyService;
  private sessionCode: string;
  private onArrangementUpdate: (arrangement: ViewerArrangement) => void;
  private onArrangementRemoved: (participantId: string) => void;
  private revealsChannel: any;
  private currentArrangements: Map<string, ViewerArrangement> = new Map();
  private isInitialized = false;

  constructor(options: ViewerSyncOptions) {
    this.ablyService = options.ablyService;
    this.sessionCode = options.sessionCode;
    this.onArrangementUpdate = options.onArrangementUpdate;
    this.onArrangementRemoved = options.onArrangementRemoved;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.revealsChannel = this.ablyService.getChannel(this.sessionCode, 'reveals');
      
      // Subscribe to reveal events
      await this.revealsChannel.subscribe('arrangement-revealed', this.handleArrangementRevealed.bind(this));
      await this.revealsChannel.subscribe('arrangement-updated', this.handleArrangementUpdated.bind(this));
      await this.revealsChannel.subscribe('arrangement-hidden', this.handleArrangementHidden.bind(this));
      
      // Request current state for all revealed arrangements
      await this.requestCurrentArrangements();
      
      this.isInitialized = true;
      console.log(`📡 [ViewerSync] Initialized for session ${this.sessionCode}`);
    } catch (error) {
      console.error('[ViewerSync] Failed to initialize:', error);
      throw new Error('Failed to initialize viewer sync service');
    }
  }

  private async requestCurrentArrangements() {
    try {
      // Request history of revealed arrangements
      const history = await this.revealsChannel.history({ limit: 50 });
      
      console.log(`📚 [ViewerSync] Retrieved ${history.items.length} historical reveal events`);
      
      // Process events in reverse chronological order to get latest state
      const processedParticipants = new Set<string>();
      
      history.items.reverse().forEach((message: any) => {
        if (message.name === 'arrangement-revealed' && !processedParticipants.has(message.data.participantId)) {
          processedParticipants.add(message.data.participantId);
          this.handleArrangementRevealed(message);
        }
      });
    } catch (error) {
      console.warn('[ViewerSync] Failed to load arrangement history:', error);
    }
  }

  private handleArrangementRevealed(message: any) {
    const arrangement: ViewerArrangement = message.data;
    console.log(`🎉 [ViewerSync] Arrangement revealed for ${arrangement.participantId}`);
    
    this.currentArrangements.set(arrangement.participantId, arrangement);
    this.onArrangementUpdate(arrangement);
  }

  private handleArrangementUpdated(message: any) {
    const { participantId, delta } = message.data;
    const current = this.currentArrangements.get(participantId);
    
    if (current) {
      console.log(`📝 [ViewerSync] Applying delta update for ${participantId}`);
      
      // Apply delta update
      const updated = this.applyDelta(current, delta);
      this.currentArrangements.set(participantId, updated);
      this.onArrangementUpdate(updated);
    }
  }

  private handleArrangementHidden(message: any) {
    const { participantId } = message.data;
    console.log(`👁️‍🗨️ [ViewerSync] Arrangement hidden for ${participantId}`);
    
    this.currentArrangements.delete(participantId);
    this.onArrangementRemoved(participantId);
  }

  private applyDelta(current: ViewerArrangement, delta: any): ViewerArrangement {
    return {
      ...current,
      ...delta,
      lastUpdated: Date.now()
    };
  }

  // Public API for participants to broadcast their reveals
  async revealArrangement(arrangement: ViewerArrangement): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('ViewerSync not initialized');
    }

    console.log(`📤 [ViewerSync] Broadcasting arrangement reveal for ${arrangement.participantId}`);
    await this.revealsChannel.publish('arrangement-revealed', arrangement);
  }

  async updateArrangement(participantId: string, delta: Partial<ViewerArrangement>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('ViewerSync not initialized');
    }

    console.log(`📤 [ViewerSync] Broadcasting arrangement update for ${participantId}`);
    await this.revealsChannel.publish('arrangement-updated', {
      participantId,
      delta: { ...delta, lastUpdated: Date.now() }
    });
  }

  async hideArrangement(participantId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('ViewerSync not initialized');
    }

    console.log(`📤 [ViewerSync] Broadcasting arrangement hide for ${participantId}`);
    await this.revealsChannel.publish('arrangement-hidden', { participantId });
  }

  getArrangement(participantId: string): ViewerArrangement | undefined {
    return this.currentArrangements.get(participantId);
  }

  getAllArrangements(): ViewerArrangement[] {
    return Array.from(this.currentArrangements.values());
  }

  getRevealedParticipantIds(): string[] {
    return Array.from(this.currentArrangements.keys());
  }

  destroy(): void {
    if (this.revealsChannel) {
      this.revealsChannel.unsubscribe();
      console.log(`🧹 [ViewerSync] Cleaned up for session ${this.sessionCode}`);
    }
    this.currentArrangements.clear();
    this.isInitialized = false;
  }
}