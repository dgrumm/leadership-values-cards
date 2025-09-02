'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export interface RevealEducationModalProps {
  isOpen: boolean;
  step: 'top8' | 'top3';
  onContinue: () => void;
  onCancel: () => void;
  className?: string;
}

export function RevealEducationModal({
  isOpen,
  step,
  onContinue,
  onCancel,
  className
}: RevealEducationModalProps) {
  const stepLabel = step === 'top8' ? 'Top 8' : 'Top 3';
  const stepDescription = step === 'top8' ? 'eight most important' : 'three most important';

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          />
          
          {/* Modal */}
          <motion.div
            className={cn(
              "fixed left-1/2 top-1/2 z-50",
              "w-full max-w-lg mx-4",
              "bg-white rounded-lg shadow-2xl",
              className
            )}
            initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-50%' }}
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl" aria-hidden="true">💡</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    About Revealing Your {stepLabel}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Let others see your {stepDescription} leadership values
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-4 mb-6">
                <p className="text-gray-700">
                  When you reveal your selection, <strong>other participants will be able to see the cards you've placed in your Most Important pile</strong>.
                </p>

                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-lg">👥</span>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800 mb-1">
                        What others will see
                      </h4>
                      <p className="text-sm text-blue-700">
                        Your {stepDescription} values, their arrangement, and any changes you make while revealed
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <span className="text-green-600 text-lg">🔄</span>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-green-800 mb-1">
                        You're in control
                      </h4>
                      <p className="text-sm text-green-700">
                        You can toggle this on and off anytime using the Reveal button. Hide your selection whenever you want privacy.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <span className="text-amber-600 text-lg">✨</span>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-amber-800 mb-1">
                        Great for discussion
                      </h4>
                      <p className="text-sm text-amber-700">
                        Sharing your values helps facilitate meaningful conversations about leadership priorities and perspectives.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={onCancel}
                  variant="outline"
                  className="flex-1"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={onContinue}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Got it! Reveal My {stepLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

RevealEducationModal.displayName = 'RevealEducationModal';