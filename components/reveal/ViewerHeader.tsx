'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { ViewerAvatars } from './ViewerAvatars';
import type { ParticipantDisplayData } from '@/lib/types/participant-display';

export interface ViewerHeaderProps {
  participant: {
    name: string;
    emoji: string;
    color: string;
  };
  revealType: 'top8' | 'top3';
  onBack: () => void;
  viewers?: ParticipantDisplayData[];
  className?: string;
}

export function ViewerHeader({ 
  participant, 
  revealType, 
  onBack, 
  viewers = [],
  className 
}: ViewerHeaderProps) {
  const countText = revealType === 'top8' ? '8' : '3';
  
  return (
    <header className={`viewer-header bg-white border-b border-gray-200 px-6 py-4 ${className || ''}`}>
      <div className="flex items-center justify-between">
        {/* Back navigation */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Participants
        </Button>

        {/* Title */}
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: participant.color }}
          >
            {participant.emoji}
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            {participant.name}'s Top {countText} Leadership Values
          </h1>
        </div>

        {/* Viewer avatars */}
        <ViewerAvatars viewers={viewers} />
      </div>
    </header>
  );
}