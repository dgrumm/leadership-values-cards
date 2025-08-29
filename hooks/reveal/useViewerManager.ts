import { useState, useCallback, useMemo } from 'react';
import { createViewerManager } from '@/lib/reveal/viewer-manager';
import { ViewerState, ViewerResult, AvailableReveal } from '@/lib/reveal/types';

export interface UseViewerManagerResult {
  // State
  currentView: ViewerState | null;
  isViewing: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  enterViewMode: (targetParticipantId: string, revealType: 'top8' | 'top3') => Promise<ViewerResult>;
  exitViewMode: () => Promise<ViewerResult>;
  switchToView: (targetParticipantId: string, revealType: 'top8' | 'top3') => Promise<ViewerResult>;
  refreshCurrentView: () => Promise<ViewerResult>;
  
  // Data
  getAvailableReveals: () => Promise<AvailableReveal[]>;
  getViewingDuration: () => number;
  
  // Utilities
  clearError: () => void;
}

/**
 * Hook for managing viewer functionality
 * Handles viewing other participants' revealed selections
 */
export function useViewerManager(
  sessionCode: string,
  viewerParticipantId: string
): UseViewerManagerResult {
  const [currentView, setCurrentView] = useState<ViewerState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create viewer manager instance (memoized)
  const viewerManager = useMemo(() => {
    return createViewerManager(sessionCode, viewerParticipantId);
  }, [sessionCode, viewerParticipantId]);

  // Computed state
  const isViewing = useMemo(() => {
    return currentView?.isActive || false;
  }, [currentView]);

  // Enter viewer mode
  const enterViewMode = useCallback(async (
    targetParticipantId: string,
    revealType: 'top8' | 'top3'
  ): Promise<ViewerResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await viewerManager.enterViewMode(targetParticipantId, revealType);
      
      if (result.success && result.viewerState) {
        setCurrentView(result.viewerState);
      } else {
        setError(result.error || 'Failed to enter view mode');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error entering view mode';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [viewerManager]);

  // Exit viewer mode
  const exitViewMode = useCallback(async (): Promise<ViewerResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await viewerManager.exitViewMode();
      
      if (result.success) {
        setCurrentView(null);
      } else {
        setError(result.error || 'Failed to exit view mode');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error exiting view mode';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [viewerManager]);

  // Switch to a different view
  const switchToView = useCallback(async (
    targetParticipantId: string,
    revealType: 'top8' | 'top3'
  ): Promise<ViewerResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await viewerManager.switchToView(targetParticipantId, revealType);
      
      if (result.success && result.viewerState) {
        setCurrentView(result.viewerState);
      } else {
        setError(result.error || 'Failed to switch view');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error switching view';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [viewerManager]);

  // Refresh current view
  const refreshCurrentView = useCallback(async (): Promise<ViewerResult> => {
    if (!currentView) {
      return { success: false, error: 'No active view to refresh' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await viewerManager.refreshCurrentView();
      
      if (result.success && result.viewerState) {
        setCurrentView(result.viewerState);
      } else if (!result.success) {
        // If refresh failed due to selection no longer being available,
        // clear the current view
        if (result.error?.includes('no longer available')) {
          setCurrentView(null);
        }
        setError(result.error || 'Failed to refresh view');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error refreshing view';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [viewerManager, currentView]);

  // Get available reveals for navigation
  const getAvailableReveals = useCallback(async (): Promise<AvailableReveal[]> => {
    try {
      return await viewerManager.getAvailableReveals();
    } catch (err) {
      console.error('Error getting available reveals:', err);
      return [];
    }
  }, [viewerManager]);

  // Get viewing duration
  const getViewingDuration = useCallback((): number => {
    return viewerManager.getViewingDuration();
  }, [viewerManager]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    currentView,
    isViewing,
    isLoading,
    error,
    
    // Actions
    enterViewMode,
    exitViewMode,
    switchToView,
    refreshCurrentView,
    
    // Data
    getAvailableReveals,
    getViewingDuration,
    
    // Utilities
    clearError
  };
}