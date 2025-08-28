'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface Step1ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  moreImportantCount?: number;
  lessImportantCount?: number;
  cardsRemaining?: number;
  totalCards?: number;
}

export function Step1Modal({ 
  isOpen, 
  onClose, 
  className,
  moreImportantCount = 0,
  lessImportantCount = 0,
  cardsRemaining = 0,
  totalCards = 40
}: Step1ModalProps) {
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
            <div className="h-full flex flex-col p-6">
              {/* Header with close button */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Flip & Sort
                </h2>
                <button 
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 p-1"
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
                  <span>Step 1 of 3</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: '33%'}}></div>
                </div>
              </div>
              
              {/* Instructions */}
              <div className="flex-1 space-y-4">
                <div className="text-sm text-gray-700 mb-4">
                  Flip cards one at a time and sort immediately.
                </div>
                
                <div className="text-sm text-gray-600">
                  <strong>Click the deck</strong> to flip a card, then drag it to &quot;Most Important&quot; or &quot;Less Important&quot;.
                </div>
                
                <div className="text-sm text-gray-600">
                  <strong>Target:</strong> {totalCards} cards total
                </div>
                
                <div className="text-sm text-gray-600">
                  <strong>Cards remaining:</strong> {cardsRemaining}
                </div>
                
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 text-sm text-blue-800">
                  <strong>Tip:</strong> Go with your gut instinct!
                </div>

                {/* Progress counts */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">More Important:</div>
                    <div className="font-semibold text-green-600">{moreImportantCount}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Less Important:</div>
                    <div className="font-semibold text-blue-600">{lessImportantCount}</div>
                  </div>
                </div>
              </div>
              
              {/* Action button */}
              <div className="mt-6">
                <Button
                  onClick={onClose}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Got it!
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}