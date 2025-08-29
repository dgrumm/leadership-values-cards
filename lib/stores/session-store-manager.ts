/**
 * Session Store Manager - Core class for managing session-scoped Zustand stores
 * Provides complete state isolation between participants and sessions
 * 
 * CRITICAL: Fixes production-blocking state bleeding bug where User1 actions affect User2 UI
 */

import { generateStoreKey, validateSessionCode, validateParticipantId, extractSessionCode, getSessionParticipantKeys } from './store-key-utils';
import { MemoryTracker, type MemoryStats } from './memory-tracker';

// Import store factory functions from 04.5.2 implementation
import { 
  createStep1Store, 
  createStep2Store, 
  createStep3Store,
  type Step1Store,
  type Step2Store,
  type Step3Store
} from '@/state/local';

// Store bundle interface - contains all store types for a participant
export interface StoreBundle {
  step1: Step1Store;
  step2: Step2Store;  
  step3: Step3Store;
  createdAt: number;
  lastAccessed: number;
}

// Configuration options for SessionStoreManager
export interface SessionStoreManagerConfig {
  autoCleanupDelayMs?: number; // Default: 5 minutes
  maxStoresPerSession?: number; // Default: 50 participants
  enableMemoryTracking?: boolean; // Default: true in development
  enableDebugLogging?: boolean; // Default: true in development
}

export class SessionStoreManager {
  private stores = new Map<string, StoreBundle>();
  private cleanupTimers = new Map<string, NodeJS.Timeout>();
  private memoryTracker: MemoryTracker;
  private config: Required<SessionStoreManagerConfig>;

  constructor(config: SessionStoreManagerConfig = {}) {
    this.config = {
      autoCleanupDelayMs: config.autoCleanupDelayMs ?? 300000, // 5 minutes
      maxStoresPerSession: config.maxStoresPerSession ?? 50,
      enableMemoryTracking: config.enableMemoryTracking ?? (process.env.NODE_ENV === 'development'),
      enableDebugLogging: config.enableDebugLogging ?? (process.env.NODE_ENV === 'development')
    };

    this.memoryTracker = new MemoryTracker();

    if (this.config.enableDebugLogging) {
      console.log('[SessionStoreManager] Initialized with config:', this.config);
    }
  }

  /**
   * Gets Step1 store for specific session and participant
   * Creates new store if it doesn't exist
   */
  getStep1Store(sessionCode: string, participantId: string): Step1Store {
    const key = this.getOrCreateStoreBundle(sessionCode, participantId);
    const bundle = this.stores.get(key)!;
    
    this.updateLastAccessed(key);
    this.memoryTracker.recordStoreAccess(key);
    
    return bundle.step1;
  }

  /**
   * Gets Step2 store for specific session and participant
   * Creates new store if it doesn't exist
   */
  getStep2Store(sessionCode: string, participantId: string): Step2Store {
    const key = this.getOrCreateStoreBundle(sessionCode, participantId);
    const bundle = this.stores.get(key)!;
    
    this.updateLastAccessed(key);
    this.memoryTracker.recordStoreAccess(key);
    
    return bundle.step2;
  }

  /**
   * Gets Step3 store for specific session and participant  
   * Creates new store if it doesn't exist
   */
  getStep3Store(sessionCode: string, participantId: string): Step3Store {
    const key = this.getOrCreateStoreBundle(sessionCode, participantId);
    const bundle = this.stores.get(key)!;
    
    this.updateLastAccessed(key);
    this.memoryTracker.recordStoreAccess(key);
    
    return bundle.step3;
  }

  /**
   * Removes all stores for a specific session
   */
  cleanupSession(sessionCode: string): void {
    if (!validateSessionCode(sessionCode)) {
      throw new Error(`Invalid session code: ${sessionCode}`);
    }

    const allKeys = Array.from(this.stores.keys());
    const sessionKeys = getSessionParticipantKeys(allKeys, sessionCode);

    let removedCount = 0;
    sessionKeys.forEach(key => {
      if (this.removeStoreBundle(key)) {
        removedCount++;
      }
    });

    if (this.config.enableDebugLogging) {
      console.log(`[SessionStoreManager] Cleaned up session ${sessionCode}: ${removedCount} participants removed`);
    }
  }

  /**
   * Removes stores for a specific participant
   */
  cleanupParticipant(sessionCode: string, participantId: string): void {
    const key = generateStoreKey(sessionCode, participantId);
    
    if (this.removeStoreBundle(key)) {
      if (this.config.enableDebugLogging) {
        console.log(`[SessionStoreManager] Cleaned up participant: ${key}`);
      }
    }
  }

  /**
   * Gets total number of active sessions
   */
  getSessionCount(): number {
    const sessions = new Set(
      Array.from(this.stores.keys()).map(key => extractSessionCode(key))
    );
    return sessions.size;
  }

  /**
   * Gets number of participants in a specific session
   */
  getParticipantCount(sessionCode: string): number {
    if (!validateSessionCode(sessionCode)) {
      return 0;
    }

    const allKeys = Array.from(this.stores.keys());
    return getSessionParticipantKeys(allKeys, sessionCode).length;
  }

  /**
   * Gets comprehensive memory statistics
   */
  getMemoryStats(): MemoryStats {
    return this.memoryTracker.getMemoryStats();
  }

  /**
   * Performs automatic cleanup of inactive stores
   */
  performAutoCleanup(): number {
    const inactiveKeys = this.memoryTracker.getInactiveStores();
    let removedCount = 0;

    inactiveKeys.forEach(key => {
      if (this.removeStoreBundle(key)) {
        removedCount++;
      }
    });

    if (removedCount > 0 && this.config.enableDebugLogging) {
      console.log(`[SessionStoreManager] Auto-cleanup removed ${removedCount} inactive stores`);
    }

    return removedCount;
  }

  /**
   * Development utility - logs current state to console
   */
  debugLogState(): void {
    if (process.env.NODE_ENV !== 'development') return;

    console.group('[SessionStoreManager] Debug State');
    console.log('Total Store Bundles:', this.stores.size);
    console.log('Active Sessions:', this.getSessionCount());
    console.log('Cleanup Timers:', this.cleanupTimers.size);
    
    this.memoryTracker.logMemoryStats();
    
    const warnings = this.memoryTracker.checkForMemoryWarnings();
    if (warnings.length > 0) {
      console.warn('Warnings:', warnings);
    }
    
    console.groupEnd();
  }

  // Private helper methods

  /**
   * Gets or creates store bundle for session + participant
   */
  private getOrCreateStoreBundle(sessionCode: string, participantId: string): string {
    const key = generateStoreKey(sessionCode, participantId);

    if (!this.stores.has(key)) {
      // Check session participant limit
      const currentParticipants = this.getParticipantCount(sessionCode);
      if (currentParticipants >= this.config.maxStoresPerSession) {
        throw new Error(
          `Session ${sessionCode} has reached maximum participants (${this.config.maxStoresPerSession}). ` +
          'Cannot create store for new participant.'
        );
      }

      // Create new store bundle
      const bundle: StoreBundle = {
        step1: createStep1Store(),
        step2: createStep2Store(),  
        step3: createStep3Store(),
        createdAt: Date.now(),
        lastAccessed: Date.now()
      };

      this.stores.set(key, bundle);
      this.memoryTracker.recordStoreCreation(key);
      this.scheduleAutoCleanup(key);

      if (this.config.enableDebugLogging) {
        console.log(`[SessionStoreManager] Created store bundle: ${key}`);
      }
    }

    return key;
  }

  /**
   * Updates last accessed time for a store bundle
   */
  private updateLastAccessed(key: string): void {
    const bundle = this.stores.get(key);
    if (bundle) {
      bundle.lastAccessed = Date.now();
      
      // Reschedule cleanup timer
      this.scheduleAutoCleanup(key);
    }
  }

  /**
   * Schedules automatic cleanup for a store bundle
   */
  private scheduleAutoCleanup(key: string): void {
    // Clear existing timer
    this.clearCleanupTimer(key);
    
    // Schedule new cleanup timer
    const timer = setTimeout(() => {
      this.removeStoreBundle(key);
      if (this.config.enableDebugLogging) {
        console.log(`[SessionStoreManager] Auto-cleaned up inactive store: ${key}`);
      }
    }, this.config.autoCleanupDelayMs);

    this.cleanupTimers.set(key, timer);
  }

  /**
   * Clears cleanup timer for a store bundle
   */
  private clearCleanupTimer(key: string): void {
    const timer = this.cleanupTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(key);
    }
  }

  /**
   * Removes a store bundle and cleans up associated resources
   */
  private removeStoreBundle(key: string): boolean {
    const existed = this.stores.has(key);
    
    if (existed) {
      this.stores.delete(key);
      this.clearCleanupTimer(key);
      this.memoryTracker.recordStoreRemoval(key);
    }
    
    return existed;
  }

}