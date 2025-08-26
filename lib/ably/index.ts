// Ably Setup - Main exports for real-time collaboration

// Core service
export { 
  AblyService, 
  getAblyService, 
  resetAblyService,
  CONNECTION_STATES 
} from './ably-service';

export type { 
  ConnectionState,
  ChannelType,
  AblyMessage,
  SessionMessage,
  PresenceMessage,
  RevealsMessage,
  ViewersMessage,
  StatusMessage
} from './ably-service';

// Configuration and validation
export {
  validateAblyEnvironment,
  getAblyConfig,
  ConnectionQualityMonitor,
  classifyAblyError,
  AblyErrorType,
  DEFAULT_RECOVERY_STRATEGIES,
  calculateBackoffDelay
} from './config';

export type {
  AblyConfig,
  AblyError,
  RecoveryStrategy
} from './config';