import { useCallback } from 'react';
import { useEventDrivenSession } from '@/contexts/EventDrivenSessionContext';
import type { ViewerArrangement } from '@/lib/collaboration/viewer-sync';

export interface UseSharedViewerSyncReturn {
  arrangements: ViewerArrangement[];
  revealArrangement: (arrangement: ViewerArrangement) => Promise<void>;
  updateArrangement: (participantId: string, delta: Partial<ViewerArrangement>) => Promise<void>;
  hideArrangement: (participantId: string) => Promise<void>;
  getArrangement: (participantId: string) => ViewerArrangement | undefined;
  isReady: boolean;
  error: string | null;
}

/**
 * useSharedViewerSync - Uses the shared ViewerSync instance from EventDrivenSessionContext
 * 
 * This prevents multiple ViewerSync instances from being created, ensuring all components
 * use the same instance for consistent state across the application.
 */
export function useSharedViewerSync(): UseSharedViewerSyncReturn {
  const { viewerSync, viewerSyncArrangements } = useEventDrivenSession();

  const revealArrangement = useCallback(async (arrangement: ViewerArrangement) => {
    if (!viewerSync) {
      throw new Error('ViewerSync not ready');
    }
    await viewerSync.revealArrangement(arrangement);
  }, [viewerSync]);

  const updateArrangement = useCallback(async (participantId: string, delta: Partial<ViewerArrangement>) => {
    if (!viewerSync) {
      throw new Error('ViewerSync not ready');
    }
    await viewerSync.updateArrangement(participantId, delta);
  }, [viewerSync]);

  const hideArrangement = useCallback(async (participantId: string) => {
    if (!viewerSync) {
      throw new Error('ViewerSync not ready');
    }
    await viewerSync.hideArrangement(participantId);
  }, [viewerSync]);

  const getArrangement = useCallback((participantId: string) => {
    return viewerSyncArrangements.get(participantId);
  }, [viewerSyncArrangements]);

  return {
    arrangements: Array.from(viewerSyncArrangements.values()),
    revealArrangement,
    updateArrangement,
    hideArrangement,
    getArrangement,
    isReady: Boolean(viewerSync),
    error: viewerSync ? null : 'ViewerSync not available'
  };
}