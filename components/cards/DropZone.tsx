'use client';

import { motion } from 'framer-motion';
import { useCallback, ReactNode } from 'react';
import { Card } from './Card';
import { DraggableCard } from './DraggableCard';
import { Card as CardType } from '@/lib/types/card';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  title: string;
  subtitle?: string | ReactNode;
  cards: CardType[];
  onCardClick?: (cardId: string) => void;
  onTitleClick?: () => void;
  isHovered?: boolean;
  className?: string;
  pile?: 'more' | 'less';
}

export function DropZone({ 
  title,
  subtitle, 
  cards, 
  onCardClick, 
  onTitleClick,
  isHovered = false,
  className,
  pile
}: DropZoneProps) {
  // Calculate card layout - arrange from top-left to right-down with scrolling support
  const getCardPosition = useCallback((index: number, containerWidth: number = 350) => {
    try {
      const cardWidth = 56 * 4 * 0.9; // w-56 * scale 0.9 in rem -> px  
      const cardHeight = 40 * 4 * 0.9; // h-40 * scale 0.9 in rem -> px
      const cardSpacing = 12; // spacing between cards
      const cardsPerRow = Math.floor((containerWidth - 32) / (cardWidth * 0.4 + cardSpacing)) || 1; // account for padding
      
      const row = Math.floor(index / cardsPerRow);
      const col = index % cardsPerRow;
      
      return {
        x: col * (cardWidth * 0.4 + cardSpacing),
        y: row * (cardHeight * 0.5 + 10),
        zIndex: index + 1
      };
    } catch (error) {
      console.warn('Error calculating card position:', error);
      return { x: 0, y: index * 20, zIndex: index + 1 }; // Fallback positioning
    }
  }, []);

  // Calculate total height needed for all cards
  const getTotalHeight = useCallback((cardCount: number, containerWidth: number = 350) => {
    try {
      if (cardCount === 0) return 0;
      const cardHeight = 40 * 4 * 0.9;
      const cardsPerRow = Math.floor((containerWidth - 32) / (56 * 4 * 0.9 * 0.4 + 12)) || 1;
      const rows = Math.ceil(cardCount / cardsPerRow);
      return rows * (cardHeight * 0.5 + 10) + cardHeight * 0.9; // add extra for last card
    } catch (error) {
      console.warn('Error calculating total height:', error);
      return cardCount * 100; // Fallback height calculation
    }
  }, []);
  
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Clickable title */}
      <motion.div
        className={cn(
          "text-center p-4 mb-4 rounded-xl border-2 cursor-pointer",
          "transition-all duration-200 select-none",
          isHovered 
            ? "border-blue-400 bg-blue-50 text-blue-700 shadow-lg" 
            : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100"
        )}
        onClick={onTitleClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <div className="text-sm opacity-75">
          {subtitle || `(${cards.length} card${cards.length !== 1 ? 's' : ''})`}
        </div>
        {isHovered && (
          <div className="text-xs mt-2 font-medium">
            Drop card here
          </div>
        )}
      </motion.div>
      
      {/* Drop zone area */}
      <motion.div
        className={cn(
          "flex-1 min-h-64 rounded-xl border-2 border-dashed transition-all duration-200",
          "flex flex-col items-center justify-center relative",
          isHovered 
            ? "border-blue-400 bg-blue-50" 
            : "border-gray-300 bg-gray-50"
        )}
        animate={{
          borderColor: isHovered ? "#60a5fa" : "#d1d5db",
          backgroundColor: isHovered ? "#eff6ff" : "#f9fafb"
        }}
      >
        {cards.length === 0 ? (
          <div 
            className="text-center text-gray-400"
            role="status"
            aria-label="Empty drop zone"
          >
            <div className="text-sm font-medium mb-1">Empty pile</div>
            <div className="text-xs">Drag cards here or click the title</div>
          </div>
        ) : (
          <div 
            className="relative w-full h-full overflow-y-auto overflow-x-hidden"
            role="group"
            aria-label={`${title} pile with ${cards.length} cards`}
          >
            {/* Cards arranged in grid layout from top-left */}
            <div 
              className="relative p-4" 
              style={{ minHeight: Math.max(getTotalHeight(cards.length), 200) }}
            >
              {cards.map((card, index) => {
                const position = getCardPosition(index);
                return (
                  <motion.div
                    key={card.id}
                    className="absolute"
                    style={{
                      left: `${position.x}px`,
                      top: `${position.y}px`,
                      zIndex: position.zIndex,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 0.9, opacity: 1 }}
                    transition={{ 
                      delay: index * 0.05, // Faster sequence for many cards
                      type: "spring", 
                      stiffness: 300, 
                      damping: 25 
                    }}
                    whileHover={{ scale: 0.95, zIndex: cards.length + 10 }}
                    onClick={() => onCardClick?.(card.id)}
                  >
                    <DraggableCard
                      card={card}
                      isInStaging={false}
                      pile={pile}
                    />
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}