import { useState, useEffect, useCallback, useRef } from 'react';
import { ViewerSync, type ViewerArrangement } from '@/lib/collaboration/viewer-sync';
import { getAblyService } from '@/lib/ably/ably-service';

export interface UseViewerSyncReturn {
  arrangements: ViewerArrangement[];
  revealArrangement: (arrangement: ViewerArrangement) => Promise<void>;
  updateArrangement: (participantId: string, delta: Partial<ViewerArrangement>) => Promise<void>;
  hideArrangement: (participantId: string) => Promise<void>;
  getArrangement: (participantId: string) => ViewerArrangement | undefined;
  isReady: boolean;
  error: string | null;
}

export function useViewerSync(sessionCode: string): UseViewerSyncReturn {
  const [arrangements, setArrangements] = useState<Map<string, ViewerArrangement>>(new Map());
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewerSyncRef = useRef<ViewerSync | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const initializeViewerSync = async () => {
      try {
        const ablyService = getAblyService();
        
        const viewerSync = new ViewerSync({
          sessionCode,
          ablyService,
          onArrangementUpdate: (arrangement) => {
            if (mounted) {
              setArrangements(prev => new Map(prev.set(arrangement.participantId, arrangement)));
            }
          },
          onArrangementRemoved: (participantId) => {
            if (mounted) {
              setArrangements(prev => {
                const next = new Map(prev);
                next.delete(participantId);
                return next;
              });
            }
          }
        });

        await viewerSync.initialize();
        
        if (mounted) {
          viewerSyncRef.current = viewerSync;
          setIsReady(true);
          setError(null);
        }
      } catch (err) {
        console.error('[useViewerSync] Failed to initialize:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize viewer sync');
          setIsReady(false);
        }
      }
    };

    initializeViewerSync();

    return () => {
      mounted = false;
      if (viewerSyncRef.current) {
        viewerSyncRef.current.destroy();
        viewerSyncRef.current = null;
      }
    };
  }, [sessionCode]);

  const revealArrangement = useCallback(async (arrangement: ViewerArrangement) => {
    if (!viewerSyncRef.current) {
      throw new Error('ViewerSync not ready');
    }
    await viewerSyncRef.current.revealArrangement(arrangement);
  }, []);

  const updateArrangement = useCallback(async (participantId: string, delta: Partial<ViewerArrangement>) => {
    if (!viewerSyncRef.current) {
      throw new Error('ViewerSync not ready');
    }
    await viewerSyncRef.current.updateArrangement(participantId, delta);
  }, []);

  const hideArrangement = useCallback(async (participantId: string) => {
    if (!viewerSyncRef.current) {
      throw new Error('ViewerSync not ready');
    }
    await viewerSyncRef.current.hideArrangement(participantId);
  }, []);

  const getArrangement = useCallback((participantId: string) => {
    return viewerSyncRef.current?.getArrangement(participantId);
  }, []);

  return {
    arrangements: Array.from(arrangements.values()),
    revealArrangement,
    updateArrangement,
    hideArrangement,
    getArrangement,
    isReady,
    error
  };
}