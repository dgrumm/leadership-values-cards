'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook for managing reveal button toast notifications per session
 * Tracks whether toast has been shown for each step when reveal button becomes available
 */

export interface UseRevealToastReturn {
  shouldShowToast: (step: 'step2' | 'step3') => boolean;
  markToastShown: (step: 'step2' | 'step3') => void;
  resetToasts: () => void; // For testing purposes
}

interface ToastState {
  step2Shown: boolean;
  step3Shown: boolean;
}

export function useRevealToast(sessionCode: string): UseRevealToastReturn {
  const [toastState, setToastState] = useState<ToastState>({
    step2Shown: false,
    step3Shown: false
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Generate session-specific storage key
  const storageKey = `leadership-values-reveal-toast-${sessionCode}`;

  // Load toast state from sessionStorage on mount
  useEffect(() => {
    if (!sessionCode) {
      setIsLoaded(true);
      return;
    }

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsedState = JSON.parse(stored) as ToastState;
        setToastState(parsedState);
      }
    } catch (error) {
      // Silently handle storage errors (e.g., private browsing mode)
      console.warn('Failed to load reveal toast state from sessionStorage:', error);
    }
    
    setIsLoaded(true);
  }, [sessionCode, storageKey]);

  // Check if toast should be shown for a specific step
  const shouldShowToast = (step: 'step2' | 'step3'): boolean => {
    if (!isLoaded || !sessionCode) return false;
    return !toastState[`${step}Shown`];
  };

  // Mark toast as shown for a specific step and persist to sessionStorage
  const markToastShown = (step: 'step2' | 'step3') => {
    setToastState(currentState => {
      const newState = {
        ...currentState,
        [`${step}Shown`]: true
      };

      try {
        sessionStorage.setItem(storageKey, JSON.stringify(newState));
      } catch (error) {
        // Still update local state even if storage fails
        console.warn('Failed to save reveal toast state to sessionStorage:', error);
      }

      return newState;
    });
  };

  // Reset toast state (primarily for testing)
  const resetToasts = () => {
    const resetState = { step2Shown: false, step3Shown: false };
    
    try {
      sessionStorage.removeItem(storageKey);
      setToastState(resetState);
    } catch (error) {
      console.warn('Failed to reset reveal toast state:', error);
      setToastState(resetState);
    }
  };

  return {
    shouldShowToast,
    markToastShown,
    resetToasts
  };
}