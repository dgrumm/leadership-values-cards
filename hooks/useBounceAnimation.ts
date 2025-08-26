'use client';

import { useRef, useCallback } from 'react';
import { useAnimation, AnimationControls } from 'framer-motion';

export interface BounceConfig {
  intensity?: 'light' | 'medium' | 'strong';
  duration?: number;
  direction?: 'horizontal' | 'vertical' | 'both';
  elastic?: boolean;
}

const BOUNCE_VARIANTS = {
  light: {
    horizontal: { x: [-5, 5, -3, 3, 0], transition: { duration: 0.3 } },
    vertical: { y: [-5, 5, -3, 3, 0], transition: { duration: 0.3 } },
    both: { 
      x: [-3, 3, -2, 2, 0], 
      y: [-3, 3, -2, 2, 0], 
      transition: { duration: 0.3 } 
    }
  },
  medium: {
    horizontal: { x: [-10, 10, -6, 6, 0], transition: { duration: 0.4 } },
    vertical: { y: [-10, 10, -6, 6, 0], transition: { duration: 0.4 } },
    both: { 
      x: [-7, 7, -4, 4, 0], 
      y: [-7, 7, -4, 4, 0], 
      transition: { duration: 0.4 } 
    }
  },
  strong: {
    horizontal: { x: [-15, 15, -10, 10, -5, 5, 0], transition: { duration: 0.5 } },
    vertical: { y: [-15, 15, -10, 10, -5, 5, 0], transition: { duration: 0.5 } },
    both: { 
      x: [-10, 10, -6, 6, -3, 3, 0], 
      y: [-10, 10, -6, 6, -3, 3, 0], 
      transition: { duration: 0.5 } 
    }
  }
};

const ELASTIC_VARIANTS = {
  light: {
    scale: [1, 0.95, 1.05, 0.98, 1],
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 10, 
      duration: 0.4 
    }
  },
  medium: {
    scale: [1, 0.9, 1.1, 0.95, 1.02, 1],
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 8, 
      duration: 0.5 
    }
  },
  strong: {
    scale: [1, 0.85, 1.15, 0.92, 1.05, 0.98, 1],
    transition: { 
      type: "spring", 
      stiffness: 250, 
      damping: 6, 
      duration: 0.6 
    }
  }
};

export function useBounceAnimation(config: BounceConfig = {}) {
  const {
    intensity = 'medium',
    direction = 'horizontal',
    elastic = false
  } = config;

  const controls = useAnimation();
  const isAnimatingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const triggerBounce = useCallback(async () => {
    // Prevent overlapping animations
    if (isAnimatingRef.current) return;
    
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    isAnimatingRef.current = true;

    try {
      // Reset to initial state
      await controls.set({ x: 0, y: 0, scale: 1 });

      if (elastic) {
        // Elastic bounce animation
        await controls.start(ELASTIC_VARIANTS[intensity]);
      } else {
        // Directional bounce animation
        await controls.start(BOUNCE_VARIANTS[intensity][direction]);
      }
    } catch (error) {
      // Animation was interrupted, which is fine
      console.debug('Bounce animation interrupted:', error);
    } finally {
      // Reset animation flag after a delay to prevent rapid retriggering
      timeoutRef.current = setTimeout(() => {
        isAnimatingRef.current = false;
      }, 100);
    }
  }, [controls, intensity, direction, elastic]);

  const resetAnimation = useCallback(() => {
    isAnimatingRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    controls.set({ x: 0, y: 0, scale: 1 });
  }, [controls]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    isAnimatingRef.current = false;
  }, []);

  return {
    controls,
    triggerBounce,
    resetAnimation,
    isAnimating: isAnimatingRef.current,
    cleanup
  };
}

/**
 * Hook specifically for card rejection bounces
 */
export function useCardRejectionBounce() {
  return useBounceAnimation({
    intensity: 'medium',
    direction: 'both',
    elastic: true
  });
}

/**
 * Hook for pile overflow feedback
 */  
export function usePileOverflowBounce() {
  return useBounceAnimation({
    intensity: 'light',
    direction: 'horizontal',
    elastic: false
  });
}

/**
 * Hook for button rejection feedback
 */
export function useButtonRejectionBounce() {
  return useBounceAnimation({
    intensity: 'light',
    direction: 'horizontal',
    elastic: false
  });
}