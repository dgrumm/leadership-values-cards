'use client';

import { ViewerHeader } from './ViewerHeader';
import { ViewerArrangement } from './ViewerArrangement';
import { useViewerSession } from '@/contexts/ViewerSessionContext';

export function ViewerMode() {
  // Get viewer session state and methods
  const {
    targetParticipantId,
    isConnected,
    connectionError,
    arrangement,
    isArrangementLoading,
    arrangementError,
    otherViewers,
    exitViewer,
    refreshArrangement
  } = useViewerSession();

  // Handle connection errors
  if (connectionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Connection Error
          </h1>
          <p className="text-gray-600 mb-6">
            {connectionError}
          </p>
          <button
            onClick={exitViewer}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            ← Back to Participants
          </button>
        </div>
      </div>
    );
  }

  // Loading state - waiting for connection or arrangement
  if (!isConnected || isArrangementLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">
            {!isConnected ? 'Connecting to session...' : 'Loading arrangement...'}
          </p>
        </div>
      </div>
    );
  }

  // Arrangement error state
  if (arrangementError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Arrangement Error
          </h1>
          <p className="text-gray-600 mb-6">
            {arrangementError}
          </p>
          <div className="space-x-3">
            <button
              onClick={refreshArrangement}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={exitViewer}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              ← Back to Participants
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No arrangement available (not revealed or empty)
  if (!arrangement) {
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
            This participant hasn&apos;t revealed their selection yet, or their arrangement is empty.
          </p>
          <button
            onClick={exitViewer}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            ← Back to Participants
          </button>
        </div>
      </div>
    );
  }

  // Success! We have an arrangement to display
  const participant = {
    participantId: targetParticipantId,
    name: arrangement.participantName,
    status: arrangement.revealType === 'top8' ? 'revealed-8' : 'revealed-3'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ViewerHeader
        participant={participant}
        arrangement={arrangement}
        viewers={otherViewers}
        onBack={exitViewer}
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