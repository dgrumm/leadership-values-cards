import { useEffect, useState, useCallback, useRef } from 'react';
import { RevealManager, RevealState, CardPosition } from '@/lib/reveals/reveal-manager';
import { EventBus } from '@/lib/events/event-bus';

export interface UseRevealManagerOptions {
  eventBus: EventBus | null;
  sessionCode: string;
  participantId: string;
  participantName: string;
}

export interface UseRevealManagerReturn {
  revealManager: RevealManager | null;
  isRevealed: (revealType?: 'top8' | 'top3') => boolean;
  revealSelection: (revealType: 'top8' | 'top3', cardPositions: CardPosition[]) => Promise<void>;
  unrevealSelection: (revealType: 'top8' | 'top3') => Promise<void>;
  updateArrangement: (revealType: 'top8' | 'top3', cardPositions: CardPosition[]) => Promise<void>;
  joinViewer: (targetParticipantId: string) => Promise<void>;
  leaveViewer: (targetParticipantId: string) => Promise<void>;
  getRevealState: (participantId: string) => RevealState | undefined;
  getRevealedParticipants: () => RevealState[];
  getViewerCount: (participantId: string) => number;
  getViewers: (participantId: string) => string[];
  isReady: boolean;
  error: string | null;
}

export function useRevealManager({
  eventBus,
  sessionCode,
  participantId,
  participantName
}: UseRevealManagerOptions): UseRevealManagerReturn {
  const [revealManager, setRevealManager] = useState<RevealManager | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const cleanupRef = useRef<() => void>();

  // Initialize RevealManager when EventBus is available
  useEffect(() => {
    if (!eventBus || !sessionCode || !participantId || !participantName) {
      setRevealManager(null);
      setIsReady(false);
      return;
    }

    try {
      console.log('🔍 [useRevealManager] Initializing RevealManager for', `${sessionCode}:${participantId}`);
      
      const manager = new RevealManager(eventBus, sessionCode, participantId, participantName);
      setRevealManager(manager);
      setError(null);
      setIsReady(true);

      // Store cleanup function
      cleanupRef.current = () => {
        console.log('🧹 [useRevealManager] Cleaning up RevealManager for', `${sessionCode}:${participantId}`);
        manager.cleanup();
      };

      return () => {
        cleanupRef.current?.();
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize RevealManager';
      console.error('❌ [useRevealManager] Initialization failed:', errorMessage);
      setError(errorMessage);
      setIsReady(false);
    }
  }, [eventBus, sessionCode, participantId, participantName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  // Wrapped methods with error handling
  const revealSelection = useCallback(async (revealType: 'top8' | 'top3', cardPositions: CardPosition[]) => {
    if (!revealManager) {
      throw new Error('RevealManager not initialized');
    }
    
    try {
      await revealManager.revealSelection(revealType, cardPositions);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reveal selection';
      setError(errorMessage);
      throw err;
    }
  }, [revealManager]);

  const unrevealSelection = useCallback(async (revealType: 'top8' | 'top3') => {
    if (!revealManager) {
      throw new Error('RevealManager not initialized');
    }
    
    try {
      await revealManager.unrevealSelection(revealType);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unreveal selection';
      setError(errorMessage);
      throw err;
    }
  }, [revealManager]);

  const updateArrangement = useCallback(async (revealType: 'top8' | 'top3', cardPositions: CardPosition[]) => {
    if (!revealManager) {
      throw new Error('RevealManager not initialized');
    }
    
    try {
      await revealManager.updateArrangement(revealType, cardPositions);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update arrangement';
      setError(errorMessage);
      throw err;
    }
  }, [revealManager]);

  const joinViewer = useCallback(async (targetParticipantId: string) => {
    if (!revealManager) {
      throw new Error('RevealManager not initialized');
    }
    
    try {
      await revealManager.joinViewer(targetParticipantId);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join as viewer';
      setError(errorMessage);
      throw err;
    }
  }, [revealManager]);

  const leaveViewer = useCallback(async (targetParticipantId: string) => {
    if (!revealManager) {
      throw new Error('RevealManager not initialized');
    }
    
    try {
      await revealManager.leaveViewer(targetParticipantId);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave viewer';
      setError(errorMessage);
      throw err;
    }
  }, [revealManager]);

  // Wrapped getters
  const isRevealed = useCallback((revealType?: 'top8' | 'top3') => {
    return revealManager?.isRevealed(revealType) ?? false;
  }, [revealManager]);

  const getRevealState = useCallback((participantId: string) => {
    return revealManager?.getRevealState(participantId);
  }, [revealManager]);

  const getRevealedParticipants = useCallback(() => {
    return revealManager?.getRevealedParticipants() ?? [];
  }, [revealManager]);

  const getViewerCount = useCallback((participantId: string) => {
    return revealManager?.getViewerCount(participantId) ?? 0;
  }, [revealManager]);

  const getViewers = useCallback((participantId: string) => {
    return revealManager?.getViewers(participantId) ?? [];
  }, [revealManager]);

  return {
    revealManager,
    isRevealed,
    revealSelection,
    unrevealSelection,
    updateArrangement,
    joinViewer,
    leaveViewer,
    getRevealState,
    getRevealedParticipants,
    getViewerCount,
    getViewers,
    isReady,
    error
  };
}