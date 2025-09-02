'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook for managing reveal education modal state per session
 * Tracks whether the user has seen the education modal for this session
 */

export interface UseRevealEducationReturn {
  shouldShowEducation: boolean;
  markEducationShown: () => void;
  resetEducation: () => void; // For testing purposes
}

export function useRevealEducation(sessionCode: string): UseRevealEducationReturn {
  const [hasSeenEducation, setHasSeenEducation] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Generate session-specific storage key
  const storageKey = `leadership-values-reveal-education-${sessionCode}`;

  // Load education state from sessionStorage on mount
  useEffect(() => {
    if (!sessionCode) {
      setIsLoaded(true);
      return;
    }

    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored === 'true') {
        setHasSeenEducation(true);
      }
    } catch (error) {
      // Silently handle storage errors (e.g., private browsing mode)
      console.warn('Failed to load reveal education state from sessionStorage:', error);
    }
    
    setIsLoaded(true);
  }, [sessionCode, storageKey]);

  // Mark education as shown and persist to sessionStorage
  const markEducationShown = () => {
    try {
      sessionStorage.setItem(storageKey, 'true');
      setHasSeenEducation(true);
    } catch (error) {
      // Still update local state even if storage fails
      console.warn('Failed to save reveal education state to sessionStorage:', error);
      setHasSeenEducation(true);
    }
  };

  // Reset education state (primarily for testing)
  const resetEducation = () => {
    try {
      sessionStorage.removeItem(storageKey);
      setHasSeenEducation(false);
    } catch (error) {
      console.warn('Failed to reset reveal education state:', error);
      setHasSeenEducation(false);
    }
  };

  return {
    shouldShowEducation: isLoaded && !hasSeenEducation && !!sessionCode,
    markEducationShown,
    resetEducation
  };
}