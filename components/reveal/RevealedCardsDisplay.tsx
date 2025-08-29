'use client';

import React from 'react';
import { Card } from '@/components/cards/Card';
import { Card as CardType } from '@/lib/types/card';

export interface RevealedCardsDisplayProps {
  cards: CardType[];
  revealType: 'top8' | 'top3';
  participantName?: string;
  isReadOnly?: boolean;
  className?: string;
}

export function RevealedCardsDisplay({ 
  cards, 
  revealType,
  participantName,
  isReadOnly = true,
  className 
}: RevealedCardsDisplayProps) {
  const expectedCount = revealType === 'top8' ? 8 : 3;
  const gridCols = revealType === 'top8' ? 'grid-cols-4' : 'grid-cols-3';

  if (!cards || cards.length === 0) {
    return (
      <div className={`revealed-cards-display ${className || ''}`}>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p className="text-lg font-medium">No cards revealed</p>
            <p className="text-sm mt-1">
              {participantName} hasn't shared their {revealType} selection yet.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (cards.length !== expectedCount) {
    return (
      <div className={`revealed-cards-display ${className || ''}`}>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-lg font-medium">Incomplete Selection</p>
            <p className="text-sm mt-1">
              Expected {expectedCount} cards, but found {cards.length}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`revealed-cards-display p-6 ${className || ''}`}>
      <div className={`grid ${gridCols} gap-6 max-w-6xl mx-auto`}>
        {cards.map((card, index) => (
          <div key={`${card.id}-${index}`} className="flex justify-center">
            <Card
              card={card}
              isFlipped={true}
              className={
                isReadOnly 
                  ? "cursor-default hover:shadow-lg hover:transform-none opacity-90" 
                  : undefined
              }
              aria-label={
                isReadOnly 
                  ? `${card.value_name.replace(/_/g, ' ')} - read-only view`
                  : `${card.value_name.replace(/_/g, ' ')} card`
              }
            />
          </div>
        ))}
      </div>

      {isReadOnly && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg text-blue-700 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L12 12m6.121-6.121A10.05 10.05 0 0121 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043.932M9.878 9.878L3 3m3.59 3.59l6.288 6.288" />
            </svg>
            Read-only view
          </div>
        </div>
      )}
    </div>
  );
}