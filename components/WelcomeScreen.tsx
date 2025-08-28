'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { DeckSpinAnimation } from '@/components/animations/DeckSpinAnimation';

interface WelcomeScreenProps {
  participantName: string;
  sessionCode: string;
}

export function WelcomeScreen({ participantName }: WelcomeScreenProps) {
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // Animation completes after 2 seconds
    const timer = setTimeout(() => {
      setAnimationComplete(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleStartStep1 = () => {
    // TODO: Navigate to Step 1 - Initial Sort
    // For now, just show placeholder
    alert('Step 1 - Initial Sort will be implemented in the next spec!');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Leadership Values
        </h1>
        <p className="text-xl text-gray-600">Cards Exercise</p>
      </div>

      <div className="mb-8">
        <DeckSpinAnimation
          participantName={participantName}
          onComplete={() => setAnimationComplete(true)}
        />
      </div>

      {animationComplete && (
        <div className="animate-fade-in">
          <Button
            onClick={handleStartStep1}
            size="lg"
            className="px-8 py-3 text-lg"
          >
            Step 1 ➜
          </Button>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}