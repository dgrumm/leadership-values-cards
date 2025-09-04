'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RevealSnapshot } from '@/lib/reveals/SimpleRevealManager';
import { useEventDrivenSession } from '@/contexts/EventDrivenSessionContext';
import { getAblyService } from '@/lib/ably/ably-service';
import { Button } from '@/components/ui/Button';
import { StaticCardGrid } from '@/components/common/StaticCardGrid';
import { SnapshotExporter } from '@/utils/export/SnapshotExporter';
import { cn } from '@/lib/utils/cn';

interface StaticViewerModeProps {
  sessionCode: string;
  targetParticipantId: string;
  viewerName: string;
  className?: string;
}

export function StaticViewerMode({ 
  sessionCode, 
  targetParticipantId, 
  viewerName,
  className 
}: StaticViewerModeProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<RevealSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get Ably service directly for reading presence data (bypass SimpleRevealManager complexity)
  const { isConnected } = useEventDrivenSession();
  
  console.log('🔍 [StaticViewerMode] Connection state:', {
    isConnected,
    targetParticipantId
  });

  // Load snapshot on component mount
  useEffect(() => {
    let mounted = true;

    const loadSnapshot = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!isConnected) {
          console.log('⏳ [StaticViewerMode] Waiting for Ably connection...');
          return;
        }
        
        console.log('✅ [StaticViewerMode] Ably connected, reading presence data directly...');

        // Read reveal snapshot directly from Ably Presence (bypass SimpleRevealManager)
        const ablyService = getAblyService();
        const presenceChannel = ablyService.getChannel(sessionCode, 'presence');
        const members = await presenceChannel.presence.get();
        
        console.log('🔍 [StaticViewerMode] Presence members:', members.map(m => ({ 
          id: m.data?.participantId, 
          name: m.data?.name, 
          hasReveal: !!m.data?.revealSnapshot 
        })));
        
        const participant = members.find((m: any) => 
          m.data?.participantId === targetParticipantId
        );

        const data = participant?.data?.hasReveal ? participant.data.revealSnapshot : null;
        
        if (!mounted) return;

        if (!data) {
          setError('No reveal found for this participant');
        } else {
          console.log('✅ [StaticViewerMode] Found reveal snapshot:', data);
          setSnapshot(data);
        }
      } catch (err) {
        if (!mounted) return;
        
        const message = err instanceof Error ? err.message : 'Failed to load reveal';
        setError(message);
        console.error('Failed to load reveal snapshot:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSnapshot();

    return () => {
      mounted = false;
    };
  }, [isConnected, targetParticipantId, sessionCode]);

  // Export handlers
  const handleExportPDF = async () => {
    if (!snapshot) return;
    
    try {
      const exporter = new SnapshotExporter();
      await exporter.exportAsPDF(snapshot, false);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      // TODO: Show user-friendly error message
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Navigation handler
  const handleBack = () => {
    router.back();
  };

  // Loading state
  if (loading) {
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
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Arrangement Not Available
          </h1>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <Button onClick={handleBack} variant="primary">
            ← Back to Participants
          </Button>
        </div>
      </div>
    );
  }

  // No snapshot state
  if (!snapshot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            No Arrangement to View
          </h1>
          <p className="text-gray-600 mb-6">
            This participant hasn't revealed their selection yet.
          </p>
          <Button onClick={handleBack} variant="primary">
            ← Back to Participants
          </Button>
        </div>
      </div>
    );
  }

  // Main viewer display
  const revealTypeText = snapshot.type === 'top8' ? 'Top 8' : 'Top 3';

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm print:hidden">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Back button */}
            <Button
              variant="ghost"
              onClick={handleBack}
              className="text-gray-600 hover:text-gray-900"
              aria-label="Back to participants"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Participants
            </Button>

            {/* Title */}
            <div className="text-center flex-1 mx-8">
              <h1 className="text-xl font-semibold text-gray-900">
                {snapshot.participantName}'s {revealTypeText} Leadership Values
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Revealed {new Date(snapshot.revealedAt).toLocaleDateString()}
              </p>
            </div>

            {/* Export actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handleExportPDF}
                className="text-sm"
                aria-label="Export as PDF"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                className="text-sm"
                aria-label="Print arrangement"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="reveal-canvas container mx-auto px-4 py-8">
        <StaticCardGrid 
          cards={snapshot.cards}
          type={snapshot.type}
          readonly={true}
          printOptimized={true}
          className="w-full"
        />
      </main>
    </div>
  );
}