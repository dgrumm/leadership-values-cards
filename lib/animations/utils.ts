/**
 * Animation utilities and helper functions
 * Includes error recovery, performance monitoring, and debug tools
 */

import { ANIMATION_TIMINGS, PERFORMANCE, DEBUG_CONFIG, A11Y_CONFIG } from './constants';

/**
 * Animation state management for error recovery
 */
export class AnimationController {
  private activeAnimations = new Set<string>();
  private animationPromises = new Map<string, Promise<void>>();
  private performanceMonitor = new PerformanceMonitor();

  /**
   * Register a new animation with error recovery
   */
  async executeAnimation(
    id: string,
    animationFn: () => Promise<void>,
    fallbackFn?: () => void
  ): Promise<void> {
    if (this.activeAnimations.has(id)) {
      this.cancelAnimation(id);
    }

    this.activeAnimations.add(id);
    
    const animationPromise = this.wrapWithErrorRecovery(
      animationFn,
      fallbackFn,
      id
    );
    
    this.animationPromises.set(id, animationPromise);

    try {
      await animationPromise;
    } finally {
      this.activeAnimations.delete(id);
      this.animationPromises.delete(id);
    }
  }

  /**
   * Cancel a running animation and jump to end state
   */
  cancelAnimation(id: string): void {
    if (this.activeAnimations.has(id)) {
      this.activeAnimations.delete(id);
      const promise = this.animationPromises.get(id);
      if (promise) {
        // Cancel the promise if possible (implementation specific)
        this.animationPromises.delete(id);
        if (DEBUG_CONFIG.enabled) {
          console.log(`[Animation] Cancelled: ${id}`);
        }
      }
    }
  }

  /**
   * Cancel all running animations
   */
  cancelAllAnimations(): void {
    for (const id of this.activeAnimations) {
      this.cancelAnimation(id);
    }
  }

  private async wrapWithErrorRecovery(
    animationFn: () => Promise<void>,
    fallbackFn?: () => void,
    id?: string
  ): Promise<void> {
    const startTime = performance.now();
    
    try {
      await Promise.race([
        animationFn(),
        this.createTimeoutPromise(PERFORMANCE.maxAnimationDuration)
      ]);
      
      if (DEBUG_CONFIG.logPerformance) {
        const duration = performance.now() - startTime;
        this.performanceMonitor.recordAnimation(id || 'unknown', duration);
      }
    } catch (error) {
      if (DEBUG_CONFIG.enabled) {
        console.warn(`[Animation] Error in ${id}:`, error);
      }
      
      // Execute fallback to ensure UI stays functional
      if (fallbackFn) {
        fallbackFn();
      }
      
      throw error;
    }
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Animation timeout')), timeout);
    });
  }
}

/**
 * Performance monitoring for animations
 */
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  private frameRateHistory: number[] = [];
  private lastFrameTime = performance.now();

  recordAnimation(id: string, duration: number): void {
    if (!this.metrics.has(id)) {
      this.metrics.set(id, []);
    }
    this.metrics.get(id)!.push(duration);

    // Keep only last 100 measurements per animation
    const measurements = this.metrics.get(id)!;
    if (measurements.length > 100) {
      measurements.splice(0, measurements.length - 100);
    }
  }

  recordFrame(): void {
    const now = performance.now();
    const frameDuration = now - this.lastFrameTime;
    this.frameRateHistory.push(1000 / frameDuration);
    this.lastFrameTime = now;

    // Keep only last 60 frame measurements (1 second at 60fps)
    if (this.frameRateHistory.length > 60) {
      this.frameRateHistory.splice(0, this.frameRateHistory.length - 60);
    }
  }

  getAverageFrameRate(): number {
    if (this.frameRateHistory.length === 0) return 60;
    const sum = this.frameRateHistory.reduce((a, b) => a + b, 0);
    return sum / this.frameRateHistory.length;
  }

  getAnimationStats(id: string): { avg: number; min: number; max: number } | null {
    const measurements = this.metrics.get(id);
    if (!measurements || measurements.length === 0) return null;

    return {
      avg: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      min: Math.min(...measurements),
      max: Math.max(...measurements),
    };
  }

  isPerformancePoor(): boolean {
    return this.getAverageFrameRate() < PERFORMANCE.targetFPS * 0.8; // 80% threshold
  }
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}

/**
 * Get animation duration based on reduced motion preference
 */
export function getAnimationDuration(
  normalDuration: number,
  reducedDuration?: number
): number {
  if (!A11Y_CONFIG.respectReducedMotion) return normalDuration;
  
  if (prefersReducedMotion()) {
    return reducedDuration || A11Y_CONFIG.skipAnimationsThreshold || 0;
  }
  
  return normalDuration;
}

/**
 * Create a stagger delay function
 */
export function createStaggerDelay(
  baseDelay: number,
  increment: number
): (index: number) => number {
  return (index: number) => baseDelay + (index * increment);
}

/**
 * Batch animations to prevent performance issues
 */
export function batchAnimations<T>(
  items: T[],
  animationFn: (item: T, index: number) => Promise<void>,
  batchSize: number = PERFORMANCE.batchSize
): Promise<void[]> {
  const batches: Promise<void[]>[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchPromise = Promise.all(
      batch.map((item, index) => animationFn(item, i + index))
    );
    batches.push(batchPromise);
  }
  
  return Promise.all(batches).then(() => []);
}

/**
 * Debug utilities for animation development
 */
export const debugUtils = {
  /**
   * Enable slow motion for all animations
   */
  enableSlowMotion() {
    if (DEBUG_CONFIG.enabled) {
      document.documentElement.style.setProperty(
        '--animation-speed-multiplier',
        DEBUG_CONFIG.slowMotionMultiplier.toString()
      );
      console.log(`[Animation Debug] Slow motion enabled (${DEBUG_CONFIG.slowMotionMultiplier}x slower)`);
    }
  },

  /**
   * Disable slow motion
   */
  disableSlowMotion() {
    if (DEBUG_CONFIG.enabled) {
      document.documentElement.style.removeProperty('--animation-speed-multiplier');
      console.log('[Animation Debug] Slow motion disabled');
    }
  },

  /**
   * Show animation boundaries visually
   */
  showAnimationBoundaries() {
    if (DEBUG_CONFIG.enabled) {
      document.documentElement.classList.add('debug-animation-boundaries');
      console.log('[Animation Debug] Animation boundaries visible');
    }
  },

  /**
   * Hide animation boundaries
   */
  hideAnimationBoundaries() {
    if (DEBUG_CONFIG.enabled) {
      document.documentElement.classList.remove('debug-animation-boundaries');
      console.log('[Animation Debug] Animation boundaries hidden');
    }
  },

  /**
   * Log performance metrics to console
   */
  logPerformanceMetrics(monitor: PerformanceMonitor) {
    if (DEBUG_CONFIG.enabled) {
      console.group('[Animation Performance]');
      console.log(`Average FPS: ${monitor.getAverageFrameRate().toFixed(1)}`);
      console.log(`Performance Poor: ${monitor.isPerformancePoor()}`);
      console.groupEnd();
    }
  },

  /**
   * Test all animation variants
   */
  testAllVariants() {
    if (DEBUG_CONFIG.enabled) {
      console.log('[Animation Debug] Testing all variants - see console for details');
      // This would cycle through all animation states for visual testing
    }
  }
};

/**
 * Global animation controller instance
 */
export const animationController = new AnimationController();

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Setup animation debugging in development
 */
export function setupAnimationDebugging() {
  if (DEBUG_CONFIG.enabled && typeof window !== 'undefined') {
    // Add debug commands to window for console access
    (window as any).animationDebug = {
      ...debugUtils,
      controller: animationController,
      monitor: performanceMonitor,
      slowMotion: () => debugUtils.enableSlowMotion(),
      normalSpeed: () => debugUtils.disableSlowMotion(),
      showBounds: () => debugUtils.showAnimationBoundaries(),
      hideBounds: () => debugUtils.hideAnimationBoundaries(),
      stats: () => debugUtils.logPerformanceMetrics(performanceMonitor),
    };

    console.log(`
🎬 Animation Debug Mode Enabled
Available commands:
  animationDebug.slowMotion() - Enable slow motion
  animationDebug.normalSpeed() - Disable slow motion  
  animationDebug.showBounds()  - Show animation boundaries
  animationDebug.hideBounds()  - Hide animation boundaries
  animationDebug.stats()       - Show performance stats
    `);

    // Monitor frame rate in development
    let frameCount = 0;
    function monitorFrameRate() {
      performanceMonitor.recordFrame();
      frameCount++;
      
      // Log performance every 5 seconds
      if (frameCount % 300 === 0 && DEBUG_CONFIG.logPerformance) {
        debugUtils.logPerformanceMetrics(performanceMonitor);
      }
      
      requestAnimationFrame(monitorFrameRate);
    }
    requestAnimationFrame(monitorFrameRate);
  }
}