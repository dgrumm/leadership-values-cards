/**
 * Memory Tracker for Session Store Management
 * Monitors memory usage and detects potential leaks
 */

export interface MemoryStats {
  totalStores: number;
  sessionsCount: number;
  participantsCount: number;
  averageParticipantsPerSession: number;
  oldestStore: { key: string; age: number } | null;
  memoryUsageEstimate: string;
}

export interface StoreMetadata {
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
}

export class MemoryTracker {
  private storeMetadata = new Map<string, StoreMetadata>();
  private readonly maxInactiveMs = 300000; // 5 minutes

  /**
   * Records store creation
   */
  recordStoreCreation(key: string): void {
    const now = Date.now();
    this.storeMetadata.set(key, {
      createdAt: now,
      lastAccessed: now,
      accessCount: 1
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MemoryTracker] Store created: ${key}`);
    }
  }

  /**
   * Records store access
   */
  recordStoreAccess(key: string): void {
    const metadata = this.storeMetadata.get(key);
    if (metadata) {
      metadata.lastAccessed = Date.now();
      metadata.accessCount++;
    }
  }

  /**
   * Records store removal
   */
  recordStoreRemoval(key: string): void {
    this.storeMetadata.delete(key);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MemoryTracker] Store removed: ${key}`);
    }
  }

  /**
   * Gets comprehensive memory statistics
   */
  getMemoryStats(): MemoryStats {
    const keys = Array.from(this.storeMetadata.keys());
    const now = Date.now();
    
    // Count unique sessions
    const sessions = new Set(keys.map(key => key.split(':')[0]));
    
    // Find oldest store
    let oldestStore: { key: string; age: number } | null = null;
    let oldestTime = now;
    
    for (const [key, metadata] of this.storeMetadata) {
      if (metadata.createdAt < oldestTime) {
        oldestTime = metadata.createdAt;
        oldestStore = {
          key,
          age: now - metadata.createdAt
        };
      }
    }
    
    // Estimate memory usage (rough calculation)
    const estimatedMemoryPerStore = 0.5; // MB
    const totalMemoryMB = keys.length * estimatedMemoryPerStore;
    
    return {
      totalStores: keys.length,
      sessionsCount: sessions.size,
      participantsCount: keys.length,
      averageParticipantsPerSession: sessions.size > 0 ? keys.length / sessions.size : 0,
      oldestStore,
      memoryUsageEstimate: `~${totalMemoryMB.toFixed(1)}MB`
    };
  }

  /**
   * Identifies inactive stores that should be cleaned up
   */
  getInactiveStores(): string[] {
    const now = Date.now();
    const inactive: string[] = [];
    
    for (const [key, metadata] of this.storeMetadata) {
      const inactiveTime = now - metadata.lastAccessed;
      if (inactiveTime > this.maxInactiveMs) {
        inactive.push(key);
      }
    }
    
    return inactive;
  }

  /**
   * Gets detailed metadata for a specific store
   */
  getStoreMetadata(key: string): StoreMetadata | null {
    return this.storeMetadata.get(key) || null;
  }

  /**
   * Gets all store keys sorted by last access time
   */
  getStoresSortedByAccess(): Array<{ key: string; metadata: StoreMetadata }> {
    return Array.from(this.storeMetadata.entries())
      .map(([key, metadata]) => ({ key, metadata }))
      .sort((a, b) => b.metadata.lastAccessed - a.metadata.lastAccessed);
  }

  /**
   * Warns about potential memory issues
   */
  checkForMemoryWarnings(): string[] {
    const warnings: string[] = [];
    const stats = this.getMemoryStats();
    
    // Too many total stores
    if (stats.totalStores > 100) {
      warnings.push(`High store count: ${stats.totalStores} stores active. Consider cleanup.`);
    }
    
    // Too many stores per session
    if (stats.averageParticipantsPerSession > 50) {
      warnings.push(`High participants per session: ${stats.averageParticipantsPerSession.toFixed(1)} average.`);
    }
    
    // Very old stores
    if (stats.oldestStore && stats.oldestStore.age > 3600000) { // 1 hour
      const ageHours = (stats.oldestStore.age / 3600000).toFixed(1);
      warnings.push(`Old store detected: ${stats.oldestStore.key} is ${ageHours} hours old.`);
    }
    
    // Too many inactive stores
    const inactiveCount = this.getInactiveStores().length;
    if (inactiveCount > 10) {
      warnings.push(`High inactive store count: ${inactiveCount} stores need cleanup.`);
    }
    
    return warnings;
  }

  /**
   * Development utility - logs memory stats to console
   */
  logMemoryStats(): void {
    if (process.env.NODE_ENV !== 'development') return;
    
    const stats = this.getMemoryStats();
    const warnings = this.checkForMemoryWarnings();
    
    console.group('[MemoryTracker] Current Statistics');
    console.log('Total Stores:', stats.totalStores);
    console.log('Sessions:', stats.sessionsCount);
    console.log('Participants:', stats.participantsCount);
    console.log('Avg Participants/Session:', stats.averageParticipantsPerSession.toFixed(1));
    console.log('Memory Estimate:', stats.memoryUsageEstimate);
    
    if (stats.oldestStore) {
      const ageMinutes = (stats.oldestStore.age / 60000).toFixed(1);
      console.log('Oldest Store:', `${stats.oldestStore.key} (${ageMinutes}m old)`);
    }
    
    if (warnings.length > 0) {
      console.warn('Memory Warnings:');
      warnings.forEach(warning => console.warn(`  - ${warning}`));
    }
    
    console.groupEnd();
  }
}