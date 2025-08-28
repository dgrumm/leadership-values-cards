'use client';

import * as React from 'react';
import { cn } from '@/lib/utils/cn';
import type { PresenceData } from '@/lib/presence/types';

export interface StatusBadgeProps {
  status: PresenceData['status'];
  currentStep: number;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  currentStep, 
  className 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'sorting':
        return {
          label: `Step ${currentStep}`,
          description: currentStep === 1 ? 'Sorting cards' : 
                       currentStep === 2 ? 'Selecting Top 8' : 
                       'Selecting Top 3',
          color: 'bg-blue-100 text-blue-700 border-blue-200',
          icon: '📝'
        };
      
      case 'revealed-8':
        return {
          label: 'Revealed Top 8',
          description: 'Shared their Top 8 values',
          color: 'bg-green-100 text-green-700 border-green-200',
          icon: '👁️'
        };
      
      case 'revealed-3':
        return {
          label: 'Revealed Top 3',
          description: 'Shared their Top 3 values',
          color: 'bg-purple-100 text-purple-700 border-purple-200',
          icon: '🎯'
        };
      
      case 'completed':
        return {
          label: 'Completed',
          description: 'Finished the exercise',
          color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          icon: '✅'
        };
      
      default:
        return {
          label: 'Unknown',
          description: 'Status unknown',
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: '❓'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div 
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        config.color,
        className
      )}
      title={config.description}
    >
      <span className="text-xs" aria-hidden="true">
        {config.icon}
      </span>
      <span>{config.label}</span>
    </div>
  );
};

StatusBadge.displayName = 'StatusBadge';

export { StatusBadge };