'use client';

import { LeaveSessionButton } from './LeaveSessionButton';
import { ParticipantsButton } from './ParticipantsButton';
import { StepCounter } from './StepCounter';
import { SettingsButton } from './SettingsButton';

export function SessionHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left side - Navigation */}
        <div className="flex items-center space-x-3">
          <LeaveSessionButton />
          <ParticipantsButton />
        </div>

        {/* Right side - Status and Settings */}
        <div className="flex items-center space-x-3">
          <StepCounter />
          <SettingsButton />
        </div>
      </div>
    </header>
  );
}