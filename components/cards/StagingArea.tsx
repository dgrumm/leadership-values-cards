'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useCallback, forwardRef } from 'react';
import { DraggableCard } from './DraggableCard';
import { Card as CardType } from '@/lib/types/card';
import { cn } from '@/lib/utils';

interface StagingAreaProps {
  card: CardType | null;
  isDragging?: boolean;
  className?: string;
  'data-testid'?: string;
  // Accessibility props
  tabIndex?: number;
  role?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export const StagingArea = forwardRef<HTMLDivElement, StagingAreaProps>(function StagingArea({ 
  card, 
  isDragging = false, 
  className,
  'data-testid': dataTestId,
  tabIndex,
  role,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby
}, ref) {
  // Memoize animation configurations to prevent recreation on every render
  const animationConfig = useMemo(() => ({
    initial: { 
      x: -232,  // Start from deck center (deck width + gap = 56*4 + 32 = 256px, so -232 to center)
      y: 0,     // Same level as staging area
      rotateY: -180,  // Start with back facing
      rotateX: -20,   // Slight tilt for 3D effect
      opacity: 0.3,
      scale: 0.9
    },
    animate: { 
      x: 0,     // Center position
      y: 0,     // Staging level
      rotateY: 0,     // Front facing
      rotateX: 0,     // Level
      opacity: 1,
      scale: 1
    },
    exit: { 
      rotateY: 90, 
      rotateX: 10,
      opacity: 0, 
      scale: 0.9
    },
    transition: { 
      type: "spring" as const, 
      stiffness: 260, 
      damping: 20,
      duration: 0.5,
      // Arc motion with different timing for x,y
      x: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
      y: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
      // 3D rotation timing
      rotateY: { duration: 0.4, delay: 0.15, ease: [0.23, 1, 0.32, 1] },
      rotateX: { duration: 0.4, delay: 0.1 }
    },
    style: {
      transformStyle: 'preserve-3d' as const,
      perspective: '1200px',
      // Enhanced 3D shadow effects
      filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.15))'
    }
  }), []);

  const boxShadowAnimation = useMemo(() => ({
    boxShadow: [
      '0 4px 8px rgba(0,0,0,0.1)',
      '0 8px 25px rgba(0,0,0,0.2)', 
      '0 4px 12px rgba(0,0,0,0.15)'
    ]
  }), []);

  return (
    <div 
      ref={ref}
      className={cn("relative w-56 h-40", className)}
      data-testid={dataTestId}
      tabIndex={tabIndex}
      role={role || "region"}
      aria-label={ariaLabel || "Card staging area"}
      aria-describedby={ariaDescribedby}
      aria-live="polite"
    >
      {/* Invisible staging area - no visual placeholder */}
      
      {/* Enhanced 3D flip with card back/front and arc movement */}
      <AnimatePresence mode="wait">
        {card && (
          <motion.div
            key={card.id}
            className="absolute inset-0"
            initial={animationConfig.initial}
            animate={animationConfig.animate}
            exit={animationConfig.exit}
            transition={animationConfig.transition}
            style={animationConfig.style}
          >
            {/* Card with enhanced 3D styling and drag functionality */}
            <motion.div
              style={{
                transformStyle: 'preserve-3d',
              }}
              animate={boxShadowAnimation}
              transition={{ duration: 0.5, times: [0, 0.5, 1] }}
            >
              <DraggableCard
                card={card}
                isInStaging={true}
                pile="staging"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});