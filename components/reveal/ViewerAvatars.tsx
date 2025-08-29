'use client';

import React from 'react';
import type { ParticipantDisplayData } from '@/lib/types/participant-display';

export interface ViewerAvatarsProps {
  viewers: ParticipantDisplayData[];
  maxVisible?: number;
  className?: string;
}

export function ViewerAvatars({ 
  viewers, 
  maxVisible = 5,
  className 
}: ViewerAvatarsProps) {
  if (viewers.length === 0) {
    return null;
  }

  const visibleViewers = viewers.slice(0, maxVisible);
  const overflowCount = Math.max(0, viewers.length - maxVisible);

  return (
    <div className={`viewer-avatars flex items-center ${className || ''}`}>
      <div className="flex -space-x-2">
        {visibleViewers.map((viewer, index) => (
          <div
            key={viewer.participantId}
            className="viewer-avatar relative w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-sm shadow-sm hover:z-10 hover:scale-110 transition-transform"
            style={{ 
              backgroundColor: viewer.color,
              zIndex: visibleViewers.length - index
            }}
            title={`${viewer.name} is viewing`}
          >
            {viewer.emoji}
          </div>
        ))}
        
        {overflowCount > 0 && (
          <div 
            className="viewer-overflow w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600 shadow-sm"
            title={`+${overflowCount} more viewers`}
          >
            +{overflowCount}
          </div>
        )}
      </div>
      
      {viewers.length === 1 && (
        <span className="ml-3 text-sm text-gray-600">
          {viewers[0].name} is viewing
        </span>
      )}
      
      {viewers.length > 1 && (
        <span className="ml-3 text-sm text-gray-600">
          {viewers.length} viewers
        </span>
      )}
    </div>
  );
}