/**
 * Hook for handling reduced motion accessibility preferences
 * Respects user's prefers-reduced-motion setting
 */

import { useEffect, useState } from 'react';
import { A11Y_CONFIG } from '../lib/animations/constants';

/**
 * Custom hook to detect and respond to user's motion preferences
 * @returns boolean indicating if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined' || !A11Y_CONFIG.respectReducedMotion) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    // Cleanup listener
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to get animation duration based on motion preferences
 * @param normalDuration - Duration in milliseconds for normal motion
 * @param reducedDuration - Optional reduced duration, defaults to 0
 * @returns Appropriate duration based on user preference
 */
export function useAnimationDuration(
  normalDuration: number,
  reducedDuration: number = 0
): number {
  const prefersReduced = useReducedMotion();
  
  if (!A11Y_CONFIG.respectReducedMotion) {
    return normalDuration;
  }
  
  return prefersReduced ? reducedDuration : normalDuration;
}

/**
 * Hook to get conditional animation variants based on motion preferences
 * @param normalVariants - Normal animation variants object
 * @param reducedVariants - Reduced motion variants object
 * @returns Appropriate variants based on user preference
 */
export function useAnimationVariants<T>(
  normalVariants: T,
  reducedVariants: T
): T {
  const prefersReduced = useReducedMotion();
  
  if (!A11Y_CONFIG.respectReducedMotion) {
    return normalVariants;
  }
  
  return prefersReduced ? reducedVariants : normalVariants;
}