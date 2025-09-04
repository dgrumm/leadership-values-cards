'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useEventDrivenSession } from '@/contexts/EventDrivenSessionContext';
import type { ParticipantDisplayData } from '@/lib/types/participant-display';

export interface ParticipantCardProps {
  participant: ParticipantDisplayData;
  sessionCode: string; // Added for ViewerSync integration
  onViewReveal?: (participantId: string, revealType: 'revealed-8' | 'revealed-3') => void;
  currentUserId?: string; // DEPRECATED: Use participant.isCurrentUser instead
  className?: string;
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({
  participant,
  sessionCode,
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
    isCurrentUser // NEW: Built into ParticipantDisplayData
  } = participant;
  
  // Backward compatibility (remove after migration complete)
  const isCurrentUserComputed = currentUserId ? (participantId === currentUserId) : isCurrentUser;
  
  // Get SimpleRevealManager from EventDrivenSession to check for reveals
  const { simpleRevealManager } = useEventDrivenSession();
  const [hasReveal, setHasReveal] = React.useState<{ hasReveal: boolean; type?: 'top8' | 'top3' } | null>(null);
  
  // Check if this participant has a reveal (using presence data)
  React.useEffect(() => {
    if (!simpleRevealManager) return;
    
    const checkReveal = async () => {
      try {
        console.log(`🔍 [ParticipantCard] Checking reveal for ${name} (${participantId})`);
        const reveal = await simpleRevealManager.getReveal(participantId);
        console.log(`🔍 [ParticipantCard] Reveal result for ${name}:`, reveal);
        if (reveal) {
          setHasReveal({ hasReveal: true, type: reveal.type });
          console.log(`✅ [ParticipantCard] ${name} has reveal: ${reveal.type}`);
        } else {
          setHasReveal({ hasReveal: false });
          console.log(`❌ [ParticipantCard] ${name} has no reveal`);
        }
      } catch (error) {
        console.error('Failed to check participant reveal:', error);
        setHasReveal({ hasReveal: false });
      }
    };
    
    checkReveal();
    
    // CRITICAL FIX: Also re-check when status changes (indicates presence update)
    // The status prop changes when presence data updates (e.g., "sorting" -> "revealed-8")
  }, [simpleRevealManager, participantId, status]);
  
  // Determine if this participant's reveal can be viewed
  const hasRevealedArrangement = hasReveal?.hasReveal ?? false;
  const canViewReveal = hasRevealedArrangement && !isCurrentUserComputed;
  
  console.log(`🎯 [ParticipantCard] View button logic for ${name}:`, {
    hasReveal: hasReveal,
    hasRevealedArrangement,
    isCurrentUserComputed,
    canViewReveal,
    status
  });
  
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

  const handleViewClick = () => {
    if (canViewReveal && onViewReveal && hasReveal?.type) {
      // Determine reveal type based on the reveal snapshot
      const revealType = hasReveal.type === 'top3' ? 'revealed-3' : 'revealed-8';
      onViewReveal(participantId, revealType);
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
          status={hasRevealedArrangement ? (hasReveal?.type === 'top3' ? 'revealed-3' : 'revealed-8') : status} 
          currentStep={currentStep}
        />
      </div>

      {/* View reveal button */}
      {canViewReveal && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewClick}
          className="w-full text-xs"
          data-testid="view-reveal-button"
          aria-label={`View ${name}'s ${hasReveal?.type === 'top3' ? 'Top 3' : 'Top 8'} values`}
        >
          <span className="mr-1.5" aria-hidden="true">👁️</span>
          See {hasReveal?.type === 'top3' ? 'Top 3' : 'Top 8'}
        </Button>
      )}

      {/* No reveal available message */}
      {!canViewReveal && status === 'sorting' && (
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