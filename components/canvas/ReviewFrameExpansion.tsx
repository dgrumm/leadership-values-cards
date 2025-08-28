/**
 * Review Frame Expansion Component
 * Handles the animated expansion of the Top 8 cards frame during review state
 */

'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFrameExpansionAnimation } from '../../hooks/useAnimations';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { frameExpansionVariants, staggeredDistribution } from '../../lib/animations/variants';

interface ReviewFrameExpansionProps {
  isExpanded: boolean;
  cards: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
  onCardReorder?: (cardIds: string[]) => void;
  className?: string;
}

export function ReviewFrameExpansion({
  isExpanded,
  cards,
  className = '',
}: ReviewFrameExpansionProps) {
  const { controls, expandFrame, collapseFrame } = useFrameExpansionAnimation();
  const prefersReduced = useReducedMotion();
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle expansion state changes
  useEffect(() => {
    const performTransition = async () => {
      if (isAnimating) return;
      
      setIsAnimating(true);
      
      try {
        if (isExpanded) {
          await expandFrame();
        } else {
          await collapseFrame();
        }
      } finally {
        setIsAnimating(false);
      }
    };

    performTransition();
  }, [isExpanded, expandFrame, collapseFrame, isAnimating]);

  return (
    <motion.div
      className={`relative bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden ${className}`}
      animate={controls}
      variants={frameExpansionVariants}
      initial="collapsed"
      style={{
        transformOrigin: 'center center',
      }}
    >
      {/* Frame Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 border-b border-gray-200">
        <motion.h3
          className="text-lg font-semibold text-gray-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: isExpanded ? 0.3 : 0 }}
        >
          {isExpanded ? 'Review Your Top 8 Values' : 'Top 8 Cards'}
        </motion.h3>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.p
              className="text-sm text-gray-600 mt-1"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.4 }}
            >
              Review and rearrange your selected values before proceeding to the final step
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Cards Container */}
      <motion.div
        className="p-6 min-h-[300px]"
        variants={staggeredDistribution}
        animate={isExpanded ? "visible" : "hidden"}
      >
        <div 
          className={`grid gap-4 transition-all duration-500 ${
            isExpanded 
              ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
              : 'grid-cols-2'
          }`}
        >
          {cards.map((card, index) => (
            <CardInFrame
              key={card.id}
              card={card}
              index={index}
              isExpanded={isExpanded}
              isReduced={prefersReduced}
            />
          ))}
        </div>

        {/* Empty state when no cards */}
        {cards.length === 0 && (
          <motion.div
            className="flex items-center justify-center h-40 text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-center">
              <div className="text-4xl mb-2">📋</div>
              <p>No cards in Top 8 yet</p>
              <p className="text-sm">Drag cards here to review them</p>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Expansion Indicator */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="absolute top-4 right-4 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.5 }}
          >
            Review Mode
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading overlay during animation */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              <span className="text-sm">
                {isExpanded ? 'Expanding...' : 'Collapsing...'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Individual card component within the frame
 */
interface CardInFrameProps {
  card: {
    id: string;
    title: string;
    description?: string;
  };
  index: number;
  isExpanded: boolean;
  isReduced: boolean;
}

function CardInFrame({ card, index, isExpanded, isReduced }: CardInFrameProps) {
  return (
    <motion.div
      className={`bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-move ${
        isExpanded ? 'min-h-[120px]' : 'min-h-[80px]'
      }`}
      variants={{
        hidden: { 
          opacity: 0, 
          scale: 0.9, 
          y: 20 
        },
        visible: { 
          opacity: 1, 
          scale: 1, 
          y: 0,
          transition: {
            delay: isReduced ? 0 : index * 0.1,
            duration: isReduced ? 0 : 0.3,
          }
        }
      }}
      whileHover={!isReduced ? { 
        scale: 1.02, 
        y: -2,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      } : {}}
      whileDrag={!isReduced ? { 
        scale: 1.05, 
        rotate: 2,
        zIndex: 10 
      } : {}}
      drag={isExpanded}
      dragMomentum={false}
      dragElastic={0.1}
    >
      {/* Card Number */}
      <div className="flex items-start justify-between mb-2">
        <motion.div
          className="bg-blue-100 text-blue-700 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: isReduced ? 0 : index * 0.1 + 0.2 }}
        >
          {index + 1}
        </motion.div>
      </div>

      {/* Card Title */}
      <h4 className="font-medium text-gray-800 text-sm leading-tight">
        {card.title}
      </h4>

      {/* Card Description (only in expanded mode) */}
      <AnimatePresence>
        {isExpanded && card.description && (
          <motion.p
            className="text-xs text-gray-500 mt-2 leading-relaxed"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ delay: 0.1 }}
          >
            {card.description}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Drag Handle (only in expanded mode) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="absolute top-2 right-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}