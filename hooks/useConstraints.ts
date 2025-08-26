'use client';

import { useMemo, useCallback, useRef } from 'react';
import { constraintValidator } from '@/lib/constraints/validator';
import { 
  GameStep, 
  PileType, 
  ValidationResult, 
  PileState, 
  ConstraintCheckContext 
} from '@/lib/constraints/types';
import { PERFORMANCE_LIMITS } from '@/lib/constraints/rules';
import { Card } from '@/lib/types/card';

interface UseConstraintsProps {
  step: GameStep;
  pileCounts: Record<PileType, number>;
  onValidationError?: (result: ValidationResult) => void;
  onConstraintViolation?: (pile: PileType, violation: string) => void;
}

export function useConstraints({
  step,
  pileCounts,
  onValidationError,
  onConstraintViolation
}: UseConstraintsProps) {
  const lastValidationTime = useRef<number>(0);
  const validationCache = useRef<Map<string, ValidationResult>>(new Map());

  // Memoized pile states for performance
  const pileStates = useMemo(() => {
    return constraintValidator.batchValidatePiles(step, pileCounts);
  }, [step, pileCounts]);

  // Debounced validation to prevent excessive calls
  const validateMove = useCallback((
    targetPile: PileType,
    cardCount: number,
    sourcePile?: PileType,
    isProgression = false
  ): ValidationResult => {
    const now = performance.now();
    
    // Create cache key for memoization
    const cacheKey = `${step}-${sourcePile}-${targetPile}-${cardCount}-${isProgression}-${JSON.stringify(pileCounts)}`;
    
    // Check cache first
    if (validationCache.current.has(cacheKey) && 
        (now - lastValidationTime.current) < PERFORMANCE_LIMITS.debounceDelay) {
      return validationCache.current.get(cacheKey)!;
    }

    const context: ConstraintCheckContext = {
      step,
      sourcePile,
      targetPile,
      cardCount,
      allPileCounts: pileCounts,
      isProgression
    };

    const result = constraintValidator.validateMove(context);

    // Cache result
    validationCache.current.set(cacheKey, result);
    lastValidationTime.current = now;

    // Clean up old cache entries
    if (validationCache.current.size > 100) {
      const keys = Array.from(validationCache.current.keys());
      for (let i = 0; i < 50; i++) {
        validationCache.current.delete(keys[i]);
      }
    }

    // Trigger callbacks
    if (!result.valid) {
      onValidationError?.(result);
      onConstraintViolation?.(targetPile, result.reason || 'Unknown constraint violation');
    }

    return result;
  }, [step, pileCounts, onValidationError, onConstraintViolation]);

  // Check if a card move is valid
  const isValidMove = useCallback((
    targetPile: PileType,
    cardCount: number,
    sourcePile?: PileType
  ): boolean => {
    const result = validateMove(targetPile, cardCount, sourcePile);
    return result.valid;
  }, [validateMove]);

  // Check if step progression is allowed
  const canProgressToNextStep = useCallback((): ValidationResult => {
    return constraintValidator.validateMove({
      step,
      targetPile: 'deck', // Dummy pile for progression check
      cardCount: 0,
      allPileCounts: pileCounts,
      isProgression: true
    });
  }, [step, pileCounts]);

  // Get formatted counter display for a pile
  const getCounterDisplay = useCallback((pile: PileType): string => {
    const count = pileCounts[pile] || 0;
    return constraintValidator.getCounterDisplay(step, pile, count);
  }, [step, pileCounts]);

  // Check if drop zone should be disabled
  const isDropZoneDisabled = useCallback((pile: PileType): boolean => {
    const count = pileCounts[pile] || 0;
    return constraintValidator.isDropZoneDisabled(step, pile, count);
  }, [step, pileCounts]);

  // Get pile state for UI feedback
  const getPileState = useCallback((pile: PileType): PileState => {
    return pileStates[pile] || {
      pile,
      count: 0,
      isValid: true,
      isApproaching: false,
      isAtLimit: false,
      isOverLimit: false,
      visualState: 'default'
    };
  }, [pileStates]);

  // Batch validation for multiple moves (e.g., drag preview)
  const batchValidateMoves = useCallback((
    moves: Array<{ targetPile: PileType; cardCount: number; sourcePile?: PileType }>
  ): ValidationResult[] => {
    return moves.map(move => validateMove(move.targetPile, move.cardCount, move.sourcePile));
  }, [validateMove]);

  // Get all invalid piles for current state
  const getInvalidPiles = useCallback((): PileType[] => {
    return Object.entries(pileStates)
      .filter(([_, state]) => !state.isValid)
      .map(([pile]) => pile as PileType);
  }, [pileStates]);

  // Get constraint summary for current step
  const getConstraintSummary = useCallback(() => {
    const summary = {
      step,
      totalPiles: Object.keys(pileCounts).length,
      validPiles: 0,
      warningPiles: 0,
      errorPiles: 0,
      canProgress: false
    };

    Object.values(pileStates).forEach(state => {
      if (state.isValid) {
        if (state.visualState === 'warning') summary.warningPiles++;
        else summary.validPiles++;
      } else {
        summary.errorPiles++;
      }
    });

    summary.canProgress = canProgressToNextStep().valid;
    
    return summary;
  }, [step, pileCounts, pileStates, canProgressToNextStep]);

  // Clear validation cache (useful for testing)
  const clearValidationCache = useCallback(() => {
    validationCache.current.clear();
    lastValidationTime.current = 0;
  }, []);

  return {
    // Validation methods
    validateMove,
    isValidMove,
    canProgressToNextStep,
    batchValidateMoves,

    // State accessors
    pileStates,
    getPileState,
    getCounterDisplay,
    isDropZoneDisabled,
    getInvalidPiles,
    getConstraintSummary,

    // Utilities
    clearValidationCache
  };
}

/**
 * Lightweight hook for just checking pile states without validation logic
 */
export function usePileStates(step: GameStep, pileCounts: Record<PileType, number>) {
  return useMemo(() => {
    return constraintValidator.batchValidatePiles(step, pileCounts);
  }, [step, pileCounts]);
}

/**
 * Hook for constraint feedback management
 */
export function useConstraintFeedback() {
  const violations = useRef<Map<string, { message: string; timestamp: number }>>(new Map());

  const recordViolation = useCallback((pile: PileType, message: string) => {
    const key = `${pile}-${message}`;
    violations.current.set(key, { message, timestamp: Date.now() });
  }, []);

  const getRecentViolations = useCallback((maxAge = 5000): string[] => {
    const now = Date.now();
    const recent: string[] = [];

    violations.current.forEach((violation, key) => {
      if (now - violation.timestamp <= maxAge) {
        recent.push(violation.message);
      } else {
        violations.current.delete(key);
      }
    });

    return recent;
  }, []);

  const clearViolations = useCallback(() => {
    violations.current.clear();
  }, []);

  return {
    recordViolation,
    getRecentViolations,
    clearViolations
  };
}