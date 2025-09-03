'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/cards/Card';
import { cn } from '@/lib/utils/cn';
import { DEVELOPMENT_DECK } from '@/lib/generated/card-decks';
import type { ArrangementViewData } from '@/types/viewer';
import type { Card as CardType } from '@/lib/types/card';

interface ViewerArrangementProps {
  arrangement: ArrangementViewData;
  className?: string;
}

interface CardPosition {
  cardId: string;
  x: number;
  y: number;
  pile: string;
  card?: CardType;
  isHighlighted?: boolean;
}

export function ViewerArrangement({ arrangement, className }: ViewerArrangementProps) {
  const [cardPositions, setCardPositions] = useState<CardPosition[]>([]);
  const [highlightedCards, setHighlightedCards] = useState<Set<string>>(new Set());

  // Convert arrangement data to card positions
  useEffect(() => {
    const positions = arrangement.cardPositions.map(pos => ({
      ...pos,
      isHighlighted: highlightedCards.has(pos.cardId)
    }));
    setCardPositions(positions);
  }, [arrangement, highlightedCards]);

  // Handle arrangement updates with highlighting
  useEffect(() => {
    const newlyHighlighted = new Set<string>();
    
    // Highlight cards that were recently updated (within last 2 seconds)
    const recentUpdateThreshold = Date.now() - 2000;
    if (arrangement.lastUpdated > recentUpdateThreshold) {
      arrangement.cardPositions.forEach(pos => {
        newlyHighlighted.add(pos.cardId);
      });
    }

    if (newlyHighlighted.size > 0) {
      setHighlightedCards(newlyHighlighted);
      
      // Remove highlight after animation duration (300ms as per spec)
      const timer = setTimeout(() => {
        setHighlightedCards(new Set());
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [arrangement.lastUpdated, arrangement.cardPositions]);

  const revealTypeText = arrangement.revealType === 'top8' ? 'Top 8' : 'Top 3';
  const expectedCardCount = arrangement.revealType === 'top8' ? 8 : 3;

  // Group cards by pile for organized display
  const groupedCards = cardPositions.reduce((acc, position) => {
    if (!acc[position.pile]) {
      acc[position.pile] = [];
    }
    acc[position.pile].push(position);
    return acc;
  }, {} as Record<string, CardPosition[]>);

  return (
    <div className={cn(
      'relative w-full max-w-6xl mx-auto',
      'bg-white rounded-lg shadow-sm border border-gray-200',
      'p-8 min-h-[600px]',
      className
    )}>
      {/* Arrangement header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {revealTypeText} Leadership Values
        </h2>
        <p className="text-gray-600">
          {cardPositions.length} of {expectedCardCount} cards arranged
        </p>
      </div>

      {/* Cards display area */}
      <div className="relative w-full min-h-[400px] bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <AnimatePresence>
          {cardPositions.map((position) => (
            <motion.div
              key={position.cardId}
              className="absolute"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                x: position.x,
                y: position.y
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25,
                duration: 0.3 
              }}
            >
              {/* Highlight effect for recently moved cards */}
              {position.isHighlighted && (
                <motion.div
                  className="absolute inset-0 rounded-xl bg-blue-400 opacity-20 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}
              
              {/* Card component - read-only version with real data */}
              <div className="pointer-events-none select-none">
                <Card
                  card={(() => {
                    // Find real card data from development deck or create fallback
                    const deckCard = DEVELOPMENT_DECK.find(card => 
                      card.value_name.toLowerCase().replace(/\s+/g, '_') === position.cardId.toLowerCase()
                    );
                    
                    return {
                      id: position.cardId,
                      value_name: deckCard?.value_name || position.cardId.replace(/_/g, ' '),
                      description: deckCard?.description || 'Leadership value',
                      position: { x: position.x, y: position.y },
                      pile: position.pile as CardType['pile']
                    };
                  })()}
                  isFlipped={true}
                  className={cn(
                    'transition-all duration-300',
                    position.isHighlighted && 'ring-2 ring-blue-400 ring-opacity-50'
                  )}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {cardPositions.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-lg font-medium mb-2">No cards arranged yet</div>
              <div className="text-sm">The participant is still working on their selection</div>
            </div>
          </div>
        )}
      </div>

      {/* Arrangement metadata */}
      <div className="mt-6 flex justify-between items-center text-sm text-gray-500">
        <div>
          Pile distribution: {Object.keys(groupedCards).map(pile => 
            `${pile} (${groupedCards[pile].length})`
          ).join(', ') || 'None'}
        </div>
        <div>
          Last updated: {new Date(arrangement.lastUpdated).toLocaleString()}
        </div>
      </div>
    </div>
  );
}