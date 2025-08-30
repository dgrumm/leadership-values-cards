import { useState, useCallback, useMemo } from 'react';
import { createRevealManager } from '@/lib/reveal/reveal-manager';
import { RevealResult } from '@/lib/reveal/types';
import { useSessionManager } from '@/contexts/SessionStoreContext';

export interface UseRevealManagerResult {
  // State
  isRevealing: boolean;
  error: string | null;
  
  // Actions
  revealSelection: (type: 'top8' | 'top3') => Promise<RevealResult>;
  unrevelSelection: (type: 'top8' | 'top3') => Promise<RevealResult>;
  isRevealed: (type: 'top8' | 'top3') => Promise<boolean>;
  
  // Utilities
  clearError: () => void;
}

/**
 * Hook for managing reveal functionality
 * Integrates with session-scoped stores and hybrid architecture
 */
export function useRevealManager(
  sessionCode: string,
  participantId: string
): UseRevealManagerResult {
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the same SessionStoreManager instance that the UI uses
  const sessionManager = useSessionManager();

  // Create reveal manager instance (memoized)
  const revealManager = useMemo(() => {
    return createRevealManager(sessionCode, participantId, sessionManager);
  }, [sessionCode, participantId, sessionManager]);

  // Reveal a selection
  const revealSelection = useCallback(async (type: 'top8' | 'top3'): Promise<RevealResult> => {
    setIsRevealing(true);
    setError(null);

    try {
      const result = await revealManager.revealSelection(type);
      
      if (!result.success) {
        setError(result.error || 'Failed to reveal selection');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error during reveal';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsRevealing(false);
    }
  }, [revealManager]);

  // Unreveal a selection
  const unrevelSelection = useCallback(async (type: 'top8' | 'top3'): Promise<RevealResult> => {
    setIsRevealing(true);
    setError(null);

    try {
      const result = await revealManager.unrevelSelection(type);
      
      if (!result.success) {
        setError(result.error || 'Failed to unreveal selection');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error during unreveal';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsRevealing(false);
    }
  }, [revealManager]);

  // Check if selection is revealed
  const isRevealed = useCallback(async (type: 'top8' | 'top3'): Promise<boolean> => {
    try {
      return await revealManager.isRevealed(type);
    } catch (err) {
      console.error('Error checking reveal status:', err);
      return false;
    }
  }, [revealManager]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isRevealing,
    error,
    
    // Actions
    revealSelection,
    unrevelSelection,
    isRevealed,
    
    // Utilities
    clearError
  };
}