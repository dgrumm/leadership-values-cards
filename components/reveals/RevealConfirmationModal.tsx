'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export interface RevealConfirmationModalProps {
  isOpen: boolean;
  step: 'top8' | 'top3';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  className?: string;
}

export function RevealConfirmationModal({
  isOpen,
  step,
  onConfirm,
  onCancel,
  isLoading = false,
  className
}: RevealConfirmationModalProps) {
  const stepLabel = step === 'top8' ? 'Top 8' : 'Top 3';

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
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
              "w-full max-w-md mx-4",
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
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-xl" aria-hidden="true">👁️</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Share your selection with the group?
                  </h2>
                  <p className="text-sm text-gray-600">
                    {stepLabel} Leadership Values
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-3 mb-6">
                <p className="text-sm text-gray-700">
                  This will make your <strong>{stepLabel}</strong> card arrangement visible to all other participants in the session.
                </p>
                
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <span className="text-blue-600 text-sm">ℹ️</span>
                    </div>
                    <div className="ml-2">
                      <p className="text-xs text-blue-800">
                        <strong>What gets shared:</strong> Your card arrangement, positions, and which values you've selected
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border-l-4 border-green-400 p-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <span className="text-green-600 text-sm">✨</span>
                    </div>
                    <div className="ml-2">
                      <p className="text-xs text-green-800">
                        <strong>Live updates:</strong> Others will see your changes as you continue to arrange your cards
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
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent" />
                      <span>Sharing...</span>
                    </div>
                  ) : (
                    'Share with Group'
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

RevealConfirmationModal.displayName = 'RevealConfirmationModal';