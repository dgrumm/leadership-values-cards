'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StaticViewerMode } from '@/components/viewer/StaticViewerMode';
import { EventDrivenSessionProvider } from '@/contexts/EventDrivenSessionContext';

interface ViewerPageProps {
  params: Promise<{
    sessionCode: string;
    participantId: string;
  }>;
}

export default function ViewerPage({ params }: ViewerPageProps) {
  const { sessionCode, participantId: targetParticipantId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionData, setSessionData] = useState<{
    participantId: string;
    participantName: string;
  } | null>(null);

  // ALL hooks must be called before any conditional returns
  useEffect(() => {
    // For viewer mode, we need the current user's session data
    // This should come from URL params or localStorage from the main session
    const currentParticipantName = searchParams.get('viewerName');
    const currentParticipantId = searchParams.get('viewerId');

    if (!currentParticipantName || !currentParticipantId) {
      // If no viewer context, redirect back to main canvas
      // In practice, users should navigate here from ParticipantList with proper context
      console.warn('Missing viewer session context, redirecting to canvas');
      router.replace(`/canvas?session=${sessionCode}&name=Viewer&step=2`);
      return;
    }

    setSessionData({
      participantId: currentParticipantId,
      participantName: decodeURIComponent(currentParticipantName)
    });
    
    setIsLoading(false);
  }, [searchParams, router, sessionCode]);

  // Expose test utilities for development (same pattern as canvas page)
  useEffect(() => {
    if (typeof window !== 'undefined' && (process.env.NODE_ENV === 'development' || process.env.PLAYWRIGHT_TEST === 'true')) {
      import('@/lib/test-utils/browser-globals').then(() => {
        console.log('🧪 StateInjectionUtils available in browser console for viewer mode testing');
      });
    }
  }, []);

  // Now conditional returns are safe - all hooks have been called
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading viewer...</p>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return null; // Will redirect
  }

  return (
    <EventDrivenSessionProvider
      sessionCode={sessionCode}
      participantId={sessionData.participantId}
      participantName={sessionData.participantName}
    >
      <StaticViewerMode 
        sessionCode={sessionCode}
        targetParticipantId={targetParticipantId}
        viewerName={sessionData.participantName}
      />
    </EventDrivenSessionProvider>
  );
}