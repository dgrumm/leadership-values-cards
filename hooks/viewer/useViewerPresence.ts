import { useState, useEffect, useCallback } from 'react';
import { useEventDrivenSession } from '@/contexts/EventDrivenSessionContext';
import { getViewerService } from '@/lib/viewer/viewer-service';
import type { ViewerData } from '@/types/viewer';

interface UseViewerPresenceReturn {
  viewers: Map<string, ViewerData>;
  isJoined: boolean;
  joinViewer: () => Promise<void>;
  leaveViewer: () => Promise<void>;
  error: string | null;
}

export function useViewerPresence(sessionCode: string, targetParticipantId: string): UseViewerPresenceReturn {
  const [viewers, setViewers] = useState<Map<string, ViewerData>>(new Map());
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentUser } = useEventDrivenSession();
  const viewerService = getViewerService();

  // Initialize viewer service for session
  useEffect(() => {
    const initializeService = async () => {
      if (!currentUser) return;

      try {
        await viewerService.initializeForSession(
          sessionCode,
          currentUser.id,
          currentUser.name,
          currentUser.emoji,
          currentUser.color
        );
      } catch (err) {
        console.error('Failed to initialize viewer service:', err);
        setError('Failed to initialize viewer presence');
      }
    };

    initializeService();
  }, [sessionCode, currentUser, viewerService]);

  // Subscribe to viewer presence for the target participant
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = viewerService.subscribeToViewerPresence(
      targetParticipantId,
      (newViewers) => {
        setViewers(newViewers);
      }
    );

    return unsubscribe;
  }, [targetParticipantId, currentUser, viewerService]);

  const joinViewer = useCallback(async () => {
    if (!currentUser) {
      setError('User not available');
      return;
    }

    try {
      setError(null);
      await viewerService.joinViewerSession(targetParticipantId);
      setIsJoined(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join viewer session';
      setError(errorMessage);
      console.error('Failed to join viewer session:', err);
    }
  }, [targetParticipantId, currentUser, viewerService]);

  const leaveViewer = useCallback(async () => {
    if (!isJoined) return;

    try {
      setError(null);
      await viewerService.leaveViewerSession(targetParticipantId);
      setIsJoined(false);
    } catch (err) {
      console.error('Failed to leave viewer session:', err);
      // Don't set error for leaving - it's cleanup
    }
  }, [targetParticipantId, isJoined, viewerService]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isJoined) {
        leaveViewer().catch(console.error);
      }
    };
  }, [isJoined, leaveViewer]);

  return {
    viewers,
    isJoined,
    joinViewer,
    leaveViewer,
    error
  };
}