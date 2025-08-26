'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PileState } from '@/lib/constraints/types';

interface PileCounterProps {
  pileState: PileState;
  displayText?: string;
  showAnimation?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function PileCounter({ 
  pileState,
  displayText,
  showAnimation = true,
  className,
  size = 'md'
}: PileCounterProps) {
  const { count, visualState } = pileState;
  const text = displayText || count.toString();

  // Size variants
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 min-w-6 h-5',
    md: 'text-sm px-2 py-1 min-w-8 h-6',
    lg: 'text-base px-2.5 py-1.5 min-w-10 h-8'
  };

  // Visual state styling
  const getStateStyles = () => {
    const baseClasses = 'rounded-full font-medium border-2 flex items-center justify-center transition-all duration-200';
    
    switch (visualState) {
      case 'valid':
        return cn(baseClasses, 'bg-green-100 text-green-700 border-green-300');
      case 'warning':
        return cn(baseClasses, 'bg-orange-100 text-orange-700 border-orange-300');
      case 'error':
        return cn(baseClasses, 'bg-red-100 text-red-700 border-red-300');
      case 'disabled':
        return cn(baseClasses, 'bg-gray-100 text-gray-400 border-gray-300');
      default:
        return cn(baseClasses, 'bg-gray-100 text-gray-600 border-gray-300');
    }
  };

  // Animation variants
  const bounceVariants = {
    idle: { scale: 1 },
    bounce: { 
      scale: [1, 1.2, 1],
      transition: { duration: 0.3, ease: "easeOut" }
    }
  };

  const pulseVariants = {
    idle: { opacity: 1 },
    pulse: { 
      opacity: [1, 0.7, 1],
      transition: { duration: 0.5, ease: "easeInOut" }
    }
  };

  return (
    <motion.div
      className={cn(
        getStateStyles(),
        sizeClasses[size],
        className
      )}
      variants={showAnimation ? bounceVariants : undefined}
      animate={pileState.isAtLimit || pileState.isOverLimit ? "bounce" : "idle"}
      role="status"
      aria-label={`Pile has ${count} cards. ${pileState.isOverLimit ? 'Over limit' : pileState.isAtLimit ? 'At limit' : pileState.isApproaching ? 'Approaching limit' : 'Within limits'}`}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={text}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 10, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="tabular-nums"
        >
          {text}
        </motion.span>
      </AnimatePresence>
      
      {/* Visual indicator for state */}
      {visualState !== 'default' && (
        <motion.div
          className={cn(
            "absolute -top-1 -right-1 w-2 h-2 rounded-full",
            {
              'bg-green-500': visualState === 'valid',
              'bg-orange-500': visualState === 'warning', 
              'bg-red-500': visualState === 'error',
              'bg-gray-400': visualState === 'disabled'
            }
          )}
          variants={pulseVariants}
          animate={visualState === 'warning' || visualState === 'error' ? "pulse" : "idle"}
          title={
            visualState === 'error' ? 'Pile limit exceeded' :
            visualState === 'warning' ? 'Approaching pile limit' :
            visualState === 'valid' ? 'At target limit' :
            visualState === 'disabled' ? 'Pile disabled' :
            undefined
          }
        />
      )}
    </motion.div>
  );
}

/**
 * Compact counter variant for small spaces
 */
export function CompactPileCounter({ pileState, className }: { pileState: PileState; className?: string }) {
  return (
    <PileCounter
      pileState={pileState}
      size="sm"
      showAnimation={false}
      className={cn("absolute top-2 right-2", className)}
    />
  );
}

/**
 * Badge-style counter for pile headers
 */  
export function PileBadgeCounter({ 
  pileState, 
  label, 
  className 
}: { 
  pileState: PileState; 
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <span className="text-sm font-medium text-gray-700">
          {label}
        </span>
      )}
      <PileCounter pileState={pileState} size="md" />
    </div>
  );
}