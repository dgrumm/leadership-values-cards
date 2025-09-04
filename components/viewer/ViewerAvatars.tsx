'use client';

import { cn } from '@/lib/utils/cn';
import type { ViewerData } from '@/types/viewer';

interface ViewerAvatarsProps {
  viewers: ViewerData[];
  className?: string;
}

export function ViewerAvatars({ viewers, className }: ViewerAvatarsProps) {
  // Limit to 5 visible avatars as per spec
  const visibleViewers = viewers.slice(0, 5);
  const overflowCount = Math.max(0, viewers.length - 5);

  if (viewers.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center', className)}>
      <div className="flex items-center space-x-1">
        {/* Viewer avatars */}
        {visibleViewers.map((viewer, index) => (
          <div
            key={viewer.participantId}
            className="relative"
            title={`${viewer.name} is viewing`}
          >
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                'border-2 border-white shadow-sm',
                viewer.isActive ? 'ring-2 ring-green-400' : ''
              )}
              style={{ 
                backgroundColor: `${viewer.color}20`, 
                color: viewer.color,
                zIndex: 50 - index // Stack avatars with proper layering
              }}
            >
              {viewer.emoji}
            </div>
            
            {/* Active indicator */}
            {viewer.isActive && (
              <div 
                className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-white animate-pulse"
                aria-label="Active viewer"
              />
            )}
          </div>
        ))}

        {/* Overflow indicator */}
        {overflowCount > 0 && (
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium',
              'bg-gray-100 text-gray-600 border-2 border-white shadow-sm'
            )}
            title={`+${overflowCount} other${overflowCount === 1 ? '' : 's'} viewing`}
          >
            +{overflowCount}
          </div>
        )}
      </div>

      {/* Viewer count text */}
      <span className="ml-3 text-sm text-gray-500">
        {viewers.length} viewer{viewers.length === 1 ? '' : 's'}
      </span>
    </div>
  );
}