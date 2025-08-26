/**
 * Hook for managing animation state and providing animation controls
 */

import { useCallback, useRef, useEffect } from 'react';
import { useAnimation, AnimationControls } from 'framer-motion';
import { animationController, performanceMonitor } from '../lib/animations/utils';
import { useReducedMotion } from './useReducedMotion';
import { DEBUG_CONFIG } from '../lib/animations/constants';

/**
 * Hook for managing card flip animations with error recovery
 */
export function useCardFlipAnimation(cardId: string) {
  const controls = useAnimation();
  const prefersReduced = useReducedMotion();
  const animationInProgress = useRef(false);

  const flipToFront = useCallback(async () => {
    if (animationInProgress.current) return;
    
    const animationId = `card-flip-${cardId}-front`;
    animationInProgress.current = true;

    try {
      await animationController.executeAnimation(
        animationId,
        async () => {
          if (prefersReduced) {
            await controls.set('front');
          } else {
            await controls.start('front');
          }
        },
        () => {
          // Fallback: immediately set to front state
          controls.set('front');
        }
      );
    } finally {
      animationInProgress.current = false;
    }
  }, [cardId, controls, prefersReduced]);

  const flipToBack = useCallback(async () => {
    if (animationInProgress.current) return;
    
    const animationId = `card-flip-${cardId}-back`;
    animationInProgress.current = true;

    try {
      await animationController.executeAnimation(
        animationId,
        async () => {
          if (prefersReduced) {
            await controls.set('back');
          } else {
            await controls.start('back');
          }
        },
        () => {
          // Fallback: immediately set to back state
          controls.set('back');
        }
      );
    } finally {
      animationInProgress.current = false;
    }
  }, [cardId, controls, prefersReduced]);

  const moveToStaging = useCallback(async () => {
    if (animationInProgress.current) return;
    
    const animationId = `card-staging-${cardId}`;
    animationInProgress.current = true;

    try {
      await animationController.executeAnimation(
        animationId,
        async () => {
          if (prefersReduced) {
            await controls.set('staging');
          } else {
            await controls.start('staging');
          }
        },
        () => {
          // Fallback: immediately set to staging state
          controls.set('staging');
        }
      );
    } finally {
      animationInProgress.current = false;
    }
  }, [cardId, controls, prefersReduced]);

  const cancelAnimation = useCallback(() => {
    animationController.cancelAnimation(`card-flip-${cardId}-front`);
    animationController.cancelAnimation(`card-flip-${cardId}-back`);
    animationController.cancelAnimation(`card-staging-${cardId}`);
    animationInProgress.current = false;
  }, [cardId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimation();
    };
  }, [cancelAnimation]);

  return {
    controls,
    flipToFront,
    flipToBack,
    moveToStaging,
    cancelAnimation,
    isAnimating: animationInProgress.current,
  };
}

/**
 * Hook for managing pile transition animations
 */
export function usePileTransitionAnimation(pileId: string) {
  const controls = useAnimation();
  const prefersReduced = useReducedMotion();
  const sequenceInProgress = useRef(false);

  const executeTransitionSequence = useCallback(async (
    sequence: Array<{ variant: string; delay?: number }>
  ) => {
    if (sequenceInProgress.current) return;
    
    const animationId = `pile-transition-${pileId}`;
    sequenceInProgress.current = true;

    try {
      await animationController.executeAnimation(
        animationId,
        async () => {
          for (const step of sequence) {
            if (step.delay) {
              await new Promise(resolve => setTimeout(resolve, step.delay));
            }
            
            if (prefersReduced) {
              await controls.set(step.variant);
            } else {
              await controls.start(step.variant);
            }
          }
        },
        () => {
          // Fallback: jump to final state
          const finalVariant = sequence[sequence.length - 1]?.variant;
          if (finalVariant) {
            controls.set(finalVariant);
          }
        }
      );
    } finally {
      sequenceInProgress.current = false;
    }
  }, [pileId, controls, prefersReduced]);

  const collectAndMove = useCallback(async () => {
    await executeTransitionSequence([
      { variant: 'collecting' },
      { variant: 'stacking', delay: 300 },
      { variant: 'flipping', delay: 300 },
      { variant: 'moving', delay: 200 },
    ]);
  }, [executeTransitionSequence]);

  const redistribute = useCallback(async () => {
    await executeTransitionSequence([
      { variant: 'redistributing' },
    ]);
  }, [executeTransitionSequence]);

  const cancelTransition = useCallback(() => {
    animationController.cancelAnimation(`pile-transition-${pileId}`);
    sequenceInProgress.current = false;
  }, [pileId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelTransition();
    };
  }, [cancelTransition]);

  return {
    controls,
    collectAndMove,
    redistribute,
    cancelTransition,
    isTransitioning: sequenceInProgress.current,
  };
}

/**
 * Hook for managing frame expansion animation
 */
export function useFrameExpansionAnimation() {
  const controls = useAnimation();
  const prefersReduced = useReducedMotion();
  const expansionInProgress = useRef(false);

  const expandFrame = useCallback(async () => {
    if (expansionInProgress.current) return;
    
    const animationId = 'frame-expansion';
    expansionInProgress.current = true;

    try {
      await animationController.executeAnimation(
        animationId,
        async () => {
          if (prefersReduced) {
            await controls.set('expanded');
          } else {
            await controls.start('expanded');
          }
        },
        () => {
          // Fallback: immediately set to expanded state
          controls.set('expanded');
        }
      );
    } finally {
      expansionInProgress.current = false;
    }
  }, [controls, prefersReduced]);

  const collapseFrame = useCallback(async () => {
    if (expansionInProgress.current) return;
    
    const animationId = 'frame-collapse';
    expansionInProgress.current = true;

    try {
      await animationController.executeAnimation(
        animationId,
        async () => {
          if (prefersReduced) {
            await controls.set('collapsed');
          } else {
            await controls.start('collapsed');
          }
        },
        () => {
          // Fallback: immediately set to collapsed state
          controls.set('collapsed');
        }
      );
    } finally {
      expansionInProgress.current = false;
    }
  }, [controls, prefersReduced]);

  const cancelExpansion = useCallback(() => {
    animationController.cancelAnimation('frame-expansion');
    animationController.cancelAnimation('frame-collapse');
    expansionInProgress.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelExpansion();
    };
  }, [cancelExpansion]);

  return {
    controls,
    expandFrame,
    collapseFrame,
    cancelExpansion,
    isExpanding: expansionInProgress.current,
  };
}

/**
 * Hook for managing performance monitoring during animations
 */
export function useAnimationPerformance() {
  useEffect(() => {
    if (!DEBUG_CONFIG.logPerformance) return;

    const interval = setInterval(() => {
      const avgFrameRate = performanceMonitor.getAverageFrameRate();
      
      if (performanceMonitor.isPerformancePoor()) {
        console.warn(`[Animation Performance] Poor performance detected: ${avgFrameRate.toFixed(1)} FPS`);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    getFrameRate: () => performanceMonitor.getAverageFrameRate(),
    isPerformancePoor: () => performanceMonitor.isPerformancePoor(),
    getAnimationStats: (id: string) => performanceMonitor.getAnimationStats(id),
  };
}