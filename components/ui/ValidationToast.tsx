'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { MESSAGE_DURATIONS } from '@/lib/constraints/rules';

export type ToastType = 'error' | 'warning' | 'info' | 'success';

interface ValidationToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onDismiss: () => void;
  autoHide?: boolean;
  duration?: number;
  className?: string;
}

export function ValidationToast({
  message,
  type,
  isVisible,
  onDismiss,
  autoHide = true,
  duration,
  className
}: ValidationToastProps) {
  const [isHovered, setIsHovered] = useState(false);
  const toastDuration = duration || MESSAGE_DURATIONS[type];

  // Auto-hide timer
  useEffect(() => {
    if (!isVisible || !autoHide || isHovered) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, toastDuration);

    return () => clearTimeout(timer);
  }, [isVisible, autoHide, isHovered, toastDuration, onDismiss]);

  // Icon mapping
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  // Style mapping
  const getStyles = () => {
    const baseClasses = 'border-l-4 shadow-lg rounded-lg';
    
    switch (type) {
      case 'error':
        return cn(baseClasses, 'bg-red-50 border-red-500 text-red-800');
      case 'warning':
        return cn(baseClasses, 'bg-orange-50 border-orange-500 text-orange-800');
      case 'success':
        return cn(baseClasses, 'bg-green-50 border-green-500 text-green-800');
      default:
        return cn(baseClasses, 'bg-blue-50 border-blue-500 text-blue-800');
    }
  };

  // Animation variants
  const toastVariants = {
    hidden: { 
      opacity: 0, 
      y: -50, 
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
      y: -20, 
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={toastVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(
            "fixed top-4 right-4 z-50 max-w-md p-4 pointer-events-auto",
            getStyles(),
            className
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          role="alert"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-5">
                {message}
              </p>
            </div>
            
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors duration-150"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Progress bar for auto-hide */}
          {autoHide && !isHovered && (
            <motion.div
              className="absolute bottom-0 left-0 h-1 bg-current opacity-30 rounded-bl-lg"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: toastDuration / 1000, ease: "linear" }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Toast container component for managing multiple toasts
 */
export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ValidationToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  maxToasts?: number;
  className?: string;
}

export function ValidationToastContainer({
  toasts,
  onDismiss,
  maxToasts = 3,
  className
}: ValidationToastContainerProps) {
  // Limit number of visible toasts
  const visibleToasts = toasts.slice(-maxToasts);

  return (
    <div className={cn("fixed top-4 right-4 z-50 space-y-2", className)}>
      <AnimatePresence>
        {visibleToasts.map((toast, index) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ 
              opacity: 1, 
              x: 0,
              transition: { delay: index * 0.1 }
            }}
            exit={{ opacity: 0, x: 100 }}
            layout
          >
            <ValidationToast
              message={toast.message}
              type={toast.type}
              isVisible={true}
              onDismiss={() => onDismiss(toast.id)}
              duration={toast.duration}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}