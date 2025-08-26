'use client';

import { motion } from 'framer-motion';
import { Card as CardType } from '@/lib/types/card';
import { cn } from '@/lib/utils';
import { forwardRef, memo } from 'react';

interface CardProps {
  card: CardType;
  isFlipped?: boolean;
  isInStaging?: boolean;
  isDragging?: boolean;
  isDragStart?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  tabIndex?: number;
  'aria-label'?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

const CardComponent = forwardRef<HTMLDivElement, CardProps>(({ 
  card, 
  isFlipped = true, 
  isInStaging = false,
  isDragging = false,
  isDragStart = false,
  onClick, 
  className,
  style,
  tabIndex,
  'aria-label': ariaLabel,
  onKeyDown,
  ...props
}, ref) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onKeyDown) {
      onKeyDown(e);
    } else if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <motion.div
      ref={ref}
      className={cn(
        "card", // Base card class for test selectors
        "relative w-56 h-40 cursor-pointer select-none",
        "bg-white rounded-xl shadow-lg border border-gray-200",
        "transition-shadow duration-200",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50",
        "touch-drag-handle",
        isDragStart && "card-drag-start",
        isDragging && "card-dragging",
        !isDragging && !isDragStart && "hover:shadow-xl hover:-translate-y-1",
        isInStaging && "ring-2 ring-blue-300 ring-opacity-50 shadow-2xl",
        className
      )}
      style={style}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={tabIndex}
      role={onClick ? "button" : "img"}
      aria-label={ariaLabel || `${card.value_name.replace(/_/g, ' ')} card`}
      whileHover={!isDragging ? { 
        y: -4, 
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" 
      } : {}}
      whileTap={{ scale: 0.98 }}
      layout
      {...props}
    >
      {isFlipped ? (
        // Front of card (value and description)
        <div className="p-4 h-full flex flex-col">
          <div className="text-center mb-2">
            <h3 className="text-base font-bold text-gray-900 leading-tight">
              {card.value_name.replace(/_/g, ' ')}
            </h3>
          </div>
          <div className="flex-1 flex items-center">
            <p className="text-xs text-gray-600 text-center leading-relaxed">
              {card.description}
            </p>
          </div>
        </div>
      ) : (
        // Back of card (face-down)
        <div className="h-full w-full rounded-xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="text-xs font-medium mb-1 opacity-90">Leadership Values</div>
            <div className="text-3xl font-bold mb-1">?</div>
            <div className="text-xs opacity-75">Click to flip</div>
          </div>
        </div>
      )}
    </motion.div>
  );
});

CardComponent.displayName = 'Card';

// Memoize component to prevent unnecessary re-renders during drag operations
export const Card = memo(CardComponent);