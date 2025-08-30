  'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Step1Page } from '@/components/canvas/Step1Page';
import { Step2Page } from '@/components/canvas/Step2Page';
import { Step3Page } from '@/components/canvas/Step3Page';
import { SessionStoreProvider } from '@/contexts/SessionStoreContext';
import { useSessionStep1Store, useSessionStep2Store } from '@/hooks/stores/useSessionStores';

// StepRouter component that uses session-scoped hooks (must be inside provider)
function StepRouter({ 
  currentStep, 
  sessionData, 
  onStepChange 
}: { 
  currentStep: 1 | 2 | 3; 
  sessionData: { sessionCode: string; participantName: string }; 
  onStepChange: (step: 1 | 2 | 3) => void;
}) {
  const { moreImportantPile, lessImportantPile } = useSessionStep1Store();
  const { top8Pile, lessImportantPile: step2LessImportant, discardedPile: step2Discarded } = useSessionStep2Store();
  
  // Expose session stores globally for E2E testing
  useEffect(() => {
    if (typeof window !== 'undefined' && (process.env.NODE_ENV === 'development' || process.env.PLAYWRIGHT_TEST === 'true')) {
      // Import and expose test utilities
      import('@/lib/test-utils/browser-globals').then(() => {
        const testWindow = window as typeof window & {
          useSessionStep1Store: typeof useSessionStep1Store;
          useSessionStep2Store: typeof useSessionStep2Store;
        };
        testWindow.useSessionStep1Store = useSessionStep1Store;
        testWindow.useSessionStep2Store = useSessionStep2Store;
        console.log('🧪 Session-scoped test utilities exposed for E2E testing');
      });
    }
  }, []);

  // Render appropriate step component
  if (currentStep === 1) {
    return (
      <Step1Page
        participantName={sessionData.participantName}
        sessionCode={sessionData.sessionCode}
        currentStep={currentStep}
        onStepComplete={() => onStepChange(2)}
      />
    );
  }

  if (currentStep === 2) {
    // If Step 1 data is empty, redirect back to Step 1 to complete it first
    if (moreImportantPile.length === 0 && lessImportantPile.length === 0) {
      return (
        <Step1Page
          participantName={sessionData.participantName}
          sessionCode={sessionData.sessionCode}
          onStepComplete={() => onStepChange(2)}
        />
      );
    }
    
    return (
      <Step2Page
        participantName={sessionData.participantName}
        sessionCode={sessionData.sessionCode}
        currentStep={currentStep}
        step1Data={{
          moreImportantPile,
          lessImportantPile
        }}
        onStepComplete={() => onStepChange(3)}
      />
    );
  }

  // Step 3 - Final selection of Top 3 values
  if (currentStep === 3) {
    // If Step 2 data is empty, redirect back to Step 2 to complete it first
    if (top8Pile.length === 0) {
      return (
        <Step2Page
          participantName={sessionData.participantName}
          sessionCode={sessionData.sessionCode}
          currentStep={currentStep}
          step1Data={{
            moreImportantPile,
            lessImportantPile
          }}
          onStepComplete={() => onStepChange(3)}
        />
      );
    }
    
    return (
      <Step3Page
        participantName={sessionData.participantName}
        sessionCode={sessionData.sessionCode}
        currentStep={currentStep}
        step2Data={{
          top8Pile,
          lessImportantPile: step2LessImportant,
          discardedPile: step2Discarded
        }}
        step1Data={{
          lessImportantPile
        }}
        onStepComplete={() => {
          console.log('Exercise completed!');
          // TODO: Navigate to results/review page
        }}
      />
    );
  }

  // Fallback - should never reach here
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Invalid Step</h1>
        <p className="text-gray-600">Please start from Step 1</p>
        <button 
          onClick={() => onStepChange(1)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Back to Step 1
        </button>
      </div>
    </div>
  );
}

export default function CanvasPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [sessionData, setSessionData] = useState<{
    sessionCode: string;
    participantName: string;
    participantId?: string; // Real participant ID from API
  } | null>(null);

  useEffect(() => {
    const sessionCode = searchParams.get('session');
    const participantName = searchParams.get('name');
    const step = searchParams.get('step');

    if (!sessionCode || !participantName) {
      // Redirect to login if missing session data
      router.replace('/');
      return;
    }

    // Fetch real participant ID from API
    const fetchParticipantId = async () => {
      try {
        const sessionResponse = await fetch(`/api/sessions/${sessionCode}`);
        if (sessionResponse.ok) {
          const sessionDataResponse = await sessionResponse.json();
          const participant = sessionDataResponse.session?.participants?.find(
            (p: any) => p.name === decodeURIComponent(participantName) && p.isActive
          );
          
          if (participant) {
            setSessionData({
              sessionCode,
              participantName: decodeURIComponent(participantName),
              participantId: participant.id
            });
          } else {
            console.warn(`⚠️ Participant ${participantName} not found in session ${sessionCode}`);
            setSessionData({
              sessionCode,
              participantName: decodeURIComponent(participantName)
            });
          }
        } else {
          console.warn(`⚠️ Failed to fetch session ${sessionCode} for participant ID lookup`);
          setSessionData({
            sessionCode,
            participantName: decodeURIComponent(participantName)
          });
        }
      } catch (error) {
        console.error('❌ Failed to fetch participant ID:', error);
        setSessionData({
          sessionCode,
          participantName: decodeURIComponent(participantName)
        });
      }
    };

    fetchParticipantId();
    
    // Set current step from URL or default to 1
    if (step === '2') {
      setCurrentStep(2);
    } else if (step === '3') {
      setCurrentStep(3);
    } else {
      setCurrentStep(1);
    }
    
    setIsLoading(false);
  }, [searchParams, router]);

  const handleStepNavigation = async (step: 1 | 2 | 3) => {
    try {
      // 1. Update local UI state immediately for responsiveness
      setCurrentStep(step);
      
      // 2. Update session participant data for observers
      if (sessionData) {
        // Get participant from session instead of constructing ID manually
        try {
          const sessionResponse = await fetch(`/api/sessions/${sessionData.sessionCode}`);
          if (sessionResponse.ok) {
            const sessionDataResponse = await sessionResponse.json();
            const participant = sessionDataResponse.session?.participants?.find(
              (p: any) => p.name === sessionData.participantName && p.isActive
            );
            
            if (participant) {
              // Call the backend API to update session participant step
              const response = await fetch(`/api/sessions/${sessionData.sessionCode}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  participantId: participant.id,
                  currentStep: step
                })
              });
        
              if (!response.ok) {
                console.warn(`⚠️ Failed to update participant step in session: ${response.status}`);
              } else {
                console.log(`✅ Updated participant step to ${step} in session ${sessionData.sessionCode}`);
              }
            } else {
              console.warn(`⚠️ Participant ${sessionData.participantName} not found in session`);
            }
          } else {
            console.warn(`⚠️ Failed to fetch session data for participant lookup`);
          }
        } catch (sessionError) {
          console.error('❌ Failed to get participant from session:', sessionError);
        }
      }
      
      // 3. Update URL to reflect the current step
      const params = new URLSearchParams(searchParams);
      params.set('step', step.toString());
      router.replace(`/canvas?${params.toString()}`);
    } catch (error) {
      console.error('❌ Failed to update step navigation:', error);
      // Continue with local update even if session update fails
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 w-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return null; // Will redirect to login
  }

  // Use real participant ID if available, fallback to manual construction
  const participantId = sessionData.participantId || `${sessionData.sessionCode}-${sessionData.participantName}`;
  
  return (
    <SessionStoreProvider 
      sessionCode={sessionData.sessionCode} 
      participantId={participantId}
      config={{
        enableDebugLogging: process.env.NODE_ENV === 'development',
        enableMemoryTracking: process.env.NODE_ENV === 'development'
      }}
    >
      <StepRouter 
        currentStep={currentStep}
        sessionData={sessionData}
        onStepChange={handleStepNavigation}
      />
    </SessionStoreProvider>
  );
}