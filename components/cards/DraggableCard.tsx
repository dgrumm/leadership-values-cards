'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card } from './Card';
import { Card as CardType, CardPile } from '@/lib/types/card';
import { useState, useEffect, useRef } from 'react';

interface DraggableCardProps {
  card: CardType;
  isInStaging?: boolean;
  pile?: CardPile;
}

export function DraggableCard({ card, isInStaging = false, pile }: DraggableCardProps) {
  const [isDragStart, setIsDragStart] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const touchTimeoutRef = useRef<NodeJS.Timeout>();
  const longPressRef = useRef(false);

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

  // Touch event handlers
  const handleTouchStart = () => {
    setIsTouch(true);
    longPressRef.current = false;
    
    touchTimeoutRef.current = setTimeout(() => {
      longPressRef.current = true;
      setIsDragStart(true);
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 200);
  };

  const handleTouchEnd = () => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }
    setIsDragStart(false);
    longPressRef.current = false;
  };

  const handleTouchMove = () => {
    if (!longPressRef.current) {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    }
  };

  // Mouse event handlers
  const handleMouseDown = () => {
    if (!isTouch) {
      setIsDragStart(true);
    }
  };

  const handleMouseUp = () => {
    setIsDragStart(false);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, []);

  // Reset drag start state when dragging ends
  useEffect(() => {
    if (!isDragging) {
      setIsDragStart(false);
    }
  }, [isDragging]);

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 9999 : 'auto',
    position: isDragging ? 'relative' as const : undefined,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={{
        ...style,
        opacity: isDragging ? 0.5 : 1, // Make original semi-transparent during drag
      }} 
      {...listeners} 
      {...attributes}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      <Card
        card={card}
        isFlipped={true}
        isInStaging={isInStaging}
        isDragging={false} // Don't apply drag styles to original card
        isDragStart={isDragStart}
      />
    </div>
  );
}