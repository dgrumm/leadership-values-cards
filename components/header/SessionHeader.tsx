'use client';

import { LeaveSessionButton } from './LeaveSessionButton';
import { ParticipantsButton } from './ParticipantsButton';
import { StepCounter } from './StepCounter';
import { SettingsButton } from './SettingsButton';
import { RevealButton } from './RevealButton';

interface SessionHeaderProps {
  sessionCode: string;
  participantName: string;
  currentStep: number;
  totalSteps: number;
  participantCount?: number;
  onStepClick?: () => void;
  onReveal?: () => void;
  isRevealed?: boolean;
  showRevealButton?: boolean;
}

export function SessionHeader({ 
  sessionCode, 
  participantName, 
  currentStep, 
  totalSteps, 
  participantCount,
  onStepClick,
  onReveal,
  isRevealed,
  showRevealButton
}: SessionHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Navigation */}
        <div className="flex items-center space-x-3">
          <LeaveSessionButton />
          <ParticipantsButton participantCount={participantCount} />
          {showRevealButton && (
            <RevealButton 
              onClick={onReveal}
              isRevealed={isRevealed}
            />
          )}
        </div>

        {/* Right side - Status and Settings */}
        <div className="flex items-center space-x-3">
          <StepCounter 
            currentStep={currentStep}
            totalSteps={totalSteps}
            onClick={onStepClick}
          />
          <SettingsButton />
        </div>
      </div>
    </header>
  );
}