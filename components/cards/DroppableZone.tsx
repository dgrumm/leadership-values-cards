'use client';

import { useDroppable } from '@dnd-kit/core';
import { DropZone } from './DropZone';
import { Card } from '@/lib/types/card';

interface DroppableZoneProps {
  id: string;
  title: string;
  subtitle?: string;
  cards: Card[];
  onCardClick?: (cardId: string) => void;
  onTitleClick?: () => void;
  className?: string;
  'data-pile'?: string;
}

export function DroppableZone({ 
  id,
  title,
  subtitle,
  cards,
  onCardClick,
  onTitleClick,
  className,
  'data-pile': dataPile
}: DroppableZoneProps) {
  // Map pile IDs to pile types for drag/drop
  const getPileType = (pileId: string, dataPile?: string) => {
    if (dataPile) return dataPile;
    if (pileId === 'more-important') return 'more';
    if (pileId === 'less-important') return 'less';
    if (pileId === 'top8-pile') return 'top8';
    return 'less'; // default
  };

  const { isOver, setNodeRef } = useDroppable({
    id,
    data: {
      type: 'pile',
      pile: getPileType(id, dataPile),
    },
  });

  return (
    <div ref={setNodeRef} className={className}>
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
}