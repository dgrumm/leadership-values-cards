'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface DeckProps {
  cardCount: number;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  // Accessibility props
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export const Deck = forwardRef<HTMLButtonElement, DeckProps>(function Deck({ 
  cardCount, 
  onClick, 
  disabled = false, 
  className, 
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby
}, ref) {
  const stackCards = Math.min(cardCount, 5); // Show max 5 cards in stack for visual effect
  const isEmpty = cardCount === 0;
  
  if (isEmpty) {
    return (
      <div className={cn("relative w-56 h-40", className)}>
        <motion.div
          className={cn(
            "w-full h-full rounded-xl border-2 border-dashed border-gray-300",
            "bg-gray-50 flex items-center justify-center"
          )}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="text-center text-gray-400">
            <div className="text-sm font-medium mb-1">Deck Empty</div>
            <div className="text-xs">All cards flipped!</div>
          </div>
        </motion.div>
      </div>
    );
  }
  
  return (
    <div className={cn("relative w-56 h-40", className)}>
      {/* Stack of cards behind for depth effect */}
      {Array.from({ length: stackCards }, (_, i) => (
        <motion.div
          key={i}
          className={cn(
            "absolute w-56 h-40 bg-gradient-to-br from-blue-600 to-purple-700",
            "rounded-xl shadow-md border border-blue-500",
            disabled && "opacity-60"
          )}
          style={{
            zIndex: stackCards - i,
            transform: `translate(${i * 1.5}px, ${i * -1.5}px)`,
          }}
          initial={{ scale: 0.98 + (i * 0.005) }}
          animate={{ scale: 0.98 + (i * 0.005) }}
        />
      ))}
      
      {/* Top card (clickable) */}
      <motion.button
        ref={ref}
        className={cn(
          "relative w-56 h-40 bg-gradient-to-br from-blue-600 to-purple-700",
          "rounded-xl shadow-lg border border-blue-500",
          "flex items-center justify-center text-white cursor-pointer select-none",
          "transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:shadow-xl hover:-translate-y-1",
        )}
        style={{ zIndex: stackCards + 1 }}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        whileHover={!disabled ? { 
          y: -4, 
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" 
        } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        animate={{
          rotateY: 0,
          opacity: 1
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 25
        }}
      >
        <div className="text-center">
          <div className="text-xs font-medium mb-2 opacity-90">Leadership Values</div>
          <div className="text-3xl font-bold mb-2">?</div>
          <div className="text-xs opacity-75 mb-1">
            {cardCount} card{cardCount !== 1 ? 's' : ''} left
          </div>
          <div className="text-xs opacity-60">
            Click to flip
          </div>
        </div>
      </motion.button>
    </div>
  );
});