/**
 * Step Transition Manager - Orchestrates complex step transitions with choreographed animations
 * Handles the sequence from Step 1 → Step 2 → Review → Step 3
 */

'use client';

import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePileTransitionAnimation } from '../../hooks/useAnimations';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { animationController } from '../../lib/animations/utils';
import { buttonVariants, modalVariants } from '../../lib/animations/variants';

interface StepTransitionManagerProps {
  currentStep: number;
  onStepComplete: (step: number) => void;
  moreImportantCards: string[];
  top8Cards: string[];
  children: React.ReactNode;
}

export function StepTransitionManager({
  currentStep,
  onStepComplete,
  moreImportantCards,
  top8Cards,
  children,
}: StepTransitionManagerProps) {
  const [transitionInProgress, setTransitionInProgress] = useState(false);
  const [transitionStep, setTransitionStep] = useState<string>('');
  const prefersReduced = useReducedMotion();
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  const lessImportantPile = usePileTransitionAnimation('less-important');
  const moreImportantPile = usePileTransitionAnimation('more-important');
  const top8Pile = usePileTransitionAnimation('top-8');

  const clearTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current = [];
  }, []);

  const createDelayedAction = useCallback((action: () => void, delay: number) => {
    if (prefersReduced) {
      action();
      return;
    }
    
    const timeout = setTimeout(action, delay);
    timeoutRefs.current.push(timeout);
  }, [prefersReduced]);

  /**
   * Execute Step 1 → Step 2 transition sequence
   */
  const executeStep1To2Transition = useCallback(async () => {
    if (transitionInProgress) return;
    
    setTransitionInProgress(true);
    setTransitionStep('Preparing Step 2...');

    try {
      await animationController.executeAnimation(
        'step-1-to-2-transition',
        async () => {
          // 1. Fade out "Step 2" button (200ms)
          setTransitionStep('Organizing cards...');
          
          // 2. Less Important pile stacks and moves to discard (300ms + 500ms)
          await lessImportantPile.collectAndMove();
          
          // 3. More Important pile stacks and moves to deck position (300ms + 500ms)  
          createDelayedAction(async () => {
            setTransitionStep('Preparing new deck...');
            await moreImportantPile.collectAndMove();
          }, 200);
          
          // 4. Labels update with fade transition (200ms)
          createDelayedAction(() => {
            setTransitionStep('Setting up Step 2...');
          }, 1000);
          
          // 5. New step UI fades in (200ms)
          createDelayedAction(() => {
            setTransitionStep('');
            onStepComplete(2);
          }, 1200);
        },
        () => {
          // Fallback: immediately complete transition
          setTransitionStep('');
          onStepComplete(2);
        }
      );
    } catch (error) {
      console.error('Step 1→2 transition failed:', error);
      setTransitionStep('');
      onStepComplete(2);
    } finally {
      setTransitionInProgress(false);
      clearTimeouts();
    }
  }, [
    transitionInProgress,
    lessImportantPile,
    moreImportantPile,
    createDelayedAction,
    onStepComplete,
    clearTimeouts
  ]);

  /**
   * Execute Step 2 → Review transition sequence  
   */
  const executeStep2ToReviewTransition = useCallback(async () => {
    if (transitionInProgress) return;
    
    setTransitionInProgress(true);
    setTransitionStep('Entering Review Mode...');

    try {
      await animationController.executeAnimation(
        'step-2-to-review-transition',
        async () => {
          // 1. Less Important pile moves to discard (300ms)
          setTransitionStep('Moving discarded cards...');
          await lessImportantPile.collectAndMove();
          
          // 2. Top 8 pile frame begins expansion (100ms delay)
          createDelayedAction(async () => {
            setTransitionStep('Expanding review frame...');
            await top8Pile.redistribute();
          }, 100);
          
          // 3. Action buttons fade in (200ms)
          createDelayedAction(() => {
            setTransitionStep('');
            onStepComplete(2.5); // Review state
          }, 600);
        },
        () => {
          // Fallback: immediately complete transition
          setTransitionStep('');
          onStepComplete(2.5);
        }
      );
    } catch (error) {
      console.error('Step 2→Review transition failed:', error);
      setTransitionStep('');
      onStepComplete(2.5);
    } finally {
      setTransitionInProgress(false);
      clearTimeouts();
    }
  }, [
    transitionInProgress,
    lessImportantPile,
    top8Pile,
    createDelayedAction,
    onStepComplete,
    clearTimeouts
  ]);

  /**
   * Execute Review → Step 3 transition sequence
   */
  const executeReviewToStep3Transition = useCallback(async () => {
    if (transitionInProgress) return;
    
    setTransitionInProgress(true);
    setTransitionStep('Preparing Step 3...');

    try {
      await animationController.executeAnimation(
        'review-to-step-3-transition',
        async () => {
          // 1. Frame contracts back to normal size
          setTransitionStep('Collecting cards...');
          
          // 2. Cards collect and redistribute for Step 3
          await top8Pile.redistribute();
          
          // 3. New step UI appears
          createDelayedAction(() => {
            setTransitionStep('Setting up final selection...');
          }, 300);
          
          createDelayedAction(() => {
            setTransitionStep('');
            onStepComplete(3);
          }, 500);
        },
        () => {
          // Fallback: immediately complete transition
          setTransitionStep('');
          onStepComplete(3);
        }
      );
    } catch (error) {
      console.error('Review→Step 3 transition failed:', error);
      setTransitionStep('');
      onStepComplete(3);
    } finally {
      setTransitionInProgress(false);
      clearTimeouts();
    }
  }, [
    transitionInProgress,
    top8Pile,
    createDelayedAction,
    onStepComplete,
    clearTimeouts
  ]);

  /**
   * Cancel any running transition
   */
  const cancelTransition = useCallback(() => {
    animationController.cancelAnimation('step-1-to-2-transition');
    animationController.cancelAnimation('step-2-to-review-transition');
    animationController.cancelAnimation('review-to-step-3-transition');
    
    lessImportantPile.cancelTransition();
    moreImportantPile.cancelTransition();
    top8Pile.cancelTransition();
    
    clearTimeouts();
    setTransitionInProgress(false);
    setTransitionStep('');
  }, [lessImportantPile, moreImportantPile, top8Pile, clearTimeouts]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      cancelTransition();
    };
  }, [cancelTransition]);

  return (
    <div className="relative w-full h-full">
      {children}
      
      {/* Transition Progress Overlay */}
      <AnimatePresence>
        {transitionInProgress && (
          <motion.div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div
              className="bg-white rounded-lg p-6 shadow-xl max-w-sm mx-4"
              variants={modalVariants}
            >
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="text-gray-700 font-medium">
                  {transitionStep || 'Transitioning...'}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Step Transition Controls */}
      <div className="absolute bottom-6 right-6 space-y-2">
        {currentStep === 1 && (
          <motion.button
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            variants={buttonVariants}
            whileHover={!transitionInProgress ? "hover" : undefined}
            whileTap={!transitionInProgress ? "pressed" : undefined}
            onClick={executeStep1To2Transition}
            disabled={transitionInProgress || moreImportantCards.length === 0}
          >
            Continue to Step 2
          </motion.button>
        )}
        
        {currentStep === 2 && (
          <motion.button
            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            variants={buttonVariants}
            whileHover={!transitionInProgress ? "hover" : undefined}
            whileTap={!transitionInProgress ? "pressed" : undefined}
            onClick={executeStep2ToReviewTransition}
            disabled={transitionInProgress || top8Cards.length !== 8}
          >
            Review Top 8
          </motion.button>
        )}
        
        {currentStep === 2.5 && (
          <motion.button
            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            variants={buttonVariants}
            whileHover={!transitionInProgress ? "hover" : undefined}
            whileTap={!transitionInProgress ? "pressed" : undefined}
            onClick={executeReviewToStep3Transition}
            disabled={transitionInProgress}
          >
            Continue to Step 3
          </motion.button>
        )}
        
        {/* Emergency cancel button in dev mode */}
        {process.env.NODE_ENV === 'development' && transitionInProgress && (
          <motion.button
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
            onClick={cancelTransition}
          >
            Cancel Transition
          </motion.button>
        )}
      </div>
    </div>
  );
}