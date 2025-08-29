'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ViewerHeader } from './ViewerHeader';
import { RevealedCardsDisplay } from './RevealedCardsDisplay';
import { useViewerManager } from '@/hooks/reveal';
import type { ParticipantDisplayData } from '@/lib/types/participant-display';

export interface ViewerModeProps {
  sessionCode: string;
  viewerParticipantId: string;
  targetParticipantId: string;
  revealType: 'top8' | 'top3';
  onBack: () => void;
  viewers?: ParticipantDisplayData[];
  className?: string;
}

export function ViewerMode({
  sessionCode,
  viewerParticipantId,
  targetParticipantId,
  revealType,
  onBack,
  viewers = [],
  className
}: ViewerModeProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const {
    currentView,
    isViewing,
    isLoading,
    error,
    enterViewMode,
    exitViewMode,
    refreshCurrentView,
    clearError
  } = useViewerManager(sessionCode, viewerParticipantId);

  // Initialize viewer mode when component mounts
  useEffect(() => {
    if (!isInitialized) {
      setIsInitialized(true);
      enterViewMode(targetParticipantId, revealType);
    }

    // Cleanup on unmount
    return () => {
      if (isViewing) {
        exitViewMode();
      }
    };
  }, [isInitialized, targetParticipantId, revealType, enterViewMode, exitViewMode, isViewing]);

  // Handle back navigation
  const handleBack = () => {
    exitViewMode();
    onBack();
  };

  // Handle error dismissal
  const handleErrorDismiss = () => {
    clearError();
    if (!currentView) {
      handleBack();
    }
  };

  // Loading state
  if (isLoading && !currentView) {
    return (
      <div className={`viewer-mode bg-gray-50 min-h-screen ${className || ''}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium text-gray-600">Loading revealed selection...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !currentView) {
    return (
      <div className={`viewer-mode bg-gray-50 min-h-screen ${className || ''}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to View Selection</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleErrorDismiss}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No view data (should not happen if initialization worked)
  if (!currentView) {
    return (
      <div className={`viewer-mode bg-gray-50 min-h-screen ${className || ''}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-600 mb-4">No selection to view</p>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const participant = currentView.participant;
  const cards = currentView.cards;

  if (!participant || !cards) {
    return (
      <div className={`viewer-mode bg-gray-50 min-h-screen ${className || ''}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-600 mb-4">Selection data unavailable</p>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`viewer-mode bg-gray-50 min-h-screen ${className || ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ViewerHeader
        participant={{
          name: participant.name,
          emoji: participant.emoji,
          color: participant.color
        }}
        revealType={revealType}
        onBack={handleBack}
        viewers={viewers}
      />

      <main className="max-w-7xl mx-auto">
        <RevealedCardsDisplay
          cards={cards}
          revealType={revealType}
          participantName={participant.name}
          isReadOnly={true}
          className="py-8"
        />
      </main>

      {/* Error banner (if there's an error but we still have view data) */}
      {error && currentView && (
        <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-sm font-medium">Update Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="ml-2 text-red-400 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Refresh button (optional - for manual refresh) */}
      {currentView && (
        <button
          onClick={() => refreshCurrentView()}
          disabled={isLoading}
          className="fixed bottom-4 right-4 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow-lg hover:bg-gray-50 disabled:opacity-50 z-40"
          title="Refresh view"
        >
          <svg 
            className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}
    </motion.div>
  );
}