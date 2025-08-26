'use client';

import { useDroppable } from '@dnd-kit/core';
import { DropZone } from './DropZone';
import { Card } from '@/lib/types/card';
import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface DroppableZoneProps {
  id: string;
  title: string;
  subtitle?: string | ReactNode;
  cards: Card[];
  onCardClick?: (cardId: string) => void;
  onTitleClick?: () => void;
  className?: string;
  'data-pile'?: string;
  'data-testid'?: string;
  maxCards?: number;
  // Accessibility props
  tabIndex?: number;
  role?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export const DroppableZone = forwardRef<HTMLDivElement, DroppableZoneProps>(function DroppableZone({ 
  id,
  title,
  subtitle,
  cards,
  onCardClick,
  onTitleClick,
  className,
  'data-pile': dataPile,
  'data-testid': dataTestId,
  maxCards,
  tabIndex,
  role,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby
}, ref) {
  // Map pile IDs to pile types for drag/drop
  const getPileType = (pileId: string, dataPile?: string) => {
    if (dataPile) return dataPile;
    if (pileId === 'more-important') return 'more';
    if (pileId === 'less-important') return 'less';
    if (pileId === 'top8-pile') return 'top8';
    return 'less'; // default
  };

  const { isOver, setNodeRef, active } = useDroppable({
    id,
    data: {
      type: 'pile',
      pile: getPileType(id, dataPile),
    },
  });

  // Determine drop zone state
  const isValidDrop = isOver && active?.data.current?.type === 'card';
  const isPileFull = maxCards && cards.length >= maxCards;
  const isInvalidDrop = isOver && isPileFull;
  
  // Get highlight class based on state
  const getHighlightClass = () => {
    if (isInvalidDrop) return 'pile-highlight-invalid';
    if (isValidDrop && !isPileFull) return 'pile-highlight-valid';
    if (isOver) return 'pile-highlight';
    return '';
  };

  return (
    <div 
      ref={(node) => {
        setNodeRef(node);
        if (ref) {
          if (typeof ref === 'function') {
            ref(node);
          } else {
            ref.current = node;
          }
        }
      }}
      className={cn(className, getHighlightClass())}
      data-testid={dataTestId}
      tabIndex={tabIndex}
      role={role}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
    >
      <DropZone
        title={title}
        subtitle={subtitle}
        cards={cards}
        onCardClick={onCardClick}
        onTitleClick={onTitleClick}
        isHovered={isOver}
        pile={getPileType(id, dataPile) as 'more' | 'less'}
      />
    </div>
  );
});