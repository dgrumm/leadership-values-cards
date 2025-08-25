'use client';

import { useEffect, useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, DragCancelEvent, DragOverlay } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { useStep1Store } from '@/state/local/step1-store';
import { Deck } from '@/components/cards/Deck';
import { StagingArea } from '@/components/cards/StagingArea';
import { DroppableZone } from '@/components/cards/DroppableZone';
import { DraggableCard } from '@/components/cards/DraggableCard';
import { Step1Modal } from '@/components/ui/Step1Modal';
import { Button } from '@/components/ui/Button';
import { SessionHeader } from '@/components/header/SessionHeader';
import { cn } from '@/lib/utils';

interface Step1PageProps {
  sessionCode: string;
  participantName: string;
  onStepComplete?: () => void;
}

export function Step1Page({ sessionCode, participantName, onStepComplete }: Step1PageProps) {
  const [showModal, setShowModal] = useState(true);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragTimeout, setDragTimeout] = useState<NodeJS.Timeout | null>(null);
  const [activeCard, setActiveCard] = useState<any>(null);
  
  const {
    deck,
    deckPosition,
    stagingCard,
    moreImportantPile,
    lessImportantPile,
    initializeDeck,
    flipNextCard,
    moveCardToPile,
    moveCardBetweenPiles,
  } = useStep1Store();

  // Initialize deck on mount
  useEffect(() => {
    initializeDeck();
  }, [initializeDeck]);

  // Clear drag state function
  const clearDragState = useCallback(() => {
    setDraggedCardId(null);
    setActiveCard(null);
    if (dragTimeout) {
      clearTimeout(dragTimeout);
      setDragTimeout(null);
    }
  }, [dragTimeout]);

  // Handle ESC key to cancel drag
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && draggedCardId) {
        clearDragState();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [draggedCardId, clearDragState]);

  // Handle window blur/focus events for drag recovery
  useEffect(() => {
    const handleWindowBlur = () => {
      if (draggedCardId) {
        clearDragState();
      }
    };

    const handleWindowFocus = () => {
      // Clear any stale drag state on focus
      clearDragState();
    };

    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [draggedCardId, clearDragState]);

  // Cleanup drag timeout on unmount
  useEffect(() => {
    return () => {
      if (dragTimeout) {
        clearTimeout(dragTimeout);
      }
    };
  }, [dragTimeout]);

  const remainingCards = deck.length - deckPosition;
  const canProceed = remainingCards === 0 && !stagingCard;
  const totalSortedCards = moreImportantPile.length + lessImportantPile.length;

  // Handle deck click - flip next card
  const handleDeckClick = () => {
    flipNextCard();
  };

  // Handle pile title clicks - move staging card to pile
  const handleMoreImportantClick = () => {
    if (stagingCard) {
      moveCardToPile(stagingCard.id, 'more');
    }
  };

  const handleLessImportantClick = () => {
    if (stagingCard) {
      moveCardToPile(stagingCard.id, 'less');
    }
  };

  // Handle card clicks in piles (for future pile-to-pile movement)
  const handleCardClick = (cardId: string) => {
    // This could be extended to allow moving cards between piles
    console.log('Card clicked:', cardId);
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const cardId = active.id as string;
    setDraggedCardId(cardId);
    
    // Find the active card for DragOverlay
    let card = null;
    if (stagingCard?.id === cardId) {
      card = stagingCard;
    } else {
      card = [...moreImportantPile, ...lessImportantPile].find(c => c.id === cardId);
    }
    
    setActiveCard(card);
    
    // Set timeout to auto-clear stalled drags
    const timeout = setTimeout(() => {
      clearDragState();
    }, 10000); // 10 second timeout
    
    setDragTimeout(timeout);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    clearDragState();

    if (!over) return;

    const activeCard = active.data.current?.card;
    const overData = over.data.current;

    if (!activeCard || !overData) return;

    try {
      // Moving from staging to pile
      if (activeCard.pile === 'staging' && overData.type === 'pile') {
        const targetPile = overData.pile as 'more' | 'less';
        moveCardToPile(activeCard.id, targetPile);
      }
      
      // Moving between piles
      if ((activeCard.pile === 'more' || activeCard.pile === 'less') && overData.type === 'pile') {
        const fromPile = activeCard.pile as 'more' | 'less';
        const toPile = overData.pile as 'more' | 'less';
        if (fromPile !== toPile) {
          moveCardBetweenPiles(activeCard.id, fromPile, toPile);
        }
      }
    } catch (error) {
      console.error('Error during drag operation:', error);
      // Could add user notification here
    }
  };

  const handleDragCancel = (event: DragCancelEvent) => {
    clearDragState();
  };

  const handleStep2Click = () => {
    if (onStepComplete) {
      onStepComplete();
    } else {
      console.log('Proceeding to Step 2...');
      alert('Step 2 navigation not configured');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100" data-testid="step1-page">
      {/* Header */}
      <SessionHeader
        sessionCode={sessionCode}
        participantName={participantName}
        currentStep={1}
        totalSteps={3}
        participantCount={1} // TODO: Get from real session state when collaboration is implemented
        onStepClick={() => setShowModal(true)}
      />

      {/* Main content */}
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="container mx-auto px-4 pt-20 pb-8 min-h-screen flex flex-col overflow-visible">
          {/* Top section - Drop zones side by side */}
          <div className="grid grid-cols-2 gap-8 mb-8 relative">
            <DroppableZone
              id="more-important"
              title="More Important"
              cards={moreImportantPile}
              onCardClick={handleCardClick}
              onTitleClick={handleMoreImportantClick}
              className="h-[28rem]"
            />
            
            <DroppableZone
              id="less-important"
              title="Less Important"
              cards={lessImportantPile}
              onCardClick={handleCardClick}
              onTitleClick={handleLessImportantClick}
              className="h-[28rem]"
            />
          </div>

          {/* Bottom section - Deck and staging side by side with fixed positions */}
          <div className="flex-1 flex items-center justify-center gap-8">
            {/* Deck - fixed size container */}
            <div className="w-56 h-40">
              <Deck
                cardCount={remainingCards}
                onClick={handleDeckClick}
                disabled={!!stagingCard}
                data-testid="deck"
              />
            </div>
            
            {/* Staging area - fixed size container with 3D flip animation */}
            <div className="w-56 h-40">
              <StagingArea
                card={stagingCard}
                isDragging={draggedCardId === stagingCard?.id}
              />
            </div>
          </div>

          {/* Controls section */}
          <div className="flex flex-col items-center gap-6">
            
            {/* Progress info */}
            <div className="text-center text-sm text-gray-600">
              <div>Cards sorted: {totalSortedCards} / {deck.length}</div>
              {stagingCard && (
                <div className="text-blue-600 font-medium mt-1">
                  Sort the "{stagingCard.value_name.replace(/_/g, ' ')}" card
                </div>
              )}
            </div>

            {/* Step 2 button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: canProceed ? 1 : 0,
                y: canProceed ? 0 : 20
              }}
              transition={{ duration: 0.3 }}
            >
              {canProceed && (
                <Button
                  onClick={handleStep2Click}
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-lg"
                  disabled={!canProceed}
                >
                  Step 2 ➜
                </Button>
              )}
            </motion.div>
          </div>
        </div>

        {/* Drag Overlay - This is the key fix for z-index issues */}
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
              }}
              className="relative"
            >
              <DraggableCard
                card={activeCard}
                isInStaging={false}
                pile={activeCard.pile}
              />
            </motion.div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Instructions modal */}
      <Step1Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        moreImportantCount={moreImportantPile.length}
        lessImportantCount={lessImportantPile.length}
        cardsRemaining={remainingCards}
        totalCards={deck.length}
      />
    </div>
  );
}