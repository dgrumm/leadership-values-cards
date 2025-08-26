/**
 * Animation system exports
 * Central entry point for all animation-related functionality
 */

// Constants and configuration
export {
  ANIMATION_TIMINGS,
  EASING,
  PERFORMANCE,
  DEBUG_CONFIG,
  A11Y_CONFIG,
} from './constants';

// Animation variants for Framer Motion
export {
  cardFlipVariants,
  cardHoverVariants,
  pileTransitionVariants,
  frameExpansionVariants,
  cardSnapVariants,
  bounceRejectionVariants,
  staggeredDistribution,
  buttonVariants,
  modalVariants,
  errorVariants,
  loadingVariants,
  tooltipVariants,
  progressVariants,
} from './variants';

// Utilities and helper functions
export {
  AnimationController,
  prefersReducedMotion,
  getAnimationDuration,
  createStaggerDelay,
  batchAnimations,
  debugUtils,
  animationController,
  performanceMonitor,
  setupAnimationDebugging,
} from './utils';

// Re-export hooks for convenience
export {
  useReducedMotion,
  useAnimationDuration,
  useAnimationVariants,
} from '../hooks/useReducedMotion';

export {
  useCardFlipAnimation,
  usePileTransitionAnimation,
  useFrameExpansionAnimation,
  useAnimationPerformance,
} from '../hooks/useAnimations';

// Type definitions for animation system
export interface AnimationConfig {
  duration: number;
  easing: string | number[];
  delay?: number;
  repeat?: number;
  repeatType?: 'loop' | 'reverse' | 'mirror';
}

export interface StaggerConfig {
  delayChildren?: number;
  staggerChildren?: number;
  staggerDirection?: 1 | -1;
  when?: 'beforeChildren' | 'afterChildren';
}

export interface PerformanceMetrics {
  averageFrameRate: number;
  animationStats: Record<string, {
    avg: number;
    min: number;
    max: number;
  }>;
  isPerformancePoor: boolean;
}

export interface DebugOptions {
  slowMotion?: boolean;
  showBoundaries?: boolean;
  logPerformance?: boolean;
  visualizeStagger?: boolean;
}