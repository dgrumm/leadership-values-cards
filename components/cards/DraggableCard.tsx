'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card } from './Card';
import { Card as CardType } from '@/lib/types/card';

interface DraggableCardProps {
  card: CardType;
  isInStaging?: boolean;
  pile?: 'more' | 'less' | 'staging';
}

export function DraggableCard({ card, isInStaging = false, pile }: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: card.id,
    data: {
      card: {
        ...card,
        pile: pile || (isInStaging ? 'staging' : card.pile)
      },
      type: 'card',
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <Card
        card={card}
        isFlipped={true}
        isInStaging={isInStaging}
        isDragging={isDragging}
      />
    </div>
  );
}