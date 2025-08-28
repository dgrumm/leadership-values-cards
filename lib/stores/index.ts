/**
 * Store Management System - Public API
 * Session-scoped state management to prevent participant state bleeding
 */

export { SessionStoreManager } from './session-store-manager';
export type { 
  StoreBundle, 
  SessionStoreManagerConfig, 
  StoreFactory 
} from './session-store-manager';

export { MemoryTracker } from './memory-tracker';
export type { MemoryStats, StoreMetadata } from './memory-tracker';

export {
  generateStoreKey,
  validateSessionCode,
  validateParticipantId,
  validateStoreKey,
  extractSessionCode,
  extractParticipantId,
  getSessionParticipantKeys
} from './store-key-utils';