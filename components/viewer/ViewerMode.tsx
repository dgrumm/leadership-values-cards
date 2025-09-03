'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ViewerHeader } from './ViewerHeader';
import { ViewerArrangement } from './ViewerArrangement';
import { useViewerMode } from '@/hooks/viewer/useViewerMode';
import { useViewerPresence } from '@/hooks/viewer/useViewerPresence';
import { useEventDrivenSession } from '@/contexts/EventDrivenSessionContext';
import { DEVELOPMENT_DECK } from '@/lib/generated/card-decks';
import type { ViewerModeProps } from '@/types/viewer';

export function ViewerMode({ sessionCode, participantId }: ViewerModeProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current user context for navigation
  const { currentUser } = useEventDrivenSession();

  // For now, create a simplified viewer that shows the target participant info
  // The real-time sync will be added once the session is fully initialized
  const { participantsForDisplay } = useEventDrivenSession();
  const participant = participantsForDisplay.get(participantId) || null;
  const isValidTarget = participant !== null && participant.participantId !== currentUser?.id;
  const isRevealed = participant ? 
    (participant.status === 'revealed-8' || participant.status === 'revealed-3') : false;

  // Simple loading control - no complex async initialization for now
  useEffect(() => {
    // Simple delay to allow context to initialize
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleBack = () => {
    // Navigate back to canvas with proper session parameters
    if (currentUser) {
      const params = new URLSearchParams({
        session: sessionCode,
        name: currentUser.name,
        step: '2' // Default to step 2 where reveals happen
      });
      router.push(`/canvas?${params.toString()}`);
    } else {
      // Fallback navigation
      router.push('/');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading arrangement...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !isValidTarget) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Participant not found'}
          </h1>
          <p className="text-gray-600 mb-6">
            {error ? 'There was an error loading the arrangement.' : 'This participant doesn\'t exist or hasn\'t revealed their selection yet.'}
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            ← Back to Participants
          </button>
        </div>
      </div>
    );
  }

  // Not revealed state
  if (!isRevealed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            No arrangement to view
          </h1>
          <p className="text-gray-600 mb-6">
            {participant?.name} hasn&apos;t revealed their selection yet.
          </p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            ← Back to Participants
          </button>
        </div>
      </div>
    );
  }

  // Check for injected revealed state (for testing) or create realistic arrangement
  const getArrangementData = () => {
    // First check if there's injected test state
    if (typeof window !== 'undefined') {
      const injectedState = sessionStorage.getItem(`revealed-${participant!.name}`);
      if (injectedState) {
        try {
          const parsedState = JSON.parse(injectedState);
          console.log(`🧪 [ViewerMode] Using injected revealed state for ${participant!.name}:`, parsedState);
          return parsedState;
        } catch (err) {
          console.warn('Failed to parse injected state:', err);
        }
      }
    }

    // Fallback: Create arrangement with real DEVELOPMENT_DECK cards
    const revealType = participant!.status === 'revealed-8' ? 'top8' : 'top3';
    const cardCount = revealType === 'top8' ? 8 : 3;
    
    return {
      participantId: participant!.participantId,
      participantName: participant!.name,
      revealType,
      cardPositions: DEVELOPMENT_DECK.slice(0, cardCount).map((card, index) => ({
        cardId: card.value_name.toLowerCase().replace(/\s+/g, '_'),
        x: 100 + (index % 4) * 200,
        y: 100 + Math.floor(index / 4) * 150,
        pile: revealType
      })),
      lastUpdated: Date.now()
    };
  };

  const arrangement = getArrangementData();

  return (
    <div className="min-h-screen bg-gray-50">
      <ViewerHeader
        participant={participant!}
        arrangement={arrangement}
        viewers={[]} // Empty for now
        onBack={handleBack}
      />
      
      <main className="container mx-auto px-4 py-6">
        <ViewerArrangement
          arrangement={arrangement}
          className="mx-auto"
        />
      </main>
    </div>
  );
}