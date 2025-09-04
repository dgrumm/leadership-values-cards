'use client';

import { Card } from '@/components/cards/Card';
import { Card as CardType } from '@/lib/types/card';
import { cn } from '@/lib/utils';

interface StaticCardGridProps {
  cards: Array<{
    id: string;
    value_name: string;
    description: string;
    position: { x: number; y: number };
    pile: string;
  }>;
  type: 'top8' | 'top3';
  readonly?: boolean;
  printOptimized?: boolean;
  className?: string;
}

export function StaticCardGrid({ 
  cards, 
  type, 
  readonly = true, 
  printOptimized = false,
  className 
}: StaticCardGridProps) {
  // Convert snapshot card data to Card type
  const cardItems: CardType[] = cards.map(card => ({
    id: card.id,
    value_name: card.value_name,
    description: card.description,
    position: card.position,
    pile: card.pile as any, // Type assertion for CardPile
    owner: undefined
  }));

  // Grid configuration based on type
  const gridConfig = {
    top8: {
      columns: 4,
      maxCards: 8,
      title: 'Top 8 Leadership Values'
    },
    top3: {
      columns: 3,
      maxCards: 3,
      title: 'Top 3 Leadership Values'
    }
  };

  const config = gridConfig[type];
  const displayCards = cardItems.slice(0, config.maxCards);

  return (
    <div className={cn(
      'static-card-grid w-full',
      printOptimized && 'print:p-8',
      className
    )}>
      {/* Grid title - only shown in print mode */}
      {printOptimized && (
        <div className="hidden print:block mb-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {config.title}
          </h2>
          <p className="text-gray-600">
            Generated on {new Date().toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Card grid */}
      <div 
        className={cn(
          'grid gap-6 justify-center',
          // Responsive grid columns based on type
          type === 'top8' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3',
          // Print optimization
          printOptimized && [
            'print:gap-4',
            type === 'top8' ? 'print:grid-cols-4' : 'print:grid-cols-3'
          ]
        )}
        style={{ 
          // Ensure grid fits on print page
          ...(printOptimized && { 
            maxWidth: '100%',
            margin: '0 auto' 
          })
        }}
      >
        {displayCards.map((card, index) => (
          <div
            key={card.id}
            className={cn(
              'flex justify-center',
              // Print optimization
              printOptimized && [
                'print:page-break-inside-avoid',
                'print:mb-0'
              ]
            )}
            data-testid={`static-card-${index}`}
          >
            <Card
              card={card}
              isFlipped={true}
              isInStaging={false}
              isDragging={false}
              className={cn(
                // Static styling - no hover effects
                readonly && [
                  'cursor-default',
                  'hover:transform-none',
                  'hover:shadow-none'
                ],
                // Print optimization
                printOptimized && [
                  'print:w-full',
                  'print:h-auto',
                  'print:min-h-[120px]',
                  'print:shadow-none',
                  'print:border-2',
                  'print:border-gray-400'
                ]
              )}
              // Disable interactions for readonly
              onClick={readonly ? undefined : () => {}}
              tabIndex={readonly ? -1 : 0}
              aria-label={readonly ? 
                `${card.value_name}: ${card.description}` : 
                undefined
              }
            />
          </div>
        ))}
      </div>

      {/* Empty state */}
      {displayCards.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Cards Available
          </h3>
          <p className="text-gray-500">
            This arrangement doesn't contain any cards to display.
          </p>
        </div>
      )}

      {/* Metadata for print */}
      {printOptimized && displayCards.length > 0 && (
        <div className="hidden print:block mt-8 pt-4 border-t border-gray-300 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>{displayCards.length} cards displayed</span>
            <span>Generated with Leadership Values Cards</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility function to calculate optimal card size based on count and container
export function calculateCardDimensions(cardCount: number, containerWidth: number) {
  const maxColumns = cardCount <= 3 ? 3 : 4;
  const columns = Math.min(cardCount, maxColumns);
  const gap = 24; // 1.5rem in pixels
  const padding = 32; // Container padding
  
  const availableWidth = containerWidth - (padding * 2) - (gap * (columns - 1));
  const cardWidth = Math.floor(availableWidth / columns);
  
  return {
    cardWidth: Math.min(cardWidth, 300), // Max card width
    columns,
    gap
  };
}