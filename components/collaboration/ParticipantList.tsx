'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import { ParticipantCard } from './ParticipantCard';
import type { PresenceData } from '@/lib/presence/types';

export interface ParticipantListProps {
  participants: Map<string, PresenceData>;
  currentUserId: string;
  onViewReveal?: (participantId: string, revealType: 'revealed-8' | 'revealed-3') => void;
  className?: string;
}

const ParticipantList: React.FC<ParticipantListProps> = ({
  participants,
  currentUserId,
  onViewReveal,
  className
}) => {
  // Convert to array and exclude current user for display
  const otherParticipants = React.useMemo(() => {
    const filtered: PresenceData[] = [];
    
    participants.forEach((participant) => {
      if (participant.participantId !== currentUserId) {
        filtered.push(participant);
      }
    });
    
    // Sort by name for consistent display
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [participants, currentUserId]);

  // Also keep all participants for internal logic that needs it
  const allParticipants = React.useMemo(() => {
    const filtered: PresenceData[] = [];
    
    participants.forEach((participant) => {
      filtered.push(participant);
    });
    
    // Sort by name for consistent display, but put current user first
    return filtered.sort((a, b) => {
      if (a.participantId === currentUserId) return -1;
      if (b.participantId === currentUserId) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [participants, currentUserId]);

  const participantCount = otherParticipants.length;

  if (participantCount === 0) {
    return (
      <div 
        className={cn(
          'flex flex-col items-center justify-center p-8 text-center',
          'bg-gray-50 rounded-lg border border-gray-200',
          className
        )}
        role="region"
        aria-label="Participant list"
      >
        <div className="text-gray-400 text-4xl mb-4" aria-hidden="true">
          👥
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No other participants yet
        </h3>
        <p className="text-sm text-gray-600">
          Share your session code with others to collaborate!
        </p>
      </div>
    );
  }

  return (
    <div 
      className={cn('space-y-4', className)}
      role="region"
      aria-label="Participant list"
    >
      {/* Header with participant count */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          <span className="mr-2" aria-hidden="true">👥</span>
          <span 
            aria-live="polite"
            aria-label={`${participantCount} other participant${participantCount !== 1 ? 's' : ''}`}
          >
            {participantCount} Participant{participantCount !== 1 ? 's' : ''}
          </span>
        </h2>
        
        {/* Optional: Add filter/sort controls here */}
      </div>

      {/* Participant cards grid */}
      <div 
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
          // Handle different grid sizes based on participant count
          participantCount === 1 && 'md:grid-cols-1 lg:grid-cols-1 max-w-md',
          participantCount === 2 && 'lg:grid-cols-2'
        )}
      >
        {otherParticipants.map((participant) => (
          <ParticipantCard
            key={participant.participantId}
            participant={participant}
            currentUserId={currentUserId}
            onViewReveal={onViewReveal}
            className="h-full" // Ensure consistent card heights
          />
        ))}
      </div>

      {/* Optional: Statistics or summary */}
      {participantCount > 3 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {otherParticipants.filter(p => p.status === 'sorting').length}
              </div>
              <div className="text-gray-600">Sorting</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {otherParticipants.filter(p => p.status === 'revealed-8').length}
              </div>
              <div className="text-gray-600">Revealed Top 8</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {otherParticipants.filter(p => p.status === 'revealed-3').length}
              </div>
              <div className="text-gray-600">Revealed Top 3</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {otherParticipants.filter(p => p.status === 'completed').length}
              </div>
              <div className="text-gray-600">Completed</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ParticipantList.displayName = 'ParticipantList';

export { ParticipantList };