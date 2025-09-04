'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStep3Store } from '@/hooks/stores/useSessionStores';
import { useEventDrivenSession } from '@/contexts/EventDrivenSessionContext';
import { Deck } from '@/components/cards/Deck';
import { StagingArea } from '@/components/cards/StagingArea';
import { DroppableZone } from '@/components/cards/DroppableZone';
import { DraggableCard } from '@/components/cards/DraggableCard';
import { Step3Modal } from '@/components/ui/Step3Modal';
import { Button } from '@/components/ui/Button';
import { SessionHeader } from '@/components/header/SessionHeader';
import { ParticipantsModal } from '@/components/collaboration/ParticipantsModal';
import { DragErrorBoundary } from '@/components/ui/DragErrorBoundary';
import { RevealEducationModal } from '@/components/reveals/RevealEducationModal';
import { RevealButtonToast } from '@/components/reveals/RevealButtonToast';
import { useRevealEducation } from '@/hooks/reveals/useRevealEducation';
import { useRevealToast } from '@/hooks/reveals/useRevealToast';
// OLD PRESENCE SYSTEM REMOVED - using event-driven participant data
import { Card } from '@/lib/types/card';
import { cn, debounce } from '@/lib/utils';

interface Step3PageProps {
  sessionCode: string;
  participantName: string;
  currentStep?: 1 | 2 | 3; // Allow override of step for presence
  step2Data: {
    top8Pile: Card[];
    lessImportantPile: Card[];
    discardedPile: Card[];
  };
  step1Data: {
    lessImportantPile: Card[];
  };
  onStepComplete?: () => void;
}

export function Step3Page({ sessionCode, participantName, currentStep = 3, step2Data, step1Data, onStepComplete }: Step3PageProps) {
  const [showModal, setShowModal] = useState(false); // Start false, show after transition
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [bounceAnimation, setBounceAnimation] = useState(false);
  // Reveal state is now managed by RevealManager in EventDrivenSessionContext
  const [showCelebration, setShowCelebration] = useState(false);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [dragTimeout, setDragTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [showRevealToast, setShowRevealToast] = useState(false);
  const isDraggingRef = useRef(false);
  
  // Reveal education modal tracking per session
  const { shouldShowEducation, markEducationShown } = useRevealEducation(sessionCode);
  
  // Reveal button toast tracking per session
  const { shouldShowToast, markToastShown } = useRevealToast(sessionCode);
  
  // Use event-driven session for participant tracking (replaces old presence system)
  const {
    participantsForDisplay,
    currentUser,
    participantCount,
    isConnected,
    onViewReveal,
    canReveal
  } = useEventDrivenSession();
  
  // Refs for focus management
  const deckRef = useRef<HTMLButtonElement>(null);
  const stagingRef = useRef<HTMLDivElement>(null);
  const top3Ref = useRef<HTMLDivElement>(null);
  const lessImportantRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  const {
    deck,
    deckPosition,
    stagingCard,
    top3Pile,
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
    // ViewerSync reveal methods
    revealTop3,
    hideReveal,
    isRevealed: storeIsRevealed
  } = useSessionStep3Store();

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

  // Initialize Step 3 with transition animation from Step 2
  useEffect(() => {
    const initializeStep3 = async () => {
      await startTransition(
        step2Data.top8Pile, 
        step2Data.lessImportantPile.concat(step2Data.discardedPile), 
        step1Data.lessImportantPile
      );
      // Show modal after transition completes
      setTimeout(() => setShowModal(true), 200);
    };
    initializeStep3();
  // eslint-disable-next-line react-hooks/exhaustive-deps  
  }, []); // Run only once on mount - intentionally omitting dependencies

  const remainingCards = deck.length - deckPosition;
  const canProceed = remainingCards === 0 && !stagingCard && top3Pile.length === 3;
  const totalSortedCards = top3Pile.length + lessImportantPile.length;

  // Show celebration when exactly 3 cards are selected
  useEffect(() => {
    if (top3Pile.length === 3 && remainingCards === 0 && !stagingCard) {
      setShowCelebration(true);
      // Auto-hide celebration after 3 seconds with proper cleanup
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowCelebration(false);
    }
  }, [top3Pile.length, remainingCards, stagingCard]);

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

  // Handle deck click - flip next card
  const handleDeckClick = () => {
    flipNextCard();
    // Focus management - focus staging area after flipping
    setTimeout(() => {
      stagingRef.current?.focus();
    }, 300); // Match card flip animation timing
  };

  // Handle pile title clicks - move staging card to pile
  const handleTop3Click = () => {
    if (stagingCard) {
      if (top3Pile.length >= 3) {
        triggerEnhancedBounceAnimation();
        // Enhanced screen reader announcement for final step
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'assertive');
        announcement.textContent = 'Top 3 pile is full! This is your final selection - remove a card to add another.';
        announcement.className = 'sr-only';
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 5000);
        return;
      }
      moveCardToPile(stagingCard.id, 'top3');
      // Focus the target pile
      setTimeout(() => {
        top3Ref.current?.focus();
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

  // Enhanced bounce animation for final step overflow
  const triggerEnhancedBounceAnimation = useCallback(() => {
    setBounceAnimation(true);
    showOverflowWarningMessage();
    setTimeout(() => {
      setBounceAnimation(false);
    }, 400); // Match spec: 400ms elastic bounce
  }, [showOverflowWarningMessage]);

  // Debounced card movement for better performance
  const debouncedMoveCardToPile = useMemo(
    () => debounce((cardId: string, pile: 'top3' | 'less') => {
      moveCardToPile(cardId, pile);
    }, 200),
    [moveCardToPile]
  );
  
  const debouncedMoveCardBetweenPiles = useMemo(
    () => debounce((cardId: string, fromPile: 'top3' | 'less', toPile: 'top3' | 'less') => {
      moveCardBetweenPiles(cardId, fromPile, toPile);
    }, 200),
    [moveCardBetweenPiles]
  );

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const cardId = active.id as string;
    setDraggedCardId(cardId);
    isDraggingRef.current = true;

    // Find the active card for DragOverlay
    let card = null;
    if (stagingCard?.id === cardId) {
      card = stagingCard;
    } else {
      card = [...top3Pile, ...lessImportantPile].find(c => c.id === cardId);
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
  }, [stagingCard, top3Pile, lessImportantPile, clearDragState]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    clearDragState();

    if (!over) return;

    const activeCard = active.data.current?.card;
    const overData = over.data.current;

    if (!activeCard || !overData) return;

    // Moving from staging to pile
    if (activeCard.pile === 'staging' && overData.type === 'pile') {
      const targetPile = overData.pile as 'top3' | 'less';
      // Check for overflow and trigger enhanced bounce for Top 3
      if (targetPile === 'top3' && top3Pile.length >= 3) {
        triggerEnhancedBounceAnimation();
        return;
      }
      debouncedMoveCardToPile(activeCard.id, targetPile);
      
      // Success haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
    }
    
    // Moving between piles
    if ((activeCard.pile === 'top3' || activeCard.pile === 'less') && overData.type === 'pile') {
      const fromPile = activeCard.pile as 'top3' | 'less';
      const toPile = overData.pile as 'top3' | 'less';
      if (fromPile !== toPile) {
        // Check for overflow when moving TO Top 3 pile
        if (toPile === 'top3' && top3Pile.length >= 3) {
          triggerEnhancedBounceAnimation();
          return;
        }
        debouncedMoveCardBetweenPiles(activeCard.id, fromPile, toPile);
        
        // Success haptic feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 50, 50]);
        }
      }
    }
  }, [top3Pile.length, debouncedMoveCardToPile, debouncedMoveCardBetweenPiles, triggerEnhancedBounceAnimation, clearDragState]);

  // Handle drag cancellation
  const handleDragCancel = useCallback(() => {
    clearDragState();
  }, [clearDragState]);

  const handleCompleteExercise = useCallback(() => {
    if (onStepComplete) {
      onStepComplete();
    } else {
      console.log('Exercise completed!');
      alert('Congratulations! You have identified your top 3 leadership values!');
    }
  }, [onStepComplete]);

  const handleReveal = useCallback(async () => {
    console.log('🔥 [Step3] handleReveal Button clicked! Current state:', {
      storeIsRevealed,
      top3PileLength: top3Pile.length,
      shouldShowEducation,
      revealTop3Available: !!revealTop3,
      hideRevealAvailable: !!hideReveal
    });
    
    if (storeIsRevealed) {
      console.log('🔄 [Step3] handleReveal Unrevealing...');
      await hideReveal();
      console.log('✅ [Step3] handleReveal Top 3 unrevealed via ViewerSync');
    } else {
      // Show education modal on first reveal attempt
      if (shouldShowEducation) {
        console.log('📚 [Step3] handleReveal Showing education modal...');
        setShowEducationModal(true);
        return;
      }
      
      console.log('🎉 [Step3] handleReveal Revealing...');
      await revealTop3();
      console.log('✅ [Step3] handleReveal Top 3 revealed via ViewerSync');
    }
  }, [storeIsRevealed, hideReveal, revealTop3, top3Pile.length, shouldShowEducation]);

  // Handle education modal actions
  const handleEducationContinue = useCallback(async () => {
    setShowEducationModal(false);
    markEducationShown();
    // Now proceed with the actual reveal via ViewerSync
    console.log('🎓 [Step3] Education modal continue - revealing Top 3 via ViewerSync');
    await revealTop3();
    console.log('✅ [Step3] Top 3 revealed after education modal via ViewerSync');
  }, [markEducationShown, revealTop3]);

  const handleEducationCancel = useCallback(() => {
    setShowEducationModal(false);
    // Don't mark as shown, so they see the modal again next time
  }, []);

  // Handle reveal toast dismiss
  const handleToastDismiss = useCallback(() => {
    setShowRevealToast(false);
  }, []);

  // Detect first-time reveal button availability
  const prevCanReveal = useRef(false);
  
  useEffect(() => {
    const currentCanReveal = canReveal('top3', top3Pile.length);
    
    // Show toast on first transition from false -> true
    if (!prevCanReveal.current && currentCanReveal && shouldShowToast('step3')) {
      setShowRevealToast(true);
      markToastShown('step3');
      console.log('🎯 [Step3Page] Showing reveal button toast - 3 cards reached');
    }
    
    prevCanReveal.current = currentCanReveal;
  }, [top3Pile.length, canReveal, shouldShowToast, markToastShown]);

  // Calculate toast position relative to header
  const toastPosition = useMemo(() => {
    if (!headerRef.current) {
      return { top: '5rem', right: '1rem' }; // Fallback position
    }
    
    const headerRect = headerRef.current.getBoundingClientRect();
    return {
      top: `${headerRect.bottom + 12}px`,
      left: '12rem' // Align with Reveal button left edge
    };
  }, [showRevealToast]); // Recalculate when toast shows

  // Participants modal handlers
  const handleShowParticipants = useCallback(() => {
    setShowParticipants(true);
  }, []);

  const handleCloseParticipants = useCallback(() => {
    setShowParticipants(false);
  }, []);

  // Get validation message based on current state
  const getValidationMessage = () => {
    if (top3Pile.length < 3) {
      return `Select ${3 - top3Pile.length} more card${3 - top3Pile.length === 1 ? '' : 's'} for your Top 3`;
    }
    if (remainingCards > 0) {
      return `Sort ${remainingCards} remaining card${remainingCards === 1 ? '' : 's'}`;
    }
    if (stagingCard) {
      return 'Sort the current card before completing the exercise';
    }
    return '';
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100"
      role="main"
      aria-label="Step 3: Select Your Top 3 Leadership Values"
    >
      {/* Header */}
      <SessionHeader
        ref={headerRef}
        sessionCode={sessionCode}
        participantName={participantName}
        currentStep={3}
        totalSteps={3}
        participantCount={participantCount}
        onStepClick={() => setShowModal(true)}
        onReveal={handleReveal}
        isRevealed={storeIsRevealed}
        showRevealButton={canReveal('top3', top3Pile.length) || storeIsRevealed}
        onParticipantsClick={handleShowParticipants}
      />
      
      {/* Reveal button toast notification */}
      <RevealButtonToast
        isVisible={showRevealToast}
        step="step3"
        onDismiss={handleToastDismiss}
        position={toastPosition}
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
              Preparing Final Step...
            </motion.div>
            <motion.div
              className="flex items-center gap-4 text-gray-600"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <span>Preparing your Top 8 cards...</span>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Celebration overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            className="fixed inset-0 z-20 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-8 py-4 rounded-2xl shadow-2xl"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              transition={{ type: "spring", damping: 15 }}
            >
              <div className="text-center">
                <div className="text-2xl font-bold mb-2">🎉 Excellent!</div>
                <div className="text-lg">You&apos;ve identified your top 3 leadership values!</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <DragErrorBoundary
        onError={(error, errorInfo) => {
          console.error('Step 3 drag error:', error, errorInfo);
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
            id="step3-announcements"
          >
            {stagingCard && `Current card: ${stagingCard.value_name.replace(/_/g, ' ')}`}
            {canProceed && "Ready to complete exercise - exactly 3 cards selected and deck is empty"}
          </div>

          {/* Top section - Drop zones side by side */}
          <div 
            className="grid grid-cols-2 gap-8 mb-8"
            role="region"
            aria-label="Final card sorting piles"
          >
            <DroppableZone
              id="top3-pile"
              title="Top 3 Most Important"
              subtitle={
                <span className={cn(
                  "transition-colors duration-200",
                  top3Pile.length === 3 ? "font-bold text-green-600" : ""
                )}>
                  ({top3Pile.length}/3)
                </span>
              }
              cards={top3Pile}
              onCardClick={handleCardClick}
              onTitleClick={handleTop3Click}
              className={cn(
                "h-[28rem] transition-all duration-300",
                // Premium styling for Top 3 pile
                "ring-2 ring-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50",
                // Enhanced states
                top3Pile.length === 3 && !showOverflowWarning && "ring-4 ring-green-400 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg shadow-green-200/50",
                showOverflowWarning && "ring-4 ring-red-500 bg-gradient-to-br from-red-50 to-pink-50 shadow-lg shadow-red-200/50 border-red-500",
                // Glow effects
                top3Pile.length === 3 && "drop-shadow-lg",
                showOverflowWarning && "drop-shadow-lg",
                // Invalid drop zone feedback when dragging and pile is full
                draggedCardId && top3Pile.length >= 3 && "opacity-60 ring-4 ring-red-300 pointer-events-none"
              )}
              data-pile="top3"
              ref={top3Ref}
              tabIndex={0}
              role="group"
              aria-label={`Top 3 most important values pile, contains ${top3Pile.length} of 3 cards. This is your final selection.`}
              aria-describedby="top3-description"
            />
            <div id="top3-description" className="sr-only">
              Drop zone for your 3 most important leadership values. This is your final selection. Maximum 3 cards allowed.
            </div>
            
            <DroppableZone
              id="less-important"
              title="Less Important"
              subtitle={`(${lessImportantPile.length} cards)`}
              cards={lessImportantPile}
              onCardClick={handleCardClick}
              onTitleClick={handleLessImportantClick}
              className="h-[28rem] ring-1 ring-gray-300 bg-gradient-to-br from-gray-50 to-slate-50"
              data-pile="less"
              ref={lessImportantRef}
              tabIndex={0}
              role="group"
              aria-label={`Less important values pile, contains ${lessImportantPile.length} cards`}
              aria-describedby="less-important-description"
            />
            <div id="less-important-description" className="sr-only">
              Drop zone for values that are less important to your final leadership priorities.
            </div>
          </div>

          {/* Enhanced overflow warning message */}
          <AnimatePresence>
            {showOverflowWarning && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="mb-4 mx-auto"
              >
                <div className="bg-red-100 border-2 border-red-400 text-red-700 px-6 py-4 rounded-lg flex items-center gap-3 max-w-lg shadow-lg">
                  <svg className="w-6 h-6 flex-shrink-0 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <div className="font-bold text-lg">Top 3 is complete!</div>
                    <div className="text-base">This is your final selection - remove a card to add another</div>
                  </div>
                  <button
                    onClick={hideOverflowWarningMessage}
                    className="text-red-500 hover:text-red-700 ml-2 text-xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom section - Deck and staging side by side with fixed positions */}
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
                aria-label={`Card deck with ${remainingCards} cards remaining from your Top 8. Click to flip next card.`}
                aria-describedby="deck-instructions"
              />
              <div id="deck-instructions" className="sr-only">
                Click the deck to flip cards from your Top 8 selection. Sort them into your final Top 3.
              </div>
            </div>
            
            {/* Staging area - enhanced bounce animation */}
            <motion.div 
              className="w-64 h-40"
              animate={bounceAnimation ? {
                x: [0, -20, 15, -10, 6, -2, 0],
                y: [0, -12, 8, -5, 3, -1, 0],
                rotate: [0, -3, 2, -1.5, 0.8, 0, 0],
                scale: [1, 1.08, 0.96, 1.04, 0.98, 1, 1]
              } : {}}
              transition={{
                duration: 0.4,
                ease: [0.68, -0.55, 0.265, 1.55] // Enhanced elastic ease
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
                    ? `Current card: ${stagingCard.value_name.replace(/_/g, ' ')}. Drag to sort into your final piles.`
                    : "Staging area - empty. Click deck to flip next card."
                }
                aria-describedby="staging-instructions"
              />
              <div id="staging-instructions" className="sr-only">
                Cards appear here when flipped from the deck. Drag cards to your Top 3 or Less Important piles.
              </div>
            </motion.div>
          </div>

          {/* Controls section */}
          <div className="flex flex-col items-center gap-6 relative">
            {/* Discard pile (bottom-right) - Combined from all previous steps */}
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
              <div>Top 3: {top3Pile.length}/3 • Cards sorted: {totalSortedCards} / {deck.length}</div>
              {stagingCard && (
                <div className="text-amber-600 font-medium mt-1">
                  Sort the &quot;{stagingCard.value_name.replace(/_/g, ' ')}&quot; card
                </div>
              )}
              {getValidationMessage() && (
                <div className="text-amber-600 font-medium mt-1">
                  {getValidationMessage()}
                </div>
              )}
              {canProceed && (
                <div className="text-green-600 font-bold mt-2 text-base">
                  🎉 Ready to complete your leadership values exercise!
                </div>
              )}
              
              {/* Event system status - always connected */}
              {isConnected && participantCount > 1 && (
                <div className="text-green-600 text-xs mt-1">
                  ✓ Connected with {participantCount - 1} other participant{participantCount === 2 ? '' : 's'}
                </div>
              )}
            </div>

            {/* Action buttons - Enhanced for final step */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex gap-4 flex-wrap justify-center"
            >
              <Button
                onClick={handleCompleteExercise}
                className={cn(
                  "px-8 py-3 font-semibold rounded-xl shadow-lg transition-all transform",
                  canProceed 
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-xl hover:scale-105 ring-2 ring-green-300" 
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                )}
                disabled={!canProceed}
              >
                {canProceed ? "Complete Exercise 🎉" : "Complete Exercise ➜"}
              </Button>
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
                pile={activeCard.pile === 'top3' ? 'more' : (activeCard.pile === 'staging' ? 'staging' : 'less')}
              />
            </motion.div>
          ) : null}
        </DragOverlay>
        </DndContext>
      </DragErrorBoundary>

      {/* Game Steps Modal */}
      <Step3Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        top3Count={top3Pile.length}
        lessImportantCount={lessImportantPile.length}
        cardsInDeck={remainingCards}
        totalCards={deck.length}
        discardedCount={discardedPile.length}
      />

      {/* Participants modal */}
      <ParticipantsModal
        isOpen={showParticipants}
        onClose={handleCloseParticipants}
        participants={participantsForDisplay}
        currentUserId={currentUser?.participantId || ''}
        sessionCode={sessionCode}
        onViewReveal={onViewReveal}
      />

      {/* Reveal education modal */}
      <RevealEducationModal
        isOpen={showEducationModal}
        step="top3"
        onContinue={handleEducationContinue}
        onCancel={handleEducationCancel}
      />
    </div>
  );
}