/**
 * Unit tests for memory tracker
 * Tests memory monitoring and leak detection functionality
 */

import { MemoryTracker, type MemoryStats } from '../../../lib/stores/memory-tracker';

// Mock console methods for testing
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  group: jest.fn(),
  groupEnd: jest.fn()
};

describe('MemoryTracker', () => {
  let tracker: MemoryTracker;

  beforeEach(() => {
    tracker = new MemoryTracker();
    jest.clearAllMocks();
    
    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(mockConsole.log);
    jest.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
    jest.spyOn(console, 'group').mockImplementation(mockConsole.group);
    jest.spyOn(console, 'groupEnd').mockImplementation(mockConsole.groupEnd);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('store lifecycle tracking', () => {
    it('should track store creation', () => {
      tracker.recordStoreCreation('ABC123:user1');
      
      const metadata = tracker.getStoreMetadata('ABC123:user1');
      expect(metadata).toBeTruthy();
      expect(metadata!.accessCount).toBe(1);
      expect(metadata!.createdAt).toBeGreaterThan(0);
      expect(metadata!.lastAccessed).toBeGreaterThan(0);
    });

    it('should track store access', () => {
      tracker.recordStoreCreation('ABC123:user1');
      const initialMetadata = tracker.getStoreMetadata('ABC123:user1')!;
      
      // Wait a bit to ensure different timestamp
      setTimeout(() => {
        tracker.recordStoreAccess('ABC123:user1');
        
        const updatedMetadata = tracker.getStoreMetadata('ABC123:user1')!;
        expect(updatedMetadata.accessCount).toBe(2);
        expect(updatedMetadata.lastAccessed).toBeGreaterThan(initialMetadata.lastAccessed);
      }, 10);
    });

    it('should track store removal', () => {
      tracker.recordStoreCreation('ABC123:user1');
      expect(tracker.getStoreMetadata('ABC123:user1')).toBeTruthy();
      
      tracker.recordStoreRemoval('ABC123:user1');
      expect(tracker.getStoreMetadata('ABC123:user1')).toBeNull();
    });
  });

  describe('memory statistics', () => {
    beforeEach(() => {
      // Create some test stores
      tracker.recordStoreCreation('ABC123:user1');
      tracker.recordStoreCreation('ABC123:user2');
      tracker.recordStoreCreation('XYZ999:user1');
      tracker.recordStoreCreation('XYZ999:user3');
      tracker.recordStoreCreation('DEF456:user5');
    });

    it('should calculate basic memory stats', () => {
      const stats = tracker.getMemoryStats();
      
      expect(stats.totalStores).toBe(5);
      expect(stats.sessionsCount).toBe(3); // ABC123, XYZ999, DEF456
      expect(stats.participantsCount).toBe(5);
      expect(stats.averageParticipantsPerSession).toBeCloseTo(5/3);
      expect(stats.memoryUsageEstimate).toMatch(/~\d+\.\d+MB/);
    });

    it('should identify oldest store', () => {
      // Manually set creation times to ensure predictable ordering
      const now = Date.now();
      const user1Metadata = tracker.getStoreMetadata('ABC123:user1')!;
      const user2Metadata = tracker.getStoreMetadata('ABC123:user2')!;
      const user3Metadata = tracker.getStoreMetadata('XYZ999:user1')!;
      
      user1Metadata.createdAt = now - 3000; // 3 seconds ago (oldest)
      user2Metadata.createdAt = now - 2000; // 2 seconds ago  
      user3Metadata.createdAt = now - 1000; // 1 second ago (newest)
      
      const stats = tracker.getMemoryStats();
      
      expect(stats.oldestStore).toBeTruthy();
      expect(stats.oldestStore!.key).toBe('ABC123:user1'); // Oldest
      expect(stats.oldestStore!.age).toBeGreaterThanOrEqual(3000); // At least 3 seconds
    });

    it('should handle empty state', () => {
      const emptyTracker = new MemoryTracker();
      const stats = emptyTracker.getMemoryStats();
      
      expect(stats.totalStores).toBe(0);
      expect(stats.sessionsCount).toBe(0);
      expect(stats.participantsCount).toBe(0);
      expect(stats.averageParticipantsPerSession).toBe(0);
      expect(stats.oldestStore).toBeNull();
    });
  });

  describe('inactive store detection', () => {
    it('should identify inactive stores', () => {
      // Create stores with different access times
      tracker.recordStoreCreation('ABC123:user1');
      tracker.recordStoreCreation('ABC123:user2');
      
      // Mock time passage by directly manipulating metadata
      const user1Metadata = tracker.getStoreMetadata('ABC123:user1')!;
      const user2Metadata = tracker.getStoreMetadata('ABC123:user2')!;
      
      // Make user1 inactive by setting old lastAccessed time (6+ minutes ago)
      user1Metadata.lastAccessed = Date.now() - 400000;
      
      // Keep user2 active with recent access (1 minute ago) 
      user2Metadata.lastAccessed = Date.now() - 60000;
      
      const inactiveStores = tracker.getInactiveStores();
      expect(inactiveStores).toContain('ABC123:user1');
      expect(inactiveStores).not.toContain('ABC123:user2');
    });
  });

  describe('memory warnings', () => {
    it('should warn about high store count', () => {
      // Create many stores
      for (let i = 0; i < 105; i++) {
        tracker.recordStoreCreation(`SES${i.toString().padStart(3, '0')}:user1`);
      }
      
      const warnings = tracker.checkForMemoryWarnings();
      expect(warnings.some(w => w.includes('High store count'))).toBe(true);
    });

    it('should warn about high participants per session', () => {
      // Create many participants in single session
      for (let i = 0; i < 55; i++) {
        tracker.recordStoreCreation(`ABC123:user${i}`);
      }
      
      const warnings = tracker.checkForMemoryWarnings();
      expect(warnings.some(w => w.includes('High participants per session'))).toBe(true);
    });

    it('should warn about old stores', () => {
      tracker.recordStoreCreation('ABC123:user1');
      
      // Mock very old store by manipulating metadata (2+ hours ago)
      const metadata = tracker.getStoreMetadata('ABC123:user1')!;
      metadata.createdAt = Date.now() - 7200000; // 2 hours ago
      
      // Force the age calculation in getMemoryStats to be correct
      const stats = tracker.getMemoryStats();
      expect(stats.oldestStore).toBeTruthy();
      expect(stats.oldestStore!.age).toBeGreaterThan(3600000); // > 1 hour
      
      const warnings = tracker.checkForMemoryWarnings();
      expect(warnings.some(w => w.includes('Old store detected'))).toBe(true);
    });

    it('should return no warnings for healthy state', () => {
      tracker.recordStoreCreation('ABC123:user1');
      tracker.recordStoreCreation('ABC123:user2');
      
      const warnings = tracker.checkForMemoryWarnings();
      expect(warnings).toEqual([]);
    });
  });

  describe('sorted store access', () => {
    it('should sort stores by last access time', (done) => {
      tracker.recordStoreCreation('ABC123:user1');
      tracker.recordStoreCreation('ABC123:user2');
      tracker.recordStoreCreation('ABC123:user3');
      
      setTimeout(() => {
        tracker.recordStoreAccess('ABC123:user2'); // Most recent
        
        setTimeout(() => {
          tracker.recordStoreAccess('ABC123:user3'); // Second most recent
          
          const sortedStores = tracker.getStoresSortedByAccess();
          expect(sortedStores[0].key).toBe('ABC123:user3'); // Most recent
          expect(sortedStores[1].key).toBe('ABC123:user2'); // Second most recent  
          expect(sortedStores[2].key).toBe('ABC123:user1'); // Oldest
          done();
        }, 10);
      }, 10);
    });
  });

  describe('development logging', () => {
    it('should log memory stats in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      tracker.recordStoreCreation('ABC123:user1');
      tracker.logMemoryStats();
      
      expect(mockConsole.group).toHaveBeenCalledWith('[MemoryTracker] Current Statistics');
      expect(mockConsole.log).toHaveBeenCalledWith('Total Stores:', 1);
      expect(mockConsole.groupEnd).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      tracker.recordStoreCreation('ABC123:user1');
      tracker.logMemoryStats();
      
      expect(mockConsole.group).not.toHaveBeenCalled();
      expect(mockConsole.log).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});