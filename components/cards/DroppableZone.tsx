'use client';

import { useDroppable } from '@dnd-kit/core';
import { DropZone } from './DropZone';
import { Card } from '@/lib/types/card';
import { ReactNode, forwardRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PileCounter } from '@/components/ui/PileCounter';
import { useBounceAnimation } from '@/hooks/useBounceAnimation';
import { PileType, GameStep } from '@/lib/constraints/types';
import { usePileStates } from '@/hooks/useConstraints';

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
  // Constraint props
  step?: GameStep;
  showConstraintFeedback?: boolean;
  onConstraintViolation?: (reason: string) => void;
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
  step,
  showConstraintFeedback = true,
  onConstraintViolation,
  tabIndex,
  role,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedby
}, ref) {
  // Map pile IDs to pile types for drag/drop
  const getPileType = (pileId: string, dataPile?: string): PileType => {
    if (dataPile) return dataPile as PileType;
    if (pileId === 'more-important') return 'more';
    if (pileId === 'less-important') return 'less';
    if (pileId === 'top8-pile') return 'top8';
    if (pileId === 'top3-pile') return 'top3';
    if (pileId === 'staging-area') return 'staging';
    return 'less'; // default
  };

  const pileType = getPileType(id, dataPile);
  
  // Get pile counts for constraint checking
  const pileCounts = {
    deck: 0,
    staging: pileType === 'staging' ? cards.length : 0,
    more: pileType === 'more' ? cards.length : 0,
    less: pileType === 'less' ? cards.length : 0,
    top8: pileType === 'top8' ? cards.length : 0,
    top3: pileType === 'top3' ? cards.length : 0,
    discard: 0
  };

  // Get pile states for constraint feedback - always call hook but conditionally use result
  const pileStates = usePileStates(step || 'step1', pileCounts);
  const currentPileState = step ? pileStates?.[pileType] : null;

  // Bounce animation for constraint violations
  const { controls: bounceControls, triggerBounce } = useBounceAnimation({
    intensity: 'medium',
    direction: 'both',
    elastic: true
  });

  const { isOver, setNodeRef, active } = useDroppable({
    id,
    data: {
      type: 'pile',
      pile: pileType,
    },
  });

  // Enhanced drop zone state with constraints
  const isValidDrop = isOver && active?.data.current?.type === 'card';
  const isPileFull = currentPileState?.isAtLimit || currentPileState?.isOverLimit || 
                     (maxCards && cards.length >= maxCards);
  const isInvalidDrop = isOver && isPileFull;
  const isWarningState = currentPileState?.isApproaching || currentPileState?.visualState === 'warning';

  // Trigger constraint violation feedback
  useEffect(() => {
    if (isInvalidDrop && showConstraintFeedback) {
      triggerBounce();
      onConstraintViolation?.(`Cannot add more cards to ${title}`);
    }
  }, [isInvalidDrop, showConstraintFeedback, triggerBounce, onConstraintViolation, title]);

  // Enhanced highlight classes with constraint states
  const getHighlightClass = () => {
    if (isInvalidDrop) return 'pile-highlight-invalid border-red-400 bg-red-50';
    if (isValidDrop && !isPileFull) return 'pile-highlight-valid border-green-400 bg-green-50';
    if (isOver) return 'pile-highlight border-blue-400 bg-blue-50';
    
    // Static constraint state styling
    if (currentPileState && showConstraintFeedback) {
      switch (currentPileState.visualState) {
        case 'error':
          return 'border-red-300 bg-red-50/50';
        case 'warning':  
          return 'border-orange-300 bg-orange-50/50';
        case 'valid':
          return 'border-green-300 bg-green-50/50';
        case 'disabled':
          return 'border-gray-300 bg-gray-100/50 opacity-60';
        default:
          return '';
      }
    }
    return '';
  };

  // Enhanced subtitle with constraint info
  const getEnhancedSubtitle = () => {
    if (subtitle) return subtitle;
    
    if (currentPileState && showConstraintFeedback) {
      const counterText = step ? 
        (currentPileState.count > 0 ? 
          `${currentPileState.count}${currentPileState.visualState !== 'default' ? 
            `/${step === 'step2' && pileType === 'top8' ? '8' : 
              step === 'step3' && pileType === 'top3' ? '3' : 
              pileType === 'staging' ? '1' : '∞'}` : 
            ''} cards` : 
          'Empty pile') :
        `${cards.length} card${cards.length !== 1 ? 's' : ''}`;
      
      return (
        <div className="flex items-center justify-between">
          <span className="text-sm opacity-75">{counterText}</span>
          {currentPileState && (
            <PileCounter pileState={currentPileState} size="sm" />
          )}
        </div>
      );
    }
    
    return `(${cards.length} card${cards.length !== 1 ? 's' : ''})`;
  };

  return (
    <motion.div
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
      className={cn(
        'relative transition-all duration-200 rounded-xl',
        className, 
        getHighlightClass(),
        {
          'pointer-events-none': currentPileState?.visualState === 'disabled',
          'animate-pulse': isWarningState && isOver,
        }
      )}
      data-testid={dataTestId}
      tabIndex={tabIndex}
      role={role}
      aria-label={ariaLabel || `${title} pile with ${cards.length} cards`}
      aria-describedby={ariaDescribedby}
      animate={bounceControls}
    >
      <DropZone
        title={title}
        subtitle={getEnhancedSubtitle()}
        cards={cards}
        onCardClick={onCardClick}
        onTitleClick={onTitleClick}
        isHovered={isOver}
        pile={pileType as 'more' | 'less'}
      />

      {/* Constraint violation indicator */}
      {currentPileState?.isOverLimit && showConstraintFeedback && (
        <motion.div
          className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          title="Pile limit exceeded"
        />
      )}

      {/* Approaching limit indicator */}
      {currentPileState?.isApproaching && showConstraintFeedback && (
        <motion.div
          className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          title="Approaching pile limit"
        />
      )}
    </motion.div>
  );
});