// Presence data structure for real-time participant tracking
export interface PresenceData {
  participantId: string;
  name: string;
  emoji: string;
  color: string;
  currentStep: 1 | 2 | 3;
  status: 'sorting' | 'revealed-8' | 'revealed-3' | 'completed';
  cursor: {
    x: number;
    y: number;
    timestamp: number;
  };
  lastActive: number;
  isViewing: string | null; // participant ID being viewed
}

// Participant identity for color/emoji assignment
export interface ParticipantIdentity {
  color: string;
  emoji: string;
}

// Cursor position data
export interface CursorPosition {
  x: number;
  y: number;
  timestamp: number;
}

// Presence event types
export type PresenceEventType = 'enter' | 'leave' | 'update';

// Presence event data
export interface PresenceEvent {
  action: PresenceEventType;
  clientId: string;
  data: PresenceData;
}

// Cursor message data for Ably
export interface CursorMessage {
  participantId: string;
  x: number;
  y: number;
  timestamp: number;
}

// Activity status for idle detection
export type ActivityStatus = 'active' | 'idle' | 'inactive';

// Presence manager configuration
export interface PresenceConfig {
  cursorThrottleMs: number;
  heartbeatIntervalMs: number;
  idleTimeoutMs: number;
  inactiveTimeoutMs: number;
}

// Default configuration values
export const DEFAULT_PRESENCE_CONFIG: PresenceConfig = {
  cursorThrottleMs: 50,      // 20fps cursor updates
  heartbeatIntervalMs: 1000, // 1 second heartbeat for responsive updates
  idleTimeoutMs: 10000,      // 10 seconds idle timeout
  inactiveTimeoutMs: 300000  // 5 minutes inactive timeout
};