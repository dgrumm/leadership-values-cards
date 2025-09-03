import { useState, useEffect, useCallback } from 'react';
import { useEventDrivenSession } from '@/contexts/EventDrivenSessionContext';
import { getArrangementSync } from '@/lib/viewer/arrangement-sync';
import type { ArrangementViewData } from '@/types/viewer';
import type { ParticipantDisplayData } from '@/lib/types/participant-display';

interface UseViewerModeReturn {
  arrangement: ArrangementViewData | null;
  participant: ParticipantDisplayData | null;
  isValidTarget: boolean;
  isRevealed: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useViewerMode(sessionCode: string, participantId: string): UseViewerModeReturn {
  const [arrangement, setArrangement] = useState<ArrangementViewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { participantsForDisplay, currentUser } = useEventDrivenSession();
  const arrangementSync = getArrangementSync();

  // Get target participant data
  const participant = participantsForDisplay.get(participantId) || null;
  const isValidTarget = participant !== null;
  const isRevealed = participant ? 
    (participant.status === 'revealed-8' || participant.status === 'revealed-3') : false;

  // Check if trying to view own arrangement (should be prevented)
  const isSelfView = currentUser?.id === participantId;
  const isActuallyValidTarget = isValidTarget && !isSelfView && isRevealed;

  // Initialize arrangement sync only when we have a valid session
  useEffect(() => {
    // Don't initialize if we don't have current user context yet
    if (!currentUser) return;

    const initializeSync = async () => {
      try {
        await arrangementSync.initializeForSession(sessionCode);
      } catch (err) {
        console.error('Failed to initialize arrangement sync:', err);
        setError('Failed to initialize viewer mode');
      }
    };

    initializeSync();
  }, [sessionCode, arrangementSync, currentUser]);

  // Subscribe to arrangement updates for the target participant
  useEffect(() => {
    if (!isActuallyValidTarget) {
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);

    const unsubscribe = arrangementSync.subscribeToArrangementUpdates(
      participantId,
      (newArrangement) => {
        setArrangement(newArrangement);
        setIsLoading(false);
      }
    );

    // Try to get current arrangement state
    arrangementSync.getCurrentArrangement(participantId)
      .then((currentArrangement) => {
        if (currentArrangement) {
          setArrangement(currentArrangement);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('Failed to get current arrangement:', err);
        setIsLoading(false);
      });

    return unsubscribe;
  }, [participantId, isActuallyValidTarget, arrangementSync]);

  // Handle validation errors
  useEffect(() => {
    if (isSelfView) {
      setError('Cannot view your own arrangement');
    } else if (!isValidTarget) {
      setError('Participant not found');
    } else if (!isRevealed) {
      setError('Participant has not revealed their selection');
    } else {
      setError(null);
    }
  }, [isSelfView, isValidTarget, isRevealed]);

  return {
    arrangement,
    participant,
    isValidTarget: isValidTarget && !isSelfView, // Participant exists and not self
    isRevealed,
    isLoading,
    error
  };
}