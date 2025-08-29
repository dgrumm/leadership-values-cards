'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useRevealManager } from '@/hooks/reveal';

interface RevealButtonProps {
  sessionCode: string;
  participantId: string;
  revealType: 'top8' | 'top3';
  isRevealed?: boolean;
  disabled?: boolean;
  onRevealSuccess?: () => void;
  onRevealError?: (error: string) => void;
}

interface ConfirmationDialogProps {
  isOpen: boolean;
  revealType: 'top8' | 'top3';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ConfirmationDialog({ 
  isOpen, 
  revealType, 
  onConfirm, 
  onCancel, 
  isLoading 
}: ConfirmationDialogProps) {
  const countText = revealType === 'top8' ? '8' : '3';
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div 
              className="bg-white rounded-xl shadow-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="text-blue-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Share Your Top {countText} Values?
                  </h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  This will make your top {countText} leadership values visible to everyone in the session. 
                  Other participants will be able to view your arrangement and compare it with their own selections.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> You can continue rearranging your cards even after sharing. 
                    Your changes will be visible to viewers in real-time.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 pt-0 flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={onConfirm}
                  isLoading={isLoading}
                  loadingText="Sharing..."
                >
                  Share My Top {countText}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function RevealButton({
  sessionCode,
  participantId,
  revealType,
  isRevealed = false,
  disabled = false,
  onRevealSuccess,
  onRevealError
}: RevealButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { revealSelection, isRevealing, error, clearError } = useRevealManager(sessionCode, participantId);

  const handleClick = useCallback(() => {
    if (isRevealed) {
      return; // Already revealed, no action needed
    }
    
    clearError();
    setShowConfirmation(true);
  }, [isRevealed, clearError]);

  const handleConfirm = useCallback(async () => {
    const result = await revealSelection(revealType);
    
    if (result.success) {
      setShowConfirmation(false);
      onRevealSuccess?.();
    } else {
      onRevealError?.(result.error || 'Failed to reveal selection');
    }
  }, [revealSelection, revealType, onRevealSuccess, onRevealError]);

  const handleCancel = useCallback(() => {
    setShowConfirmation(false);
    clearError();
  }, [clearError]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={disabled || isRevealing}
        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 flex items-center space-x-1"
      >
        <span>{isRevealed ? 'Revealed' : 'Reveal'}</span>
        {isRevealed ? (
          <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </Button>

      <ConfirmationDialog
        isOpen={showConfirmation}
        revealType={revealType}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        isLoading={isRevealing}
      />

      {/* Error handling */}
      {error && (
        <div className="absolute top-full mt-2 left-0 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm z-10">
          {error}
        </div>
      )}
    </>
  );
}