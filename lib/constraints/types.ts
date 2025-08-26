/**
 * Type definitions for constraint validation system
 */

export type GameStep = 'step1' | 'step2' | 'step3';
export type PileType = 'deck' | 'staging' | 'more' | 'less' | 'top8' | 'top3' | 'discard';

export interface PileConstraint {
  min?: number;
  max?: number;
  exact?: number;
  mustBeEmpty?: boolean;
}

export interface StepConstraints {
  [key: string]: PileConstraint;
}

export interface ConstraintConfig {
  step1: StepConstraints;
  step2: StepConstraints;
  step3: StepConstraints;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  severity: 'error' | 'warning' | 'info';
  action?: 'bounce' | 'disable' | 'warn';
  message?: string;
}

export interface ConstraintViolation {
  pile: PileType;
  currentCount: number;
  constraint: PileConstraint;
  violationType: 'overflow' | 'underflow' | 'exact_mismatch' | 'not_empty';
  message: string;
  severity: 'error' | 'warning';
}

export interface PileState {
  pile: PileType;
  count: number;
  isValid: boolean;
  isApproaching: boolean;
  isAtLimit: boolean;
  isOverLimit: boolean;
  visualState: 'default' | 'valid' | 'warning' | 'error' | 'disabled';
}

export interface ConstraintCheckContext {
  step: GameStep;
  sourcePile?: PileType;
  targetPile: PileType;
  cardCount: number;
  allPileCounts: Record<PileType, number>;
  isProgression?: boolean;
}