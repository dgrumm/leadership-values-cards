'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';

export interface ParticipantCounterProps {
  count: number;
  includeCurrentUser?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const ParticipantCounter: React.FC<ParticipantCounterProps> = ({
  count,
  includeCurrentUser = false,
  className,
  size = 'md'
}) => {
  // Adjust count based on whether to include current user
  const displayCount = includeCurrentUser ? count : count;
  const label = displayCount === 1 ? 'Participant' : 'Participants';

  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-1.5',
    lg: 'text-lg px-4 py-2'
  };

  if (displayCount === 0) {
    return (
      <div 
        className={cn(
          'inline-flex items-center gap-1.5 text-gray-500',
          sizeClasses[size],
          className
        )}
      >
        <span className="text-gray-400" aria-hidden="true">👥</span>
        <span className="font-medium">No participants</span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'inline-flex items-center gap-1.5',
        'bg-blue-50 text-blue-700 rounded-full border border-blue-200',
        sizeClasses[size],
        className
      )}
      aria-live="polite"
      role="status"
    >
      <span className="text-blue-600" aria-hidden="true">👥</span>
      <span className="font-medium">
        <span className="text-lg font-bold">{displayCount}</span>
        <span className="ml-1">{label}</span>
      </span>
    </div>
  );
};

ParticipantCounter.displayName = 'ParticipantCounter';

export { ParticipantCounter };