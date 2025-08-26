/**
 * Constraint rules configuration for each game step
 */

import { ConstraintConfig } from './types';

export const PILE_CONSTRAINTS: ConstraintConfig = {
  step1: {
    more: { min: 0, max: Infinity },
    less: { min: 0, max: Infinity },
    staging: { max: 1 },
    deck: { mustBeEmpty: false }, // Cards remaining allowed in Step 1
  },
  step2: {
    top8: { exact: 8 },
    less: { min: 0, max: Infinity },
    staging: { max: 1 },
    deck: { mustBeEmpty: false }, // Cards remaining allowed in Step 2
  },
  step3: {
    top3: { exact: 3 },
    less: { min: 0, max: Infinity },
    staging: { max: 1 },
    deck: { mustBeEmpty: false }, // Cards remaining allowed in Step 3
  },
};

/**
 * Progressive constraint enforcement rules
 * Determines when to start enforcing strict limits
 */
export const PROGRESSIVE_ENFORCEMENT = {
  step1: {
    // Step 1 is lenient - focus on learning mechanics
    enforceStrictLimits: false,
    showWarnings: true,
  },
  step2: {
    // Step 2 introduces strict limits with helpful guidance
    enforceStrictLimits: true,
    showWarnings: true,
    warningThreshold: 7, // Warn when approaching 8-card limit
  },
  step3: {
    // Step 3 reinforces importance with enhanced feedback
    enforceStrictLimits: true,
    showWarnings: true,
    warningThreshold: 2, // Warn when approaching 3-card limit
  },
};

/**
 * Constraint messages for different violation types
 */
export const CONSTRAINT_MESSAGES = {
  step1: {
    staging_overflow: "Sort the current card before flipping another",
    deck_not_empty: "Continue flipping and sorting cards",
  },
  step2: {
    top8_overflow: "Remove a card from Top 8 to add another",
    top8_approaching: "Top 8 pile is almost full (7/8)",
    top8_exact_required: "Select exactly 8 cards to continue",
    staging_overflow: "Sort the current card before flipping another",
    deck_not_empty: "Flip and sort all remaining cards first",
  },
  step3: {
    top3_overflow: "Remove a card from Top 3 to add another", 
    top3_approaching: "Top 3 pile is almost full (2/3)",
    top3_exact_required: "Select exactly 3 cards to continue",
    staging_overflow: "Sort the current card before flipping another",
    deck_not_empty: "Flip and sort all remaining cards first",
  },
};

/**
 * Message display durations (in milliseconds)
 */
export const MESSAGE_DURATIONS = {
  error: 3000,
  warning: 3000,
  info: 2000,
  success: 2000,
} as const;

/**
 * Performance optimization thresholds
 */
export const PERFORMANCE_LIMITS = {
  maxValidationTime: 20, // milliseconds - sub-frame for 60fps
  debounceDelay: 50, // milliseconds for rapid validation checks
  throttleDelay: 16, // milliseconds for visual feedback updates (~60fps)
} as const;