'use client';

import { useEffect, useState } from 'react';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
      >
        <div className="container mx-auto px-4 pt-20 pb-8 min-h-screen flex flex-col">
          {/* Top section - Drop zones side by side */}
          <div className="grid grid-cols-2 gap-8 mb-8">
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