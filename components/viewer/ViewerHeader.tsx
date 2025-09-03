'use client';

import { ViewerAvatars } from './ViewerAvatars';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import type { ParticipantDisplayData } from '@/lib/types/participant-display';
import type { ArrangementViewData, ViewerData } from '@/types/viewer';

interface ViewerHeaderProps {
  participant: ParticipantDisplayData;
  arrangement: ArrangementViewData;
  viewers: ViewerData[];
  onBack: () => void;
  className?: string;
}

export function ViewerHeader({ 
  participant, 
  arrangement, 
  viewers, 
  onBack, 
  className 
}: ViewerHeaderProps) {
  const revealTypeText = arrangement.revealType === 'top8' ? 'Top 8' : 'Top 3';
  
  return (
    <header className={cn(
      'bg-white border-b border-gray-200 shadow-sm',
      className
    )}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Back button */}
          <Button
            variant="ghost"
            onClick={onBack}
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
              {participant.name}&apos;s {revealTypeText} Leadership Values
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Last updated {new Date(arrangement.lastUpdated).toLocaleTimeString()}
            </p>
          </div>

          {/* Viewer avatars */}
          <ViewerAvatars viewers={viewers} />
        </div>
      </div>
    </header>
  );
}