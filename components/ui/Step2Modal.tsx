'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Loading } from './Loading';
import { cn } from '@/lib/utils';

interface Step2ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  // Dynamic state props
  top8Count?: number;
  lessImportantCount?: number;
  cardsInDeck?: number;
  totalCards?: number;
  // Loading states
  isLoading?: boolean;
  loadingText?: string;
}

export function Step2Modal({ 
  isOpen, 
  onClose, 
  className,
  top8Count = 0,
  lessImportantCount = 0,
  cardsInDeck = 0,
  totalCards = 0,
  isLoading = false,
  loadingText = "Loading..."
}: Step2ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal - Right side panel */}
          <motion.div
            className={cn(
              "fixed right-0 top-0 bottom-0 z-50 w-96 bg-white shadow-2xl",
              className
            )}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="h-full flex flex-col p-6 relative">
              {/* Loading overlay */}
              {isLoading && (
                <motion.div
                  className="absolute inset-0 bg-white/90 flex items-center justify-center z-10 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="text-center">
                    <Loading size="lg" text={loadingText} />
                  </div>
                </motion.div>
              )}

              {/* Header with close button */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Select Top 8
                </h2>
                <button 
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  disabled={isLoading}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress indicator */}
              <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <span className="text-blue-600">⏱</span>
                  <span>Step 2 of 3</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: '67%'}}></div>
                </div>
              </div>
              
              {/* Instructions */}
              <div className={cn(
                "flex-1 space-y-4 transition-opacity",
                isLoading && "opacity-50 pointer-events-none"
              )}>
                <div className="text-sm text-gray-700 mb-4">
                  Now narrow down to your <strong>Top 8 most important</strong> leadership values.
                </div>
                
                <div className="text-sm text-gray-600">
                  <strong>Click the deck</strong> to flip cards from your &quot;More Important&quot; pile, then sort them into two new piles.
                </div>
                
                <div className="text-sm text-gray-600">
                  <strong>Strict limit:</strong> Exactly 8 cards in your Top 8 pile
                </div>

                <div className="text-sm text-gray-600">
                  You can move cards between piles at any time to refine your selection.
                </div>
                
                <div className="bg-amber-50 border-l-4 border-amber-400 p-3 text-sm text-amber-800">
                  <strong>Goal:</strong> Choose the 8 values that matter most to your leadership style
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 text-sm text-blue-800">
                  <strong>Tip:</strong> Consider which values you couldn&apos;t lead without
                </div>

                {/* Dynamic progress counts */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Top 8 Most Important:</div>
                    <div className={cn(
                      "font-semibold",
                      top8Count === 8 ? "text-green-600" : "text-gray-900"
                    )}>
                      {top8Count}/8
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Less Important:</div>
                    <div className="font-semibold">{lessImportantCount}</div>
                  </div>
                </div>
                
                {/* Deck status */}
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="text-gray-500 mb-1">Cards remaining in deck:</div>
                  <div className="font-semibold text-gray-900">
                    {cardsInDeck} of {totalCards}
                  </div>
                  {cardsInDeck === 0 && (
                    <div className="text-green-600 text-xs mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      All cards sorted!
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action button */}
              <div className="mt-6">
                <Button
                  onClick={onClose}
                  disabled={isLoading}
                  className={cn(
                    "w-full transition-all",
                    isLoading 
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                  data-testid="step2-modal-got-it-button"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loading size="sm" />
                      <span>Please wait...</span>
                    </div>
                  ) : (
                    "Got it"
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}