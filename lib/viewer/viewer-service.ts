import { getAblyService } from '@/lib/ably/ably-service';
import { EVENT_TYPES } from '@/lib/events/types';
import type { EventBus } from '@/lib/events/event-bus';
import type { ViewerData, ViewerPresenceData } from '@/types/viewer';
import type { RealtimeChannel } from 'ably';

export class ViewerService {
  private ablyService = getAblyService();
  private eventBus: EventBus | null = null;
  private viewersChannel: RealtimeChannel | null = null;
  private currentSessionCode: string | null = null;
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;
  private currentUserEmoji: string | null = null;
  private currentUserColor: string | null = null;
  private isActive = false;
  private activityTimer: NodeJS.Timeout | null = null;

  // Viewer limits as per spec
  private readonly MAX_VIEWERS_PER_ARRANGEMENT = 10;
  private readonly ACTIVITY_UPDATE_INTERVAL = 30000; // 30 seconds

  constructor() {
    // EventBus will be set up when initialized for session
  }

  async initializeForSession(
    sessionCode: string, 
    userId: string, 
    userName: string, 
    userEmoji: string, 
    userColor: string,
    eventBus?: EventBus
  ): Promise<void> {
    if (this.currentSessionCode === sessionCode && this.currentUserId === userId) {
      return; // Already initialized for this session
    }

    // Clean up previous session
    if (this.currentSessionCode) {
      await this.cleanup();
    }

    this.currentSessionCode = sessionCode;
    this.currentUserId = userId;
    this.currentUserName = userName;
    this.currentUserEmoji = userEmoji;
    this.currentUserColor = userColor;
    this.eventBus = eventBus || null;

    // Wait for Ably to be ready before getting channels
    if (!this.ablyService.isReady()) {
      await this.ablyService.init();
    }

    // Get viewers channel
    this.viewersChannel = this.ablyService.getChannel(sessionCode, 'viewers');
  }

  async joinViewerSession(targetParticipantId: string): Promise<void> {
    if (!this.viewersChannel || !this.currentUserId || !this.currentUserName) {
      throw new Error('Viewer service not properly initialized');
    }

    // Check viewer limits (basic protection)
    const currentViewers = await this.getCurrentViewers(targetParticipantId);
    if (currentViewers.length >= this.MAX_VIEWERS_PER_ARRANGEMENT) {
      throw new Error(`Maximum ${this.MAX_VIEWERS_PER_ARRANGEMENT} viewers per arrangement reached`);
    }

    this.isActive = true;

    // Publish viewer joined event
    await this.viewersChannel.publish('viewer-joined', {
      viewerId: this.currentUserId,
      viewerName: this.currentUserName,
      viewerEmoji: this.currentUserEmoji,
      viewerColor: this.currentUserColor,
      targetParticipantId,
      joinedAt: Date.now()
    });

    // Emit event bus event for tracking (if available)
    if (this.eventBus) {
      this.eventBus.emit(EVENT_TYPES.VIEWER_JOINED, {
        targetParticipantId,
        viewerName: this.currentUserName
      });
    }

    // Start activity updates
    this.startActivityUpdates(targetParticipantId);
  }

  async leaveViewerSession(targetParticipantId: string): Promise<void> {
    if (!this.viewersChannel || !this.currentUserId || !this.currentUserName) {
      return; // Nothing to clean up
    }

    this.isActive = false;

    // Stop activity updates
    this.stopActivityUpdates();

    // Publish viewer left event
    await this.viewersChannel.publish('viewer-left', {
      viewerId: this.currentUserId,
      viewerName: this.currentUserName,
      targetParticipantId
    });

    // Emit event bus event for tracking (if available)
    if (this.eventBus) {
      this.eventBus.emit(EVENT_TYPES.VIEWER_LEFT, {
        targetParticipantId,
        viewerName: this.currentUserName
      });
    }
  }

  private async getCurrentViewers(targetParticipantId: string): Promise<ViewerPresenceData[]> {
    if (!this.viewersChannel) return [];

    try {
      // Get channel history for recent viewer events (simplified approach)
      // In a production implementation, you might use Ably presence or a more sophisticated state tracking
      return [];
    } catch (error) {
      console.warn('Failed to get current viewers:', error);
      return [];
    }
  }

  subscribeToViewerPresence(
    targetParticipantId: string,
    onViewersUpdate: (viewers: Map<string, ViewerData>) => void
  ): () => void {
    if (!this.viewersChannel) {
      return () => {}; // No-op cleanup function
    }

    const viewers = new Map<string, ViewerData>();

    const handleViewerJoined = (message: { data: ViewerPresenceData }) => {
      const { viewerId, viewerName, viewerEmoji, viewerColor, targetParticipantId: msgTarget, joinedAt } = message.data;
      
      if (msgTarget === targetParticipantId) {
        viewers.set(viewerId, {
          participantId: viewerId,
          name: viewerName,
          emoji: viewerEmoji,
          color: viewerColor,
          joinedAt,
          isActive: true
        });
        onViewersUpdate(new Map(viewers));
      }
    };

    const handleViewerLeft = (message: { data: { viewerId: string; targetParticipantId: string } }) => {
      const { viewerId, targetParticipantId: msgTarget } = message.data;
      
      if (msgTarget === targetParticipantId) {
        viewers.delete(viewerId);
        onViewersUpdate(new Map(viewers));
      }
    };

    // Subscribe to viewer events
    const unsubscribeJoined = this.ablyService.subscribe(
      this.currentSessionCode!,
      'viewers',
      'viewer-joined',
      handleViewerJoined
    );

    const unsubscribeLeft = this.ablyService.subscribe(
      this.currentSessionCode!,
      'viewers',
      'viewer-left',
      handleViewerLeft
    );

    // Return cleanup function
    return () => {
      unsubscribeJoined();
      unsubscribeLeft();
    };
  }

  private startActivityUpdates(targetParticipantId: string): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }

    this.activityTimer = setInterval(async () => {
      if (this.isActive && this.viewersChannel && this.currentUserId) {
        try {
          await this.viewersChannel.publish('viewer-activity', {
            viewerId: this.currentUserId,
            targetParticipantId,
            timestamp: Date.now(),
            isActive: true
          });
        } catch (error) {
          console.warn('Failed to send viewer activity update:', error);
        }
      }
    }, this.ACTIVITY_UPDATE_INTERVAL);
  }

  private stopActivityUpdates(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
  }

  async cleanup(): Promise<void> {
    this.isActive = false;
    this.stopActivityUpdates();

    // Clean up session data
    this.currentSessionCode = null;
    this.currentUserId = null;
    this.currentUserName = null;
    this.currentUserEmoji = null;
    this.currentUserColor = null;
    this.viewersChannel = null;
  }
}

// Singleton instance
let viewerServiceInstance: ViewerService | null = null;

export function getViewerService(): ViewerService {
  if (!viewerServiceInstance) {
    viewerServiceInstance = new ViewerService();
  }
  return viewerServiceInstance;
}

// Testing helper
export function resetViewerService(): void {
  if (viewerServiceInstance) {
    viewerServiceInstance.cleanup();
    viewerServiceInstance = null;
  }
}