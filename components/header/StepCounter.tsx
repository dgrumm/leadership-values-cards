'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function StepCounter() {
  const [currentStep, setCurrentStep] = useState(1); // TODO: Get from session/game state
  const [totalSteps] = useState(3);

  const handleShowStepInfo = () => {
    // TODO: Show step information modal
    alert('Step information modal will be implemented in next specs!');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleShowStepInfo}
      className="text-gray-600 hover:text-gray-800 flex items-center space-x-1"
    >
      <span>Step {currentStep} of {totalSteps}</span>
      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </Button>
  );
}