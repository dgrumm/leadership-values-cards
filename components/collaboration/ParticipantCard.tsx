'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { ParticipantDisplayData } from '@/lib/types/participant-display';

export interface ParticipantCardProps {
  participant: ParticipantDisplayData;
  onViewReveal?: (participantId: string, revealType: 'top8' | 'top3') => void;
  currentUserId?: string; // DEPRECATED: Use participant.isCurrentUser instead
  className?: string;
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({
  participant,
  onViewReveal,
  currentUserId,
  className
}) => {
  const { 
    participantId, 
    name, 
    emoji, 
    color, 
    currentStep, // NOW AUTHORITATIVE: Always from session data (fixes screenshot inconsistency)
    status,
    lastActive,
    isCurrentUser, // NEW: Built into ParticipantDisplayData
    canViewTop8,
    canViewTop3,
    hasAnyReveals
  } = participant;
  
  // Backward compatibility (remove after migration complete)
  const isCurrentUserComputed = currentUserId ? (participantId === currentUserId) : isCurrentUser;
  
  // Determine activity status based on lastActive timestamp
  const getActivityStatus = () => {
    const now = Date.now();
    const timeSinceActive = now - lastActive;
    
    if (timeSinceActive < 5000) { // 5 seconds
      return 'active';
    } else if (timeSinceActive < 300000) { // 5 minutes
      return 'idle';
    } else {
      return 'inactive';
    }
  };

  const activityStatus = getActivityStatus();

  const handleViewTop8Click = () => {
    if (canViewTop8 && onViewReveal) {
      onViewReveal(participantId, 'top8');
    }
  };

  const handleViewTop3Click = () => {
    if (canViewTop3 && onViewReveal) {
      onViewReveal(participantId, 'top3');
    }
  };

  return (
    <div
      className={cn(
        'relative p-4 bg-white rounded-lg border border-gray-200 shadow-sm',
        'transition-all duration-200 hover:shadow-md hover:border-gray-300',
        className
      )}
    >
      {/* Activity indicator */}
      <div 
        className={cn(
          'absolute top-2 right-2 w-2 h-2 rounded-full',
          activityStatus === 'active' && 'bg-green-400 animate-pulse',
          activityStatus === 'idle' && 'bg-yellow-400',
          activityStatus === 'inactive' && 'bg-gray-300'
        )}
        title={
          activityStatus === 'active' ? 'Active now' :
          activityStatus === 'idle' ? 'Recently active' :
          'Inactive'
        }
        aria-label={`${name} is ${activityStatus}`}
      />

      {/* Participant identity */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium"
          style={{ backgroundColor: `${color}20`, color: color }}
          aria-label={`${name}'s avatar`}
        >
          {emoji}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 
            className="text-sm font-medium text-gray-900 truncate"
            title={isCurrentUserComputed ? `${name} (You)` : name}
          >
            {name} {isCurrentUserComputed && <span className="text-blue-600 font-semibold">(You)</span>}
          </h3>
          <p className="text-xs text-gray-500">
            Step {currentStep} of 3
          </p>
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-3">
        <StatusBadge 
          status={status} 
          currentStep={currentStep}
        />
      </div>

      {/* View reveal buttons */}
      {hasAnyReveals && (
        <div className="space-y-2">
          {canViewTop8 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewTop8Click}
              className="w-full text-xs"
              aria-label={`View ${name}'s Top 8 values`}
            >
              <span className="mr-1.5" aria-hidden="true">👁️</span>
              See {name}'s Top 8
            </Button>
          )}
          
          {canViewTop3 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewTop3Click}
              className="w-full text-xs"
              aria-label={`View ${name}'s Top 3 values`}
            >
              <span className="mr-1.5" aria-hidden="true">👁️</span>
              See {name}'s Top 3
            </Button>
          )}
        </div>
      )}

      {/* Status messages */}
      {!hasAnyReveals && status === 'sorting' && (
        <div className="text-xs text-gray-500 text-center py-2">
          Still sorting cards...
        </div>
      )}

      {status === 'completed' && (
        <div className="text-xs text-green-600 text-center py-2 font-medium">
          Exercise completed! 🎉
        </div>
      )}
    </div>
  );
};

ParticipantCard.displayName = 'ParticipantCard';

export { ParticipantCard };