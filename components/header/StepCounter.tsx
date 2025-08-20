'use client';

import { Button } from '@/components/ui/Button';

interface StepCounterProps {
  currentStep: number;
  totalSteps: number;
  onClick?: () => void;
}

export function StepCounter({ currentStep, totalSteps, onClick }: StepCounterProps) {
  const handleShowStepInfo = () => {
    onClick?.();
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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </Button>
  );
}