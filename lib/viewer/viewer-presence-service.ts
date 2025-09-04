import type { AblyService } from '@/lib/ably/ably-service';
import type { ViewerData, ViewerPresenceData } from '@/types/viewer';
import type { ViewerIdentity } from '@/types/viewer-session';

/**
 * Service for tracking viewer presence independently from main session participants
 * This ensures viewers don't interfere with the main session participant count
 */
export class ViewerPresenceService {
  private ablyService: AblyService;
  private sessionCode: string;
  private viewerIdentity: ViewerIdentity;
  private currentTargetId: string | null = null;
  
  private otherViewers = new Map<string, ViewerData>();
  private presenceCallbacks = new Set<(viewers: ViewerData[]) => void>();
  private isActive = false;

  constructor(ablyService: AblyService, sessionCode: string, viewerIdentity: ViewerIdentity) {
    this.ablyService = ablyService;
    this.sessionCode = sessionCode;
    this.viewerIdentity = viewerIdentity;
  }

  /**
   * Initialize the viewer presence system
   */
  async initialize(): Promise<void> {
    try {
      // Get dedicated viewer presence channel
      const channel = await this.ablyService.getChannel(this.sessionCode, 'viewers');
      
      // Listen for viewer join/leave events
      await channel.subscribe('viewer-joined', (message) => {
        this.handleViewerJoined(message.data);
      });
      
      await channel.subscribe('viewer-left', (message) => {
        this.handleViewerLeft(message.data);
      });

      console.log(`👥 [ViewerPresence] Initialized for session ${this.sessionCode}`);
    } catch (error) {
      console.error('[ViewerPresence] Failed to initialize:', error);
      throw new Error('Failed to initialize viewer presence service');
    }
  }

  /**
   * Join as viewer for a specific participant's arrangement
   */
  async joinViewing(targetParticipantId: string): Promise<void> {
    if (this.isActive && this.currentTargetId === targetParticipantId) {
      return; // Already viewing this participant
    }

    // Leave previous viewing if needed
    if (this.isActive && this.currentTargetId) {
      await this.leaveViewing();
    }

    try {
      const channel = await this.ablyService.getChannel(this.sessionCode, 'viewers');
      
      const presenceData: ViewerPresenceData = {
        viewerId: this.viewerIdentity.participantId,
        viewerName: this.viewerIdentity.name,
        viewerEmoji: this.viewerIdentity.emoji || '👤',
        viewerColor: this.viewerIdentity.color || 'gray',
        targetParticipantId,
        joinedAt: Date.now()
      };

      await channel.publish('viewer-joined', presenceData);
      
      this.currentTargetId = targetParticipantId;
      this.isActive = true;
      
      console.log(`👁 [ViewerPresence] Joined viewing ${targetParticipantId}`);
    } catch (error) {
      console.error('[ViewerPresence] Failed to join viewing:', error);
      throw error;
    }
  }

  /**
   * Leave current viewing session
   */
  async leaveViewing(): Promise<void> {
    if (!this.isActive || !this.currentTargetId) {
      return;
    }

    try {
      const channel = await this.ablyService.getChannel(this.sessionCode, 'viewers');
      
      await channel.publish('viewer-left', {
        viewerId: this.viewerIdentity.participantId,
        viewerName: this.viewerIdentity.name,
        targetParticipantId: this.currentTargetId,
        leftAt: Date.now()
      });

      this.currentTargetId = null;
      this.isActive = false;
      
      // Clear other viewers since we're not viewing anymore
      this.otherViewers.clear();
      this.notifyPresenceCallbacks();
      
      console.log('👋 [ViewerPresence] Left viewing session');
    } catch (error) {
      console.error('[ViewerPresence] Failed to leave viewing:', error);
      throw error;
    }
  }

  /**
   * Subscribe to presence updates for viewers of the current arrangement
   */
  subscribeToPresence(callback: (viewers: ViewerData[]) => void): () => void {
    this.presenceCallbacks.add(callback);
    
    // Immediately call with current state
    callback(Array.from(this.otherViewers.values()));

    // Return unsubscribe function
    return () => {
      this.presenceCallbacks.delete(callback);
    };
  }

  /**
   * Handle viewer joined event
   */
  private handleViewerJoined(data: ViewerPresenceData): void {
    const { viewerId, viewerName, viewerEmoji, viewerColor, targetParticipantId } = data;
    
    // Ignore our own events
    if (viewerId === this.viewerIdentity.participantId) {
      return;
    }
    
    // Only track viewers of the same arrangement we're viewing
    if (targetParticipantId !== this.currentTargetId) {
      return;
    }

    const viewerData: ViewerData = {
      participantId: viewerId,
      name: viewerName,
      emoji: viewerEmoji,
      color: viewerColor,
      joinedAt: data.joinedAt,
      isActive: true
    };

    this.otherViewers.set(viewerId, viewerData);
    this.notifyPresenceCallbacks();
    
    console.log(`➕ [ViewerPresence] Viewer ${viewerName} joined viewing ${targetParticipantId}`);
  }

  /**
   * Handle viewer left event
   */
  private handleViewerLeft(data: {
    viewerId: string;
    targetParticipantId: string;
    viewerName?: string;
    leftAt?: number;
  }): void {
    const { viewerId, targetParticipantId } = data;
    
    // Ignore our own events
    if (viewerId === this.viewerIdentity.participantId) {
      return;
    }
    
    // Only care about viewers of our current arrangement
    if (targetParticipantId !== this.currentTargetId) {
      return;
    }

    const removed = this.otherViewers.delete(viewerId);
    if (removed) {
      this.notifyPresenceCallbacks();
      console.log(`➖ [ViewerPresence] Viewer left viewing ${targetParticipantId}`);
    }
  }

  /**
   * Notify all presence subscribers of current viewer list
   */
  private notifyPresenceCallbacks(): void {
    const viewers = Array.from(this.otherViewers.values());
    this.presenceCallbacks.forEach(callback => {
      try {
        callback(viewers);
      } catch (error) {
        console.error('[ViewerPresence] Error in presence callback:', error);
      }
    });
  }

  /**
   * Get current viewers list
   */
  getCurrentViewers(): ViewerData[] {
    return Array.from(this.otherViewers.values());
  }

  /**
   * Get viewer count including self
   */
  getTotalViewerCount(): number {
    return this.otherViewers.size + (this.isActive ? 1 : 0);
  }

  /**
   * Check if currently viewing
   */
  isCurrentlyViewing(): boolean {
    return this.isActive;
  }

  /**
   * Get current viewing target
   */
  getCurrentTarget(): string | null {
    return this.currentTargetId;
  }

  /**
   * Clean up the service
   */
  async cleanup(): Promise<void> {
    console.log('🧹 [ViewerPresence] Cleaning up service');
    
    // Leave current viewing session
    if (this.isActive) {
      await this.leaveViewing();
    }
    
    // Clear all callbacks and data
    this.presenceCallbacks.clear();
    this.otherViewers.clear();
  }
}