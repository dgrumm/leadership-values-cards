'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParticipantList } from './ParticipantList';
import type { ParticipantDisplayData } from '@/lib/types/participant-display';

export interface ParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: Map<string, ParticipantDisplayData>; // NOW: Hybrid data with consistent identity/step
  currentUserId?: string; // DEPRECATED: ParticipantDisplayData includes isCurrentUser flag
  sessionCode?: string;
  onViewReveal?: (participantId: string, revealType: 'revealed-8' | 'revealed-3') => void;
}

export function ParticipantsModal({
  isOpen,
  onClose,
  participants,
  currentUserId,
  sessionCode,
  onViewReveal
}: ParticipantsModalProps) {
  // Close modal on escape key
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

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
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div 
              className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="text-blue-600">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Session Participants
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      See who&apos;s working on their values and view shared selections
                    </p>
                    {sessionCode && (
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        Session: <span className="font-semibold text-blue-600">{sessionCode}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close participants modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M6 18L18 6M6 6l12 12" 
                    />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <ParticipantList
                  participants={participants}
                  currentUserId={currentUserId}
                  onViewReveal={onViewReveal}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}