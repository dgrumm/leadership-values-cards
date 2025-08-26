/**
 * Constraint validation system exports
 * Centralized access to all constraint-related functionality
 */

// Core types
export type {
  GameStep,
  PileType,
  PileConstraint,
  StepConstraints,
  ConstraintConfig,
  ValidationResult,
  ConstraintViolation,
  PileState,
  ConstraintCheckContext
} from './types';

// Validation system
export { ConstraintValidator, constraintValidator } from './validator';

// Configuration
export {
  PILE_CONSTRAINTS,
  PROGRESSIVE_ENFORCEMENT,
  CONSTRAINT_MESSAGES,
  MESSAGE_DURATIONS,
  PERFORMANCE_LIMITS
} from './rules';

// Utility functions for common constraint operations
export function createConstraintContext(
  step: import('./types').GameStep,
  targetPile: import('./types').PileType,
  cardCount: number,
  allPileCounts: Record<import('./types').PileType, number>,
  options: {
    sourcePile?: import('./types').PileType;
    isProgression?: boolean;
  } = {}
): import('./types').ConstraintCheckContext {
  return {
    step,
    targetPile,
    cardCount,
    allPileCounts,
    ...options
  };
}

// Quick validation helpers
export function isValidCardMove(
  step: import('./types').GameStep,
  targetPile: import('./types').PileType,
  currentCount: number
): boolean {
  const pileCounts = {
    deck: 0,
    staging: targetPile === 'staging' ? currentCount : 0,
    more: targetPile === 'more' ? currentCount : 0,
    less: targetPile === 'less' ? currentCount : 0,
    top8: targetPile === 'top8' ? currentCount : 0,
    top3: targetPile === 'top3' ? currentCount : 0,
    discard: 0
  };

  const context = createConstraintContext(step, targetPile, currentCount, pileCounts);
  return constraintValidator.validateMove(context).valid;
}

export function getMaxCardsForPile(
  step: import('./types').GameStep,
  pile: import('./types').PileType
): number | 'unlimited' {
  const constraints = PILE_CONSTRAINTS[step];
  const constraint = constraints[pile];
  
  if (!constraint) return 'unlimited';
  if (constraint.exact !== undefined) return constraint.exact;
  if (constraint.max !== undefined && constraint.max !== Infinity) return constraint.max;
  return 'unlimited';
}

export function getMinCardsForPile(
  step: import('./types').GameStep,
  pile: import('./types').PileType
): number {
  const constraints = PILE_CONSTRAINTS[step];
  const constraint = constraints[pile];
  
  if (!constraint) return 0;
  if (constraint.exact !== undefined) return constraint.exact;
  if (constraint.min !== undefined) return constraint.min;
  return 0;
}

// Constraint validation shortcuts for common cases
export const ConstraintValidation = {
  // Check if adding one card to a pile would be valid
  canAddCardToPile: (step: import('./types').GameStep, pile: import('./types').PileType, currentCount: number) => {
    return isValidCardMove(step, pile, currentCount + 1);
  },

  // Check if removing one card from a pile would be valid
  canRemoveCardFromPile: (step: import('./types').GameStep, pile: import('./types').PileType, currentCount: number) => {
    if (currentCount <= 0) return false;
    return isValidCardMove(step, pile, currentCount - 1);
  },

  // Get formatted constraint description for UI
  getConstraintDescription: (step: import('./types').GameStep, pile: import('./types').PileType): string => {
    const max = getMaxCardsForPile(step, pile);
    const min = getMinCardsForPile(step, pile);
    
    if (max === min && max !== 'unlimited') {
      return `Exactly ${max} cards required`;
    } else if (max !== 'unlimited' && min > 0) {
      return `${min}-${max} cards allowed`;
    } else if (max !== 'unlimited') {
      return `Maximum ${max} cards`;
    } else if (min > 0) {
      return `Minimum ${min} cards`;
    } else {
      return 'No limit';
    }
  },

  // Check if step progression is possible
  canProgressStep: (step: import('./types').GameStep, allPileCounts: Record<import('./types').PileType, number>): boolean => {
    const context = createConstraintContext(step, 'deck', 0, allPileCounts, { isProgression: true });
    return constraintValidator.validateMove(context).valid;
  }
};