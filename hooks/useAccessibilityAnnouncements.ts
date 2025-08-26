'use client';

import { useRef, useCallback, useEffect } from 'react';
import { PileType, GameStep, ValidationResult } from '@/lib/constraints/types';

interface AnnouncementOptions {
  polite?: boolean;
  delay?: number;
}

export function useAccessibilityAnnouncements() {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const lastAnnouncementRef = useRef<string>('');
  const announcementTimeoutRef = useRef<NodeJS.Timeout>();

  // Create live region if it doesn't exist
  useEffect(() => {
    if (!liveRegionRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.setAttribute('class', 'sr-only absolute -top-full -left-full w-1 h-1 overflow-hidden');
      liveRegion.setAttribute('data-testid', 'accessibility-announcements');
      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    }

    return () => {
      // Cleanup on unmount
      if (liveRegionRef.current && document.body.contains(liveRegionRef.current)) {
        document.body.removeChild(liveRegionRef.current);
      }
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);

  // Make announcement to screen readers
  const announce = useCallback((message: string, options: AnnouncementOptions = {}) => {
    if (!liveRegionRef.current || !message.trim()) return;

    // Avoid duplicate announcements
    if (message === lastAnnouncementRef.current) return;

    const { polite = true, delay = 100 } = options;

    // Clear any pending announcement
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }

    // Update aria-live attribute based on urgency
    liveRegionRef.current.setAttribute('aria-live', polite ? 'polite' : 'assertive');

    // Make announcement with optional delay
    announcementTimeoutRef.current = setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = message;
        lastAnnouncementRef.current = message;
        
        // Clear the announcement after a delay so it can be repeated if needed
        setTimeout(() => {
          if (liveRegionRef.current) {
            liveRegionRef.current.textContent = '';
          }
        }, 1000);
      }
    }, delay);
  }, []);

  // Announce constraint violations
  const announceConstraintViolation = useCallback((
    pile: PileType,
    reason: string,
    severity: 'error' | 'warning' = 'error'
  ) => {
    const pileNames = {
      deck: 'deck',
      staging: 'staging area',
      more: 'more important pile',
      less: 'less important pile', 
      top8: 'top 8 pile',
      top3: 'top 3 pile',
      discard: 'discard pile'
    };

    const message = `${severity === 'error' ? 'Error' : 'Warning'}: ${reason} in ${pileNames[pile]}.`;
    announce(message, { polite: severity === 'warning' });
  }, [announce]);

  // Announce pile state changes
  const announcePileUpdate = useCallback((
    pile: PileType,
    count: number,
    action: 'added' | 'removed' | 'moved'
  ) => {
    const pileNames = {
      deck: 'deck',
      staging: 'staging area',
      more: 'more important pile',
      less: 'less important pile',
      top8: 'top 8 pile', 
      top3: 'top 3 pile',
      discard: 'discard pile'
    };

    let message = '';
    switch (action) {
      case 'added':
        message = `Card added to ${pileNames[pile]}. Now has ${count} card${count !== 1 ? 's' : ''}.`;
        break;
      case 'removed':
        message = `Card removed from ${pileNames[pile]}. Now has ${count} card${count !== 1 ? 's' : ''}.`;
        break;
      case 'moved':
        message = `Card moved. ${pileNames[pile]} now has ${count} card${count !== 1 ? 's' : ''}.`;
        break;
    }

    announce(message);
  }, [announce]);

  // Announce step progression
  const announceStepTransition = useCallback((
    fromStep: GameStep,
    toStep: GameStep,
    isAllowed: boolean,
    reason?: string
  ) => {
    if (isAllowed) {
      const stepNames = {
        step1: 'Step 1: Initial Sort',
        step2: 'Step 2: Top 8 Selection', 
        step3: 'Step 3: Final Top 3'
      };
      announce(`Progressing to ${stepNames[toStep]}.`);
    } else {
      announce(`Cannot progress to next step. ${reason || 'Requirements not met.'}`);
    }
  }, [announce]);

  // Announce validation results
  const announceValidationResult = useCallback((
    result: ValidationResult,
    context?: string
  ) => {
    if (!result.message) return;

    const prefix = context ? `${context}: ` : '';
    const message = `${prefix}${result.message}`;
    
    announce(message, { 
      polite: result.severity !== 'error'
    });
  }, [announce]);

  // Announce drag and drop actions
  const announceDragAction = useCallback((
    action: 'start' | 'end' | 'cancel',
    cardName?: string,
    sourcePile?: PileType,
    targetPile?: PileType
  ) => {
    const pileNames = {
      deck: 'deck',
      staging: 'staging area',
      more: 'more important pile',
      less: 'less important pile',
      top8: 'top 8 pile',
      top3: 'top 3 pile',
      discard: 'discard pile'
    };

    let message = '';
    switch (action) {
      case 'start':
        message = `Started dragging ${cardName || 'card'}${sourcePile ? ` from ${pileNames[sourcePile]}` : ''}.`;
        break;
      case 'end':
        if (targetPile && sourcePile) {
          message = `Moved ${cardName || 'card'} from ${pileNames[sourcePile]} to ${pileNames[targetPile]}.`;
        } else {
          message = `Finished moving ${cardName || 'card'}.`;
        }
        break;
      case 'cancel':
        message = `Cancelled moving ${cardName || 'card'}.`;
        break;
    }

    announce(message);
  }, [announce]);

  // Announce game completion
  const announceGameCompletion = useCallback((
    topCards: string[],
    step: GameStep
  ) => {
    const stepNames = {
      step1: 'initial sorting',
      step2: 'top 8 selection',
      step3: 'final top 3 selection'
    };

    const message = `Completed ${stepNames[step]}. Selected values: ${topCards.join(', ')}.`;
    announce(message);
  }, [announce]);

  return {
    announce,
    announceConstraintViolation,
    announcePileUpdate,
    announceStepTransition,
    announceValidationResult,
    announceDragAction,
    announceGameCompletion
  };
}

/**
 * Hook for focus management during constraint violations
 */
export function useConstraintFocusManagement() {
  const focusPile = useCallback((pile: PileType, reason?: string) => {
    const selectors = {
      deck: '[data-testid="deck"], .deck',
      staging: '[data-testid="staging-area"], .staging-area',
      more: '[data-testid="more-important-pile"], [data-pile="more"]',
      less: '[data-testid="less-important-pile"], [data-pile="less"]',
      top8: '[data-testid="top8-pile"], [data-pile="top8"]', 
      top3: '[data-testid="top3-pile"], [data-pile="top3"]',
      discard: '[data-testid="discard-pile"], [data-pile="discard"]'
    };

    const element = document.querySelector(selectors[pile]) as HTMLElement;
    if (element && element.focus) {
      element.focus();
      
      // Add temporary focus ring for visual indication
      element.style.outline = '3px solid #3b82f6';
      element.style.outlineOffset = '2px';
      
      setTimeout(() => {
        element.style.outline = '';
        element.style.outlineOffset = '';
      }, 2000);
    }
  }, []);

  const focusNextAction = useCallback((message?: string) => {
    // Focus the next logical element (continue button, deck, etc.)
    const continueButton = document.querySelector('button[data-testid*="continue"], button:contains("Continue")') as HTMLElement;
    const deckButton = document.querySelector('[data-testid="deck"] button, .deck button') as HTMLElement;
    
    const targetElement = continueButton || deckButton;
    if (targetElement && targetElement.focus) {
      targetElement.focus();
    }
  }, []);

  return {
    focusPile,
    focusNextAction
  };
}