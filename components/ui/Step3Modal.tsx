'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { Loading } from './Loading';
import { cn } from '@/lib/utils';

interface Step3ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  // Dynamic state props
  top3Count?: number;
  lessImportantCount?: number;
  cardsInDeck?: number;
  totalCards?: number;
  discardedCount?: number;
  // Loading states
  isLoading?: boolean;
  loadingText?: string;
}

export function Step3Modal({ 
  isOpen, 
  onClose, 
  className,
  top3Count = 0,
  lessImportantCount = 0,
  cardsInDeck = 0,
  totalCards = 0,
  discardedCount = 0,
  isLoading = false,
  loadingText = "Loading..."
}: Step3ModalProps) {
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
              "fixed right-0 top-0 bottom-0 z-50 w-96 bg-gradient-to-b from-amber-50 to-orange-50 shadow-2xl border-l-4 border-amber-400",
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
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  🎯 Final Selection
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

              {/* Progress indicator - Final step */}
              <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <span className="text-amber-600">🏆</span>
                  <span>Step 3 of 3 - Final Step</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-amber-500 to-yellow-500 h-2 rounded-full shadow-sm" style={{width: '100%'}}></div>
                </div>
              </div>
              
              {/* Instructions */}
              <div className={cn(
                "flex-1 space-y-4 transition-opacity",
                isLoading && "opacity-50 pointer-events-none"
              )}>
                <div className="text-sm text-gray-700 mb-4">
                  Select your <strong className="text-amber-700">Top 3 most important</strong> leadership values from your Top 8.
                </div>
                
                <div className="text-sm text-gray-600">
                  <strong>This is your final selection</strong> - choose carefully. These 3 values will represent your core leadership priorities.
                </div>
                
                <div className="text-sm text-gray-600">
                  <strong>Click the deck</strong> to flip cards from your Top 8, then sort them into your final piles.
                </div>
                
                <div className="text-sm text-gray-600">
                  <strong>Strict limit:</strong> Exactly 3 cards in your Top 3 pile
                </div>

                <div className="text-sm text-gray-600">
                  You can move cards between piles at any time to refine your final selection.
                </div>
                
                <div className="bg-amber-100 border-l-4 border-amber-500 p-3 text-sm text-amber-900 rounded-r-lg">
                  <strong>Final Goal:</strong> Identify the 3 values that define your leadership identity
                </div>

                <div className="bg-orange-100 border-l-4 border-orange-500 p-3 text-sm text-orange-900 rounded-r-lg">
                  <strong>Consider:</strong> Which values are absolutely essential to who you are as a leader?
                </div>

                {/* Enhanced progress display with current game state */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-700 border-b pb-2">
                    Current Game State:
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/50 p-3 rounded-lg border">
                      <div className="text-gray-500 text-xs">Top 3 Most Important:</div>
                      <div className={cn(
                        "font-bold text-lg",
                        top3Count === 3 ? "text-green-600" : top3Count > 0 ? "text-amber-600" : "text-gray-400"
                      )}>
                        {top3Count}/3
                        {top3Count === 3 && <span className="ml-1">✓</span>}
                      </div>
                    </div>
                    
                    <div className="bg-white/50 p-3 rounded-lg border">
                      <div className="text-gray-500 text-xs">Less Important:</div>
                      <div className="font-bold text-lg text-gray-700">
                        {lessImportantCount}
                      </div>
                    </div>
                  </div>

                  {/* Deck status with enhanced styling for final step */}
                  <div className="bg-white/70 rounded-lg p-3 text-sm border-2 border-amber-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-gray-600 font-medium">Cards in deck:</div>
                      <div className={cn(
                        "font-bold text-lg",
                        cardsInDeck === 0 ? "text-green-600" : "text-amber-600"
                      )}>
                        {cardsInDeck} of {totalCards}
                      </div>
                    </div>
                    
                    {cardsInDeck === 0 ? (
                      <div className="text-green-600 text-xs flex items-center gap-1 bg-green-50 p-2 rounded">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        All cards sorted from your Top 8!
                      </div>
                    ) : (
                      <div className="text-amber-600 text-xs bg-amber-50 p-2 rounded">
                        Continue flipping cards from your Top 8 selection
                      </div>
                    )}
                  </div>

                  {/* Total discarded cards summary */}
                  <div className="bg-gray-100 rounded-lg p-3 text-sm">
                    <div className="text-gray-600 text-xs mb-1">Total discarded from all steps:</div>
                    <div className="font-semibold text-gray-700">
                      {discardedCount} cards
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      These represent values that are less central to your leadership style
                    </div>
                  </div>

                  {/* Completion status */}
                  {top3Count === 3 && cardsInDeck === 0 && (
                    <motion.div 
                      className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-400 rounded-lg p-4 text-center"
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", damping: 15 }}
                    >
                      <div className="text-green-700 font-bold text-sm flex items-center justify-center gap-2">
                        <span className="text-lg">🎉</span>
                        Ready to complete your exercise!
                      </div>
                      <div className="text-green-600 text-xs mt-1">
                        You have successfully identified your top 3 leadership values
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
              
              {/* Action button */}
              <div className="mt-6">
                <Button
                  onClick={onClose}
                  disabled={isLoading}
                  className={cn(
                    "w-full transition-all font-medium",
                    isLoading 
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg"
                  )}
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