'use client';

import { LeaveSessionButton } from './LeaveSessionButton';
import { ParticipantsButton } from './ParticipantsButton';
import { StepCounter } from './StepCounter';
import { SettingsButton } from './SettingsButton';
import { RevealButton } from './RevealButton';

interface SessionHeaderProps {
  sessionCode: string;
  participantId: string;
  participantName: string;
  currentStep: number;
  totalSteps: number;
  participantCount?: number;
  onStepClick?: () => void;
  isRevealed?: boolean;
  showRevealButton?: boolean;
  stepComplete?: boolean;  // NEW: Only show reveal when step is complete
  onParticipantsClick?: () => void;
  onRevealSuccess?: () => void;
  onRevealError?: (error: string) => void;
}

export function SessionHeader({ 
  sessionCode,
  participantId,
  currentStep, 
  totalSteps, 
  participantCount,
  onStepClick,
  isRevealed,
  showRevealButton,
  stepComplete,
  onParticipantsClick,
  onRevealSuccess,
  onRevealError
}: SessionHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Navigation */}
        <div className="flex items-center space-x-3">
          <LeaveSessionButton />
          <ParticipantsButton 
            participantCount={participantCount}
            onClick={onParticipantsClick}
          />
          {showRevealButton && stepComplete && (
            <RevealButton 
              sessionCode={sessionCode}
              participantId={participantId}
              revealType={currentStep === 2 ? 'top8' : 'top3'}
              isRevealed={isRevealed}
              onRevealSuccess={onRevealSuccess}
              onRevealError={onRevealError}
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