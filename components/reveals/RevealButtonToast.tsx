'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { Info, X } from 'lucide-react';

export interface RevealButtonToastProps {
  isVisible: boolean;
  step: 'step2' | 'step3';
  onDismiss: () => void;
  position?: {
    top?: string;
    left?: string;
    right?: string;
  };
  className?: string;
}

export function RevealButtonToast({
  isVisible,
  step,
  onDismiss,
  position,
  className
}: RevealButtonToastProps) {
  const [isDismissed, setIsDismissed] = React.useState(false);
  
  const stepLabel = step === 'step2' ? 'Top 8' : 'Top 3';
  const cardCount = step === 'step2' ? 8 : 3;

  const message = `You can now share your ${stepLabel} selection with the group!`;

  // Handle manual dismiss
  const handleDismiss = React.useCallback(() => {
    if (!isDismissed) {
      setIsDismissed(true);
      onDismiss();
    }
  }, [isDismissed, onDismiss]);

  // Reset dismissed state when visibility changes
  React.useEffect(() => {
    if (isVisible) {
      setIsDismissed(false);
    }
  }, [isVisible]);

  // Auto-dismiss timer (4 seconds for info-type toasts)
  React.useEffect(() => {
    if (!isVisible || isDismissed) return;

    const timer = setTimeout(() => {
      handleDismiss();
    }, 4000);

    return () => clearTimeout(timer);
  }, [isVisible, isDismissed, handleDismiss]);

  // Animation variants for smooth tooltip-style appearance
  const toastVariants = {
    hidden: { 
      opacity: 0, 
      y: -10, 
      scale: 0.95,
      transition: { duration: 0.2 }
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring", 
        stiffness: 400, 
        damping: 25,
        duration: 0.3 
      }
    },
    exit: { 
      opacity: 0, 
      y: -10, 
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  // Default positioning (top-center fallback)
  const defaultPosition = {
    top: '4rem',
    left: '50%',
    transform: 'translateX(-50%)'
  };

  const finalPosition = position ? { ...position } : defaultPosition;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={toastVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            "absolute z-50 max-w-sm p-3 pointer-events-auto",
            "bg-blue-50 border-l-4 border-blue-500 shadow-lg rounded-lg",
            "text-blue-800",
            className
          )}
          style={finalPosition}
          role="alert"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              <Info className="w-4 h-4 text-blue-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-5">
                {message}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {cardCount} cards in Most Important pile
              </p>
            </div>
            
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 rounded-full hover:bg-blue-200/50 transition-colors duration-150"
              aria-label="Dismiss notification"
            >
              <X className="w-3 h-3 text-blue-600" />
            </button>
          </div>

          {/* Progress bar for auto-dismiss countdown */}
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-blue-600 opacity-30 rounded-bl-lg"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 4, ease: "linear" }}
          />

          {/* Tooltip arrow pointing up toward reveal button */}
          <div className="absolute -top-2 left-6 w-4 h-4 bg-blue-50 border-l-4 border-t-4 border-blue-500 transform rotate-45 -translate-x-2" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

RevealButtonToast.displayName = 'RevealButtonToast';