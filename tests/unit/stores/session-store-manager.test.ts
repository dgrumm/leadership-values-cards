/**
 * Unit tests for SessionStoreManager
 * Tests core functionality, state isolation, and memory management
 */

// Mock the store factories
jest.mock('@/state/local', () => ({
  createStep1Store: jest.fn(() => ({
    _mockStoreType: 'step1',
    _id: `step1-${Date.now()}-${Math.random()}`
  })),
  createStep2Store: jest.fn(() => ({
    _mockStoreType: 'step2', 
    _id: `step2-${Date.now()}-${Math.random()}`
  })),
  createStep3Store: jest.fn(() => ({
    _mockStoreType: 'step3',
    _id: `step3-${Date.now()}-${Math.random()}`
  }))
}));

import { SessionStoreManager } from '../../../lib/stores/session-store-manager';

// Mock console methods for testing
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  group: jest.fn(),
  groupEnd: jest.fn()
};

describe('SessionStoreManager', () => {
  let manager: SessionStoreManager;

  beforeEach(() => {
    // Use fake timers to control setTimeout/setInterval
    jest.useFakeTimers();
    
    manager = new SessionStoreManager({
      autoCleanupDelayMs: 100, // Short delay for testing
      maxStoresPerSession: 5,   // Lower limit for testing
      enableDebugLogging: false // Disable for cleaner test output
    });

    jest.clearAllMocks();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(mockConsole.log);
    jest.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
    jest.spyOn(console, 'group').mockImplementation(mockConsole.group);
    jest.spyOn(console, 'groupEnd').mockImplementation(mockConsole.groupEnd);
  });

  afterEach(() => {
    // Clean up the manager and its timers first
    if (manager) {
      // Clean up all sessions to prevent memory leaks
      const stats = manager.getMemoryStats();
      const allKeys = Array.from((manager as any).stores.keys());
      allKeys.forEach(key => {
        const sessionCode = key.split(':')[0];
        manager.cleanupSession(sessionCode);
      });
    }
    
    // Clear any pending timers and restore mocks
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('store creation and access', () => {
    it('should create Step1 store for new session+participant', () => {
      const store = manager.getStep1Store('ABC123', 'user1');
      
      expect(store).toBeDefined();
      expect(store._mockStoreType).toBe('step1');
      expect(store._id).toBeDefined();
    });

    it('should create Step2 store for new session+participant', () => {
      const store = manager.getStep2Store('ABC123', 'user1');
      
      expect(store).toBeDefined();
      expect(store._mockStoreType).toBe('step2');
      expect(store._id).toBeDefined();
    });

    it('should create Step3 store for new session+participant', () => {
      const store = manager.getStep3Store('ABC123', 'user1');
      
      expect(store).toBeDefined();
      expect(store._mockStoreType).toBe('step3');
      expect(store._id).toBeDefined();
    });

    it('should return same store instance for repeated access', () => {
      const store1 = manager.getStep1Store('ABC123', 'user1');
      const store2 = manager.getStep1Store('ABC123', 'user1');
      
      expect(store1).toBe(store2);
      expect(store1._id).toBe(store2._id);
    });

    it('should create different stores for different participants', () => {
      const store1 = manager.getStep1Store('ABC123', 'user1');
      const store2 = manager.getStep1Store('ABC123', 'user2');
      
      expect(store1).not.toBe(store2);
      expect(store1._id).not.toBe(store2._id);
    });

    it('should create different stores for different sessions', () => {
      const store1 = manager.getStep1Store('ABC123', 'user1');
      const store2 = manager.getStep1Store('XYZ999', 'user1');
      
      expect(store1).not.toBe(store2);
      expect(store1._id).not.toBe(store2._id);
    });
  });

  describe('validation and error handling', () => {
    it('should throw for invalid session codes', () => {
      expect(() => manager.getStep1Store('invalid', 'user1')).toThrow('Invalid session code format');
      expect(() => manager.getStep1Store('abc123', 'user1')).toThrow('Invalid session code format');
      expect(() => manager.getStep1Store('', 'user1')).toThrow('Invalid session code format');
    });

    it('should throw for invalid participant IDs', () => {
      expect(() => manager.getStep1Store('ABC123', '')).toThrow('Invalid participant ID format');
      expect(() => manager.getStep1Store('ABC123', 'user 1')).toThrow('Invalid participant ID format');
      expect(() => manager.getStep1Store('ABC123', 'user@1')).toThrow('Invalid participant ID format');
    });

    it('should enforce maximum participants per session', () => {
      // Create stores up to the limit (5)
      for (let i = 1; i <= 5; i++) {
        expect(() => manager.getStep1Store('ABC123', `user${i}`)).not.toThrow();
      }
      
      // 6th participant should throw
      expect(() => manager.getStep1Store('ABC123', 'user6')).toThrow('Session ABC123 has reached maximum participants');
    });
  });

  describe('session and participant counting', () => {
    beforeEach(() => {
      // Create test data
      manager.getStep1Store('ABC123', 'user1');
      manager.getStep1Store('ABC123', 'user2');
      manager.getStep1Store('XYZ999', 'user1');
      manager.getStep1Store('XYZ999', 'user3');
      manager.getStep1Store('DEF456', 'user5');
    });

    it('should count total sessions correctly', () => {
      expect(manager.getSessionCount()).toBe(3);
    });

    it('should count participants per session correctly', () => {
      expect(manager.getParticipantCount('ABC123')).toBe(2);
      expect(manager.getParticipantCount('XYZ999')).toBe(2);
      expect(manager.getParticipantCount('DEF456')).toBe(1);
      expect(manager.getParticipantCount('NOEXIST')).toBe(0);
    });

    it('should handle invalid session codes in counting', () => {
      expect(manager.getParticipantCount('invalid')).toBe(0);
      expect(manager.getParticipantCount('')).toBe(0);
    });
  });

  describe('cleanup functionality', () => {
    beforeEach(() => {
      // Create test stores
      manager.getStep1Store('ABC123', 'user1');
      manager.getStep1Store('ABC123', 'user2');
      manager.getStep1Store('XYZ999', 'user1');
    });

    it('should cleanup entire session', () => {
      expect(manager.getParticipantCount('ABC123')).toBe(2);
      
      manager.cleanupSession('ABC123');
      
      expect(manager.getParticipantCount('ABC123')).toBe(0);
      expect(manager.getParticipantCount('XYZ999')).toBe(1); // Other session unaffected
    });

    it('should cleanup specific participant', () => {
      expect(manager.getParticipantCount('ABC123')).toBe(2);
      
      manager.cleanupParticipant('ABC123', 'user1');
      
      expect(manager.getParticipantCount('ABC123')).toBe(1);
      
      // Verify specific participant is gone but others remain
      const remainingStore = manager.getStep1Store('ABC123', 'user2');
      expect(remainingStore).toBeDefined();
    });

    it('should throw for invalid session code in session cleanup', () => {
      expect(() => manager.cleanupSession('invalid')).toThrow('Invalid session code');
    });

    it('should handle cleanup of non-existent participants gracefully', () => {
      expect(() => manager.cleanupParticipant('ABC123', 'nonexistent')).not.toThrow();
    });
  });

  describe('memory statistics', () => {
    beforeEach(() => {
      manager.getStep1Store('ABC123', 'user1');
      manager.getStep1Store('ABC123', 'user2');
      manager.getStep1Store('XYZ999', 'user1');
    });

    it('should provide memory statistics', () => {
      const stats = manager.getMemoryStats();
      
      expect(stats.totalStores).toBe(3);
      expect(stats.sessionsCount).toBe(2);
      expect(stats.participantsCount).toBe(3);
      expect(stats.memoryUsageEstimate).toMatch(/~\d+\.\d+MB/);
    });
  });

  describe('auto cleanup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should perform automatic cleanup of inactive stores', () => {
      manager.getStep1Store('ABC123', 'user1');
      manager.getStep1Store('ABC123', 'user2');
      
      expect(manager.getParticipantCount('ABC123')).toBe(2);
      
      // Fast-forward past cleanup delay
      jest.advanceTimersByTime(150); // Past 100ms cleanup delay
      
      expect(manager.getParticipantCount('ABC123')).toBe(0);
    });

    it('should reschedule cleanup when stores are accessed', () => {
      const store = manager.getStep1Store('ABC123', 'user1');
      
      expect(manager.getParticipantCount('ABC123')).toBe(1);
      
      // Advance to just before cleanup
      jest.advanceTimersByTime(80);
      
      // Access store to reset timer
      manager.getStep1Store('ABC123', 'user1');
      
      // Advance to original cleanup time - should still exist
      jest.advanceTimersByTime(30);
      expect(manager.getParticipantCount('ABC123')).toBe(1);
      
      // Advance full delay again - now should be cleaned up
      jest.advanceTimersByTime(100);
      expect(manager.getParticipantCount('ABC123')).toBe(0);
    });

    it('should manually trigger auto cleanup', () => {
      manager.getStep1Store('ABC123', 'user1');
      manager.getStep1Store('ABC123', 'user2');
      
      expect(manager.getParticipantCount('ABC123')).toBe(2);
      
      // Don't advance timers, but mark stores as inactive
      const removedCount = manager.performAutoCleanup();
      
      // Should not remove anything yet (not actually inactive based on time)
      expect(removedCount).toBe(0);
      expect(manager.getParticipantCount('ABC123')).toBe(2);
    });
  });

  describe('development debugging', () => {
    it('should provide debug state information', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      manager.getStep1Store('ABC123', 'user1');
      manager.debugLogState();
      
      expect(mockConsole.group).toHaveBeenCalledWith('[SessionStoreManager] Debug State');
      expect(mockConsole.log).toHaveBeenCalledWith('Total Store Bundles:', 1);
      expect(mockConsole.groupEnd).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not debug log in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      manager.getStep1Store('ABC123', 'user1');
      manager.debugLogState();
      
      expect(mockConsole.group).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultManager = new SessionStoreManager();
      
      // Test that default config works (no specific assertions needed - just no errors)
      expect(() => defaultManager.getStep1Store('ABC123', 'user1')).not.toThrow();
    });

    it('should use custom configuration', () => {
      const customManager = new SessionStoreManager({
        maxStoresPerSession: 2,
        autoCleanupDelayMs: 50,
        enableDebugLogging: true,
        enableMemoryTracking: false
      });
      
      // Test max stores limit
      customManager.getStep1Store('ABC123', 'user1');
      customManager.getStep1Store('ABC123', 'user2');
      
      expect(() => customManager.getStep1Store('ABC123', 'user3')).toThrow('maximum participants (2)');
    });
  });
});