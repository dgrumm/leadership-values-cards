'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStep2Store } from '@/hooks/stores/useSessionStores';
import { useSessionStoreContext } from '@/contexts/SessionStoreContext';
import { Deck } from '@/components/cards/Deck';
import { StagingArea } from '@/components/cards/StagingArea';
import { DroppableZone } from '@/components/cards/DroppableZone';
import { DraggableCard } from '@/components/cards/DraggableCard';
import { Step2Modal } from '@/components/ui/Step2Modal';
import { Button } from '@/components/ui/Button';
import { SessionHeader } from '@/components/header/SessionHeader';
import { ParticipantsModal } from '@/components/collaboration/ParticipantsModal';
import { DragErrorBoundary } from '@/components/ui/DragErrorBoundary';
import { usePresence } from '@/hooks/collaboration/usePresence';
import { Card } from '@/lib/types/card';
import { cn, debounce } from '@/lib/utils';

interface Step2PageProps {
  sessionCode: string;
  participantName: string;
  currentStep?: 1 | 2 | 3; // Allow override of step for presence
  step1Data: {
    moreImportantPile: Card[];
    lessImportantPile: Card[];
  };
  onStepComplete?: () => void;
}

export function Step2Page({ sessionCode, participantName, currentStep = 2, step1Data, onStepComplete }: Step2PageProps) {
  const [showModal, setShowModal] = useState(false); // Start false, show after transition
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [bounceAnimation, setBounceAnimation] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [dragTimeout, setDragTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const isDraggingRef = useRef(false);
  
  // Initialize presence system
  const {
    participantsForDisplay = new Map(), // NEW: Hybrid data with consistent identity/step
    allParticipantsForDisplay = new Map(), // LEGACY: Fallback for backward compatibility
    currentUser,
    participantCount,
    isConnected,
    error: presenceError,
    onViewReveal
  } = usePresence({
    sessionCode,
    participantName,
    currentStep,
    enabled: true
  });
  
  // Refs for focus management
  const deckRef = useRef<HTMLButtonElement>(null);
  const stagingRef = useRef<HTMLDivElement>(null);
  const top8Ref = useRef<HTMLDivElement>(null);
  const lessImportantRef = useRef<HTMLDivElement>(null);
  
  // Get session store context for consistent participant ID
  const { participantId: sessionParticipantId } = useSessionStoreContext();
  
  const {
    deck,
    deckPosition,
    stagingCard,
    top8Pile,
    lessImportantPile,
    discardedPile,
    showOverflowWarning,
    isTransitioning,
    startTransition,
    flipNextCard,
    moveCardToPile,
    moveCardBetweenPiles,
    showOverflowWarningMessage,
    hideOverflowWarningMessage,
  } = useSessionStep2Store();

  // Calculate if step is complete (exactly 8 cards in top8Pile)
  const isStepComplete = top8Pile.length === 8;

  // Comprehensive drag state clearing function
  const clearDragState = useCallback(() => {
    setDraggedCardId(null);
    setActiveCard(null);
    isDraggingRef.current = false;
    
    if (dragTimeout) {
      clearTimeout(dragTimeout);
      setDragTimeout(null);
    }
  }, [dragTimeout]);

  // Initialize Step 2 with transition animation from Step 1
  useEffect(() => {
    const initializeStep2 = async () => {
      await startTransition(step1Data.moreImportantPile, step1Data.lessImportantPile);
      // Show modal after transition completes
      setTimeout(() => setShowModal(true), 200);
    };
    initializeStep2();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount - intentionally omitting dependencies

  // Error recovery: ESC key cancellation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isDraggingRef.current) {
        event.preventDefault();
        clearDragState();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clearDragState]);

  // Error recovery: Window focus/blur handling
  useEffect(() => {
    const handleWindowBlur = () => {
      if (isDraggingRef.current) {
        clearDragState();
      }
    };

    const handleWindowFocus = () => {
      // Clear any stale drag state on focus
      if (isDraggingRef.current && !activeCard) {
        clearDragState();
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [clearDragState, activeCard]);

  // Cleanup drag timeout on unmount
  useEffect(() => {
    return () => {
      if (dragTimeout) {
        clearTimeout(dragTimeout);
      }
    };
  }, [dragTimeout]);

  const remainingCards = deck.length - deckPosition;
  const canProceed = remainingCards === 0 && !stagingCard && top8Pile.length === 8;
  const totalSortedCards = top8Pile.length + lessImportantPile.length;

  // Handle deck click - flip next card
  const handleDeckClick = () => {
    flipNextCard();
    // Focus management - focus staging area after flipping
    setTimeout(() => {
      stagingRef.current?.focus();
    }, 300); // Match card flip animation timing
  };

  // Handle pile title clicks - move staging card to pile
  const handleTop8Click = () => {
    if (stagingCard) {
      if (top8Pile.length >= 8) {
        triggerBounceAnimation();
        // Announce to screen readers
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.textContent = 'Top 8 pile is full. Remove a card to add another.';
        announcement.className = 'sr-only';
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 3000);
        return;
      }
      moveCardToPile(stagingCard.id, 'top8');
      // Focus the target pile
      setTimeout(() => {
        top8Ref.current?.focus();
      }, 100);
    }
  };

  const handleLessImportantClick = () => {
    if (stagingCard) {
      moveCardToPile(stagingCard.id, 'less');
      // Focus the target pile
      setTimeout(() => {
        lessImportantRef.current?.focus();
      }, 100);
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

  // Debounced card movement for better performance
  const debouncedMoveCardToPile = useMemo(
    () => debounce((cardId: string, pile: 'top8' | 'less') => {
      moveCardToPile(cardId, pile);
    }, 200),
    [moveCardToPile]
  );
  
  const debouncedMoveCardBetweenPiles = useMemo(
    () => debounce((cardId: string, fromPile: 'top8' | 'less', toPile: 'top8' | 'less') => {
      moveCardBetweenPiles(cardId, fromPile, toPile);
    }, 200),
    [moveCardBetweenPiles]
  );

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const cardId = active.id as string;
    setDraggedCardId(cardId);
    isDraggingRef.current = true;

    // Find the active card for DragOverlay
    let card = null;
    if (stagingCard?.id === cardId) {
      card = stagingCard;
    } else {
      card = [...top8Pile, ...lessImportantPile].find(c => c.id === cardId);
    }
    
    setActiveCard(card || null);
    
    // Set timeout for drag protection (10 seconds)
    const timeout = setTimeout(() => {
      console.warn('Drag operation timed out, clearing state');
      clearDragState();
    }, 10000);
    
    setDragTimeout(timeout);
    
    // Touch haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    clearDragState();

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
      debouncedMoveCardToPile(activeCard.id, targetPile);
      
      // Success haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
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
        debouncedMoveCardBetweenPiles(activeCard.id, fromPile, toPile);
        
        // Success haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 50, 50]);
        }
      }
    }
  };

  // Handle drag cancellation
  const handleDragCancel = () => {
    clearDragState();
  };

  const handleReviewClick = () => {
    if (onStepComplete) {
      onStepComplete();
    } else {
      console.log('Proceeding to review...');
      alert('Review navigation not configured');
    }
  };

  const handleReveal = () => {
    setIsRevealed(!isRevealed);
    // TODO: Implement actual reveal functionality (send to other participants)
    console.log('Reveal toggled:', !isRevealed);
  };

  // Participants modal handlers
  const handleShowParticipants = () => {
    setShowParticipants(true);
  };

  const handleCloseParticipants = () => {
    setShowParticipants(false);
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
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100"
      role="main"
      aria-label="Step 2: Select Top 8 Leadership Values"
    >
      {/* Header */}
      <SessionHeader
        sessionCode={sessionCode}
        participantId={sessionParticipantId}
        participantName={participantName}
        currentStep={2}
        totalSteps={3}
        participantCount={participantCount}
        onStepClick={() => setShowModal(true)}
        isRevealed={isRevealed}
        showRevealButton={true}
        stepComplete={isStepComplete}
        onParticipantsClick={handleShowParticipants}
        onRevealSuccess={() => setIsRevealed(true)}
        onRevealError={(error) => console.error('Reveal error:', error)}
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
      <DragErrorBoundary
        onError={(error, errorInfo) => {
          console.error('Step 2 drag error:', error, errorInfo);
          // Could integrate with error tracking service here
        }}
      >
        <DndContext
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
        <div className="container mx-auto px-4 pt-20 pb-8 min-h-screen flex flex-col">
          {/* Screen reader announcements */}
          <div 
            aria-live="polite" 
            aria-atomic="true"
            className="sr-only"
            id="step2-announcements"
          >
            {stagingCard && `Current card: ${stagingCard.value_name.replace(/_/g, ' ')}`}
            {canProceed && "Ready to proceed - all 8 cards selected and deck is empty"}
          </div>

          {/* Top section - Drop zones side by side */}
          <div 
            className="grid grid-cols-2 gap-8 mb-8"
            role="region"
            aria-label="Card sorting piles"
          >
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
              data-testid="top8-pile"
              cards={top8Pile}
              onCardClick={handleCardClick}
              onTitleClick={handleTop8Click}
              className={cn(
                "h-[28rem] transition-all duration-200",
                top8Pile.length >= 8 && !showOverflowWarning && "ring-2 ring-yellow-400 bg-yellow-50/50",
                showOverflowWarning && "ring-2 ring-red-500 bg-red-50/50 border-red-500",
                top8Pile.length >= 8 && "border-2",
                // Invalid drop zone feedback when dragging and pile is full
                draggedCardId && top8Pile.length >= 8 && "opacity-60 ring-2 ring-red-300 pointer-events-none"
              )}
              data-pile="top8"
              ref={top8Ref}
              tabIndex={0}
              role="group"
              aria-label={`Top 8 most important values pile, contains ${top8Pile.length} of 8 cards`}
              aria-describedby="top8-description"
            />
            <div id="top8-description" className="sr-only">
              Drop zone for your 8 most important leadership values. Maximum 8 cards allowed.
            </div>
            
            <DroppableZone
              id="less-important"
              title="Less Important"
              subtitle={`(${lessImportantPile.length} cards)`}
              cards={lessImportantPile}
              onCardClick={handleCardClick}
              onTitleClick={handleLessImportantClick}
              className="h-[28rem]"
              data-pile="less"
              ref={lessImportantRef}
              tabIndex={0}
              role="group"
              aria-label={`Less important values pile, contains ${lessImportantPile.length} cards`}
              aria-describedby="less-important-description"
            />
            <div id="less-important-description" className="sr-only">
              Drop zone for values that are less important to your leadership style.
            </div>
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

          {/* Bottom section - Deck and staging side by side with fixed positions (same as Step 1) */}
          <div 
            className="flex-1 flex items-center justify-center gap-8"
            role="region"
            aria-label="Deck and staging area"
          >
            {/* Deck - fixed size container */}
            <div className="w-64 h-40">
              <Deck
                cardCount={remainingCards}
                onClick={handleDeckClick}
                disabled={!!stagingCard}
                ref={deckRef}
                aria-label={`Card deck with ${remainingCards} cards remaining. Click to flip next card.`}
                aria-describedby="deck-instructions"
                data-testid="deck"
              />
              <div id="deck-instructions" className="sr-only">
                Click the deck to flip cards from your More Important pile. You can then sort them into piles.
              </div>
            </div>
            
            {/* Staging area - fixed size container with 3D flip animation */}
            <motion.div 
              className="w-64 h-40"
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
              <StagingArea
                card={stagingCard}
                isDragging={draggedCardId === stagingCard?.id}
                ref={stagingRef}
                tabIndex={stagingCard ? 0 : -1}
                role="group"
                aria-label={
                  stagingCard 
                    ? `Current card: ${stagingCard.value_name.replace(/_/g, ' ')}. Drag to sort into piles.`
                    : "Staging area - empty. Click deck to flip next card."
                }
                data-testid="staging-area"
                aria-describedby="staging-instructions"
              />
              <div id="staging-instructions" className="sr-only">
                Cards appear here when flipped from the deck. Drag cards to the Top 8 or Less Important piles.
              </div>
            </motion.div>
          </div>

          {/* Controls section */}
          <div className="flex flex-col items-center gap-6 relative">
            {/* Discard pile (bottom-right) - Same visual as main deck */}
            <div className="absolute right-8 bottom-0">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-2 font-medium">Discarded</div>
                <Deck
                  cardCount={discardedPile.length}
                  onClick={() => {}} // Not clickable
                  disabled={true}
                />
                <div className="text-xs text-gray-500 mt-1">
                  ({discardedPile.length} cards)
                </div>
              </div>
            </div>
            
            {/* Progress info */}
            <div className="text-center text-sm text-gray-600">
              <div>Top 8: {top8Pile.length}/8 • Cards sorted: {totalSortedCards} / {deck.length}</div>
              {stagingCard && (
                <div className="text-blue-600 font-medium mt-1">
                  Sort the &quot;{stagingCard.value_name.replace(/_/g, ' ')}&quot; card
                </div>
              )}
              {getValidationMessage() && (
                <div className="text-amber-600 font-medium mt-1">
                  {getValidationMessage()}
                </div>
              )}
              
              {/* Presence status */}
              {presenceError && (
                <div className="text-red-500 text-xs mt-1">
                  Collaboration offline: {presenceError}
                </div>
              )}
              {isConnected && participantCount > 1 && (
                <div className="text-green-600 text-xs mt-1">
                  ✓ Connected with {participantCount - 1} other participant{participantCount === 2 ? '' : 's'}
                </div>
              )}
            </div>

            {/* Action buttons - Show different options based on card count */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex gap-4 flex-wrap justify-center"
            >
              {/* Edge case: If fewer than 8 cards available, show Keep All option */}
              {deck.length < 8 && remainingCards === 0 && !stagingCard ? (
                <>
                  <Button
                    onClick={handleReviewClick}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg"
                    data-testid="continue-to-step3-button"
                  >
                    Keep All & Continue to Step 3 ➜
                  </Button>
                  <Button
                    onClick={handleReveal}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg"
                  >
                    Reveal My Choices
                  </Button>
                </>
              ) : (
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
              )}
            </motion.div>
          </div>
        </div>

        {/* Drag Overlay - This fixes z-index issues */}
        <DragOverlay
          style={{
            zIndex: 10000,
          }}
        >
          {activeCard ? (
            <motion.div
              initial={{ scale: 1 }}
              animate={{ 
                scale: 1.05,
                rotate: 5,
              }}
              style={{
                cursor: 'grabbing',
                transformOrigin: 'center',
                transform: 'translateZ(0)', // Hardware acceleration
              }}
              className="relative will-change-transform"
            >
              <DraggableCard
                card={activeCard}
                isInStaging={false}
                pile={activeCard.pile === 'top8' ? 'more' : (activeCard.pile === 'staging' ? 'staging' : 'less')}
              />
            </motion.div>
          ) : null}
        </DragOverlay>
        </DndContext>
      </DragErrorBoundary>

      {/* Instructions modal */}
      <Step2Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        top8Count={top8Pile.length}
        lessImportantCount={lessImportantPile.length}
        cardsInDeck={remainingCards}
        totalCards={deck.length}
      />

      {/* Participants modal */}
      <ParticipantsModal
        isOpen={showParticipants}
        onClose={handleCloseParticipants}
        participants={participantsForDisplay.size > 0 ? participantsForDisplay : allParticipantsForDisplay}
        currentUserId={currentUser?.participantId || ''}
        sessionCode={sessionCode}
        onViewReveal={onViewReveal}
      />
    </div>
  );
}