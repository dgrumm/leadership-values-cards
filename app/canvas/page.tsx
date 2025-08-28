  'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Step1Page } from '@/components/canvas/Step1Page';
import { Step2Page } from '@/components/canvas/Step2Page';
import { Step3Page } from '@/components/canvas/Step3Page';
import { useStep1Store } from '@/state/local/step1-store';
import { useStep2Store } from '@/state/local/step2-store';
import { useStep3Store } from '@/state/local/step3-store';

export default function CanvasPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [sessionData, setSessionData] = useState<{
    sessionCode: string;
    participantName: string;
  } | null>(null);
  
  const { moreImportantPile, lessImportantPile } = useStep1Store();
  const { top8Pile, lessImportantPile: step2LessImportant, discardedPile: step2Discarded } = useStep2Store();
  
  // Expose stores globally for E2E testing
  useEffect(() => {
    if (typeof window !== 'undefined' && (process.env.NODE_ENV === 'development' || process.env.PLAYWRIGHT_TEST === 'true')) {
      // Import and expose test utilities
      import('@/lib/test-utils/browser-globals').then(() => {
        const testWindow = window as typeof window & {
          useStep1Store: typeof useStep1Store;
          useStep2Store: typeof useStep2Store;
          useStep3Store: typeof useStep3Store;
        };
        testWindow.useStep1Store = useStep1Store;
        testWindow.useStep2Store = useStep2Store;
        testWindow.useStep3Store = useStep3Store;
        console.log('🧪 Test utilities exposed for E2E testing');
      });
    }
  }, []);

  useEffect(() => {
    const sessionCode = searchParams.get('session');
    const participantName = searchParams.get('name');
    const step = searchParams.get('step');

    if (!sessionCode || !participantName) {
      // Redirect to login if missing session data
      router.replace('/');
      return;
    }

    setSessionData({
      sessionCode,
      participantName: decodeURIComponent(participantName)
    });
    
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

  const handleStepNavigation = (step: 1 | 2 | 3) => {
    setCurrentStep(step);
    // Update URL to reflect the current step
    const params = new URLSearchParams(searchParams);
    params.set('step', step.toString());
    router.replace(`/canvas?${params.toString()}`);
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

  // Render appropriate step component
  if (currentStep === 1) {
    return (
      <Step1Page
        participantName={sessionData.participantName}
        sessionCode={sessionData.sessionCode}
        onStepComplete={() => handleStepNavigation(2)}
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
          onStepComplete={() => handleStepNavigation(2)}
        />
      );
    }
    
    return (
      <Step2Page
        participantName={sessionData.participantName}
        sessionCode={sessionData.sessionCode}
        step1Data={{
          moreImportantPile,
          lessImportantPile
        }}
        onStepComplete={() => handleStepNavigation(3)}
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
          step1Data={{
            moreImportantPile,
            lessImportantPile
          }}
          onStepComplete={() => handleStepNavigation(3)}
        />
      );
    }
    
    return (
      <Step3Page
        participantName={sessionData.participantName}
        sessionCode={sessionData.sessionCode}
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
          onClick={() => handleStepNavigation(1)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Back to Step 1
        </button>
      </div>
    </div>
  );
}