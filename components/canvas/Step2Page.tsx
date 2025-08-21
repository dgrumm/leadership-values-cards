'use client';

import { useEffect, useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useStep2Store } from '@/state/local/step2-store';
import { Deck } from '@/components/cards/Deck';
import { StagingArea } from '@/components/cards/StagingArea';
import { DroppableZone } from '@/components/cards/DroppableZone';
import { DraggableCard } from '@/components/cards/DraggableCard';
import { Step2Modal } from '@/components/ui/Step2Modal';
import { Button } from '@/components/ui/Button';
import { SessionHeader } from '@/components/header/SessionHeader';
import { Card } from '@/lib/types/card';
import { cn } from '@/lib/utils';

interface Step2PageProps {
  sessionCode: string;
  participantName: string;
  step1Data: {
    moreImportantPile: Card[];
    lessImportantPile: Card[];
  };
  onStepComplete?: () => void;
}

export function Step2Page({ sessionCode, participantName, step1Data, onStepComplete }: Step2PageProps) {
  const [showModal, setShowModal] = useState(false); // Start false, show after transition
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [bounceAnimation, setBounceAnimation] = useState(false);
  
  const {
    deck,
    deckPosition,
    stagingCard,
    top8Pile,
    lessImportantPile,
    discardedPile,
    showOverflowWarning,
    isTransitioning,
    transitionPhase,
    initializeFromStep1,
    startTransition,
    flipNextCard,
    moveCardToPile,
    moveCardBetweenPiles,
    showOverflowWarningMessage,
    hideOverflowWarningMessage,
  } = useStep2Store();

  // Initialize Step 2 with transition animation from Step 1
  useEffect(() => {
    const initializeStep2 = async () => {
      await startTransition(step1Data.moreImportantPile, step1Data.lessImportantPile);
      // Show modal after transition completes
      setTimeout(() => setShowModal(true), 200);
    };
    initializeStep2();
  }, [startTransition, step1Data]);

  const remainingCards = deck.length - deckPosition;
  const canProceed = remainingCards === 0 && !stagingCard && top8Pile.length === 8;
  const totalSortedCards = top8Pile.length + lessImportantPile.length;

  // Handle deck click - flip next card
  const handleDeckClick = () => {
    flipNextCard();
  };

  // Handle pile title clicks - move staging card to pile
  const handleTop8Click = () => {
    if (stagingCard) {
      if (top8Pile.length >= 8) {
        triggerBounceAnimation();
        return;
      }
      moveCardToPile(stagingCard.id, 'top8');
    }
  };

  const handleLessImportantClick = () => {
    if (stagingCard) {
      moveCardToPile(stagingCard.id, 'less');
    }
  };

  // Handle card clicks in piles
  const handleCardClick = (cardId: string) => {
    console.log('Card clicked:', cardId);
  };

  // Trigger bounce animation for overflow
  const triggerBounceAnimation = () => {
    setBounceAnimation(true);
    showOverflowWarningMessage();
    setTimeout(() => {
      setBounceAnimation(false);
    }, 400); // Match spec: 400ms elastic bounce
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setDraggedCardId(active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedCardId(null);

    if (!over) return;

    const activeCard = active.data.current?.card;
    const overData = over.data.current;

    if (!activeCard || !overData) return;

    // Moving from staging to pile
    if (activeCard.pile === 'staging' && overData.type === 'pile') {
      const targetPile = overData.pile as 'top8' | 'less';
      // Check for overflow and trigger bounce
      if (targetPile === 'top8' && top8Pile.length >= 8) {
        triggerBounceAnimation();
        return;
      }
      moveCardToPile(activeCard.id, targetPile);
    }
    
    // Moving between piles
    if ((activeCard.pile === 'top8' || activeCard.pile === 'less') && overData.type === 'pile') {
      const fromPile = activeCard.pile as 'top8' | 'less';
      const toPile = overData.pile as 'top8' | 'less';
      if (fromPile !== toPile) {
        // Check for overflow when moving TO Top 8 pile
        if (toPile === 'top8' && top8Pile.length >= 8) {
          triggerBounceAnimation();
          return;
        }
        moveCardBetweenPiles(activeCard.id, fromPile, toPile);
      }
    }
  };

  const handleReviewClick = () => {
    if (onStepComplete) {
      onStepComplete();
    } else {
      console.log('Proceeding to review...');
      alert('Review navigation not configured');
    }
  };

  // Get validation message based on current state
  const getValidationMessage = () => {
    if (top8Pile.length < 8) {
      return `Select ${8 - top8Pile.length} more card${8 - top8Pile.length === 1 ? '' : 's'} for your Top 8`;
    }
    if (remainingCards > 0) {
      return `Sort ${remainingCards} remaining card${remainingCards === 1 ? '' : 's'}`;
    }
    if (stagingCard) {
      return 'Sort the current card before proceeding';
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <SessionHeader
        sessionCode={sessionCode}
        participantName={participantName}
        currentStep={2}
        totalSteps={3}
        onStepClick={() => setShowModal(true)}
      />

      {/* Transition overlay */}
      {isTransitioning && (
        <motion.div
          className="fixed inset-0 z-30 bg-white/80 backdrop-blur-sm flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="text-center">
            <motion.div
              className="text-lg font-semibold text-gray-700 mb-4"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Preparing Step 2...
            </motion.div>
            <motion.div
              className="flex items-center gap-4 text-gray-600"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Organizing your cards...</span>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Main content */}
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="container mx-auto px-4 pt-20 pb-8 min-h-screen flex flex-col">
          {/* Top section - Drop zones side by side */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <DroppableZone
              id="top8-pile"
              title="Top 8 Most Important"
              subtitle={
                <span className={cn(
                  "transition-colors duration-200",
                  top8Pile.length === 8 ? "font-bold text-green-600" : ""
                )}>
                  ({top8Pile.length}/8)
                </span>
              }
              cards={top8Pile}
              onCardClick={handleCardClick}
              onTitleClick={handleTop8Click}
              className={cn(
                "h-64 transition-all duration-200",
                top8Pile.length >= 8 && !showOverflowWarning && "ring-2 ring-yellow-400 bg-yellow-50/50",
                showOverflowWarning && "ring-2 ring-red-500 bg-red-50/50 border-red-500",
                top8Pile.length >= 8 && "border-2",
                // Invalid drop zone feedback when dragging and pile is full
                draggedCardId && top8Pile.length >= 8 && "opacity-60 ring-2 ring-red-300 pointer-events-none"
              )}
              data-pile="top8"
            />
            
            <DroppableZone
              id="less-important"
              title="Less Important"
              subtitle={`(${lessImportantPile.length} cards)`}
              cards={lessImportantPile}
              onCardClick={handleCardClick}
              onTitleClick={handleLessImportantClick}
              className="h-64"
              data-pile="less"
            />
          </div>

          {/* Overflow warning message */}
          <AnimatePresence>
            {showOverflowWarning && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 mx-auto"
              >
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 max-w-md">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <div className="font-medium">Top 8 is full!</div>
                    <div className="text-sm">Remove a card to add another</div>
                  </div>
                  <button
                    onClick={hideOverflowWarningMessage}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    ×
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Middle section - Staging area positioned right of center */}
          <div className="flex-1 relative flex items-center justify-center">
            <motion.div 
              className="absolute right-1/3 -translate-y-8"
              animate={bounceAnimation ? {
                x: [0, -15, 12, -8, 5, -2, 0],
                y: [0, -8, 5, -3, 2, -1, 0],
                rotate: [0, -2, 1, -1, 0.5, 0, 0],
                scale: [1, 1.05, 0.98, 1.02, 0.99, 1, 1]
              } : {}}
              transition={{
                duration: 0.4,
                ease: [0.68, -0.55, 0.265, 1.55] // Elastic ease for more bounce
              }}
            >
              {stagingCard ? (
                <DraggableCard
                  card={stagingCard}
                  isInStaging={true}
                />
              ) : (
                <StagingArea 
                  card={null}
                  isDragging={!!draggedCardId}
                />
              )}
            </motion.div>
          </div>

          {/* Bottom section - Deck, discard pile, and controls */}
          <div className="flex flex-col items-center gap-6 relative">
            <div className="flex items-end justify-center gap-8 w-full">
              {/* Main deck */}
              <Deck
                cardCount={remainingCards}
                onClick={handleDeckClick}
                disabled={!!stagingCard}
              />
              
              {/* Discard pile (bottom-right) */}
              <div className="absolute right-0 bottom-0">
                <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl w-24 h-32 flex flex-col items-center justify-center text-gray-500 text-xs">
                  <div className="font-medium">Discarded</div>
                  <div>({discardedPile.length})</div>
                </div>
              </div>
            </div>
            
            {/* Progress info */}
            <div className="text-center text-sm text-gray-600">
              <div>Top 8: {top8Pile.length}/8 • Cards sorted: {totalSortedCards} / {deck.length}</div>
              {stagingCard && (
                <div className="text-blue-600 font-medium mt-1">
                  Sort the "{stagingCard.value_name.replace(/_/g, ' ')}" card
                </div>
              )}
              {getValidationMessage() && (
                <div className="text-amber-600 font-medium mt-1">
                  {getValidationMessage()}
                </div>
              )}
            </div>

            {/* Review Top 8 button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: canProceed ? 1 : 0.5,
                y: 0
              }}
              transition={{ duration: 0.3 }}
            >
              <Button
                onClick={handleReviewClick}
                className={cn(
                  "px-8 py-3 font-semibold rounded-xl shadow-lg transition-all",
                  canProceed 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                )}
                disabled={!canProceed}
              >
                Review Top 8 ➜
              </Button>
            </motion.div>
          </div>
        </div>
      </DndContext>

      {/* Instructions modal */}
      <Step2Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        top8Count={top8Pile.length}
        lessImportantCount={lessImportantPile.length}
        cardsInDeck={remainingCards}
        totalCards={deck.length}
      />
    </div>
  );
}