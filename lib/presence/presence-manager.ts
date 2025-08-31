import type { RealtimeChannel } from 'ably';
import type { AblyService } from '../ably/ably-service';
import type { 
  PresenceData, 
  PresenceEvent, 
  CursorPosition, 
  PresenceConfig
} from './types';
import { DEFAULT_PRESENCE_CONFIG } from './types';

/**
 * PresenceManager handles real-time participant tracking and cursor management
 */
export class PresenceManager {
  private ablyService: AblyService;
  private sessionCode: string;
  private currentUser: {
    id: string;
    name: string;
    emoji: string;
    color: string;
  };
  
  private presenceChannel: RealtimeChannel;
  private participants = new Map<string, PresenceData>();
  private cursors = new Map<string, CursorPosition>();
  private currentUserData: PresenceData | null = null;
  
  // Cleanup functions
  private presenceUnsubscribe?: () => void;
  private cursorUnsubscribe?: () => void;
  private heartbeatInterval?: NodeJS.Timeout;
  private isDestroyed = false;
  
  // Event callbacks for external subscribers
  private participantChangeCallbacks = new Set<(participants: Map<string, PresenceData>) => void>();
  
  private config: PresenceConfig;

  constructor(
    ablyService: AblyService,
    sessionCode: string,
    currentUser: {
      id: string;
      name: string;
      emoji: string;
      color: string;
    },
    config: Partial<PresenceConfig> = {}
  ) {
    this.ablyService = ablyService;
    this.sessionCode = sessionCode;
    this.currentUser = currentUser;
    this.config = { ...DEFAULT_PRESENCE_CONFIG, ...config };
    
    // Get the presence channel
    this.presenceChannel = this.ablyService.getChannel(sessionCode, 'presence');
    
    // Set up presence listeners
    this.setupPresenceListeners();
    this.setupCursorListeners();
    this.startHeartbeat();
  }

  /**
   * Enter presence with participant data
   */
  async enter(participantData: PresenceData): Promise<void> {
    try {
      await this.presenceChannel.presence.enter(participantData);
      
      // Update local state
      this.currentUserData = participantData;
      this.participants.set(participantData.participantId, participantData);
    } catch (error) {
      console.error('Failed to enter presence:', error);
      throw error;
    }
  }

  /**
   * Leave presence channel
   */
  async leave(): Promise<void> {
    try {
      await this.presenceChannel.presence.leave();
      
      // Clean up local state
      if (this.currentUserData) {
        this.participants.delete(this.currentUserData.participantId);
        this.currentUserData = null;
      }
    } catch (error) {
      console.error('Failed to leave presence:', error);
      throw error;
    }
  }

  /**
   * Update presence status
   */
  async updateStatus(status: PresenceData['status']): Promise<void> {
    if (!this.currentUserData) {
      throw new Error('Cannot update status: not in presence');
    }

    const updatedData = {
      ...this.currentUserData,
      status,
      lastActive: Date.now()
    };

    try {
      await this.presenceChannel.presence.update(updatedData);
      
      // Update local state
      this.currentUserData = updatedData;
      this.participants.set(updatedData.participantId, updatedData);
    } catch (error) {
      console.error('Failed to update presence status:', error);
      throw error;
    }
  }

  /**
   * Update current step in presence (for step transitions)
   */
  async updateCurrentStep(currentStep: PresenceData['currentStep']): Promise<void> {
    if (!this.currentUserData) {
      throw new Error('Cannot update step: not in presence');
    }

    const updatedData = {
      ...this.currentUserData,
      currentStep,
      lastActive: Date.now()
    };

    try {
      await this.presenceChannel.presence.update(updatedData);
      
      // Update local state
      this.currentUserData = updatedData;
      this.participants.set(updatedData.participantId, updatedData);
      
      console.log(`✅ Updated step to ${currentStep} in presence`);
    } catch (error) {
      console.error('Failed to update current step in presence:', error);
      throw error;
    }
  }

  /**
   * Update cursor position (throttled via AblyService)
   */
  updateCursor(x: number, y: number): void {
    if (!this.ablyService.isReady()) {
      return; // Service not ready
    }

    try {
      // Update local cursor immediately
      this.cursors.set(this.currentUser.id, {
        x,
        y,
        timestamp: Date.now()
      });

      // Publish via throttled AblyService method
      this.ablyService.publishCursorMove(this.sessionCode, {
        x,
        y,
        participantId: this.currentUser.id
      });
    } catch (error) {
      console.error('Failed to update cursor:', error);
    }
  }

  /**
   * Set up presence event listeners
   */
  private setupPresenceListeners(): void {
    const handlePresenceEvent = (presenceEvent: { action: string; clientId: string; data: PresenceData }) => {
      try {
        const { action, data } = presenceEvent;
        
        if (!data || !data.participantId) {
          return; // Invalid presence data
        }

        switch (action) {
          case 'enter':
            this.participants.set(data.participantId, data);
            this.notifyParticipantChange();
            break;
            
          case 'leave':
            this.participants.delete(data.participantId);
            this.cursors.delete(data.participantId); // Clean up cursor too
            this.notifyParticipantChange();
            break;
            
          case 'update':
            this.participants.set(data.participantId, data);
            this.notifyParticipantChange();
            break;
            
          default:
            console.warn('Unknown presence action:', action);
        }
      } catch (error) {
        console.error('Presence event error:', error);
      }
    };

    // Subscribe to presence events
    this.presenceChannel.presence.subscribe(handlePresenceEvent);
    
    // Store cleanup function
    this.presenceUnsubscribe = () => {
      this.presenceChannel.presence.unsubscribe(handlePresenceEvent);
    };
  }

  /**
   * Set up cursor movement listeners
   */
  private setupCursorListeners(): void {
    const handleCursorMove = (message: { name: string; data: { x: number; y: number; participantId: string } }) => {
      try {
        if (message.name !== 'cursor-move') {
          return;
        }

        const { participantId, x, y } = message.data;
        const timestamp = Date.now(); // Generate timestamp on receive
        
        // Don't update our own cursor from network messages
        if (participantId === this.currentUser.id) {
          return;
        }

        // Update cursor position
        this.cursors.set(participantId, { x, y, timestamp });
      } catch (error) {
        console.error('Cursor event error:', error);
      }
    };

    // Subscribe to cursor events via AblyService
    this.cursorUnsubscribe = this.ablyService.subscribe(
      this.sessionCode,
      'presence',
      'cursor-move',
      handleCursorMove
    );
  }

  /**
   * Start heartbeat to keep presence alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      // Don't continue if instance has been destroyed
      if (this.isDestroyed || !this.currentUserData) {
        return;
      }

      try {
        const updatedData = {
          ...this.currentUserData,
          lastActive: Date.now()
        };

        await this.presenceChannel.presence.update(updatedData);
        
        // Check again after async operation in case we were destroyed
        if (!this.isDestroyed) {
          this.currentUserData = updatedData;
          this.participants.set(updatedData.participantId, updatedData);
        }
      } catch (error) {
        // Only log if not destroyed to prevent test log pollution
        if (!this.isDestroyed) {
          console.error('Heartbeat update failed:', error);
        }
      }
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Get current participants map
   */
  getParticipants(): Map<string, PresenceData> {
    return new Map(this.participants);
  }

  /**
   * Get current cursors map
   */
  getCursors(): Map<string, CursorPosition> {
    return new Map(this.cursors);
  }

  /**
   * Get active cursors (filter out old ones)
   */
  getActiveCursors(): Map<string, CursorPosition> {
    const activeCursors = new Map<string, CursorPosition>();
    const now = Date.now();
    const activeThreshold = now - this.config.idleTimeoutMs;

    this.cursors.forEach((cursor, participantId) => {
      if (cursor.timestamp > activeThreshold) {
        activeCursors.set(participantId, cursor);
      }
    });

    return activeCursors;
  }

  /**
   * Get current user's presence data
   */
  getCurrentUserData(): PresenceData | null {
    return this.currentUserData ? { ...this.currentUserData } : null;
  }

  /**
   * Get participant count (excluding current user)
   */
  getParticipantCount(): number {
    return this.participants.size;
  }

  /**
   * Subscribe to participant changes for event-driven updates
   */
  onParticipantChange(callback: (participants: Map<string, PresenceData>) => void): () => void {
    this.participantChangeCallbacks.add(callback);
    
    // Call immediately with current participants
    callback(new Map(this.participants));
    
    // Return unsubscribe function
    return () => {
      this.participantChangeCallbacks.delete(callback);
    };
  }

  /**
   * Notify all subscribers of participant changes
   */
  private notifyParticipantChange(): void {
    if (this.isDestroyed) return;
    
    const participantsCopy = new Map(this.participants);
    this.participantChangeCallbacks.forEach(callback => {
      try {
        callback(participantsCopy);
      } catch (error) {
        console.error('Error in participant change callback:', error);
      }
    });
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    // Mark as destroyed to prevent async operations
    this.isDestroyed = true;
    
    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    // Unsubscribe from events
    if (this.presenceUnsubscribe) {
      this.presenceUnsubscribe();
      this.presenceUnsubscribe = undefined;
    }

    if (this.cursorUnsubscribe) {
      this.cursorUnsubscribe();
      this.cursorUnsubscribe = undefined;
    }

    // Clear callbacks
    this.participantChangeCallbacks.clear();
    
    // Clear local state
    this.participants.clear();
    this.cursors.clear();
    this.currentUserData = null;
  }
}