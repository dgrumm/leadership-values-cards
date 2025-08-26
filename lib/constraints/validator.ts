/**
 * Centralized constraint validation system
 * Handles pile limits, validation rules, and constraint checking
 */

import { 
  GameStep, 
  PileType, 
  ValidationResult, 
  ConstraintViolation,
  PileState,
  ConstraintCheckContext 
} from './types';
import { 
  PILE_CONSTRAINTS, 
  PROGRESSIVE_ENFORCEMENT, 
  CONSTRAINT_MESSAGES,
  PERFORMANCE_LIMITS 
} from './rules';

export class ConstraintValidator {
  private validationStartTime = 0;

  /**
   * Main constraint validation method
   */
  validateMove(context: ConstraintCheckContext): ValidationResult {
    this.validationStartTime = performance.now();
    
    try {
      const { step, targetPile, cardCount, allPileCounts, isProgression } = context;
      const constraints = PILE_CONSTRAINTS[step];
      const pileConstraint = constraints[targetPile];

      if (!pileConstraint) {
        return this.createResult(false, 'Invalid target pile', 'error', 'bounce');
      }

      // Check staging area limit first (most common constraint)
      if (targetPile === 'staging') {
        return this.checkStagingLimit(step, cardCount);
      }

      // Check pile-specific constraints
      const pileResult = this.checkPileLimit(step, targetPile, cardCount, pileConstraint);
      if (!pileResult.valid) {
        return pileResult;
      }

      // Check step progression constraints
      if (isProgression) {
        return this.checkStepProgression(step, allPileCounts);
      }

      return this.createResult(true, undefined, 'info');
    } finally {
      this.trackPerformance();
    }
  }

  /**
   * Check staging area constraints (max 1 card)
   */
  private checkStagingLimit(step: GameStep, cardCount: number): ValidationResult {
    if (cardCount > 1) {
      const message = CONSTRAINT_MESSAGES[step].staging_overflow;
      return this.createResult(false, message, 'warning', 'bounce', message);
    }
    return this.createResult(true, undefined, 'info');
  }

  /**
   * Check pile-specific limits and constraints
   */
  private checkPileLimit(
    step: GameStep, 
    pile: PileType, 
    count: number, 
    constraint: import('./types').PileConstraint
  ): ValidationResult {
    const enforcement = PROGRESSIVE_ENFORCEMENT[step];

    // Check maximum limit
    if (constraint.max && count > constraint.max) {
      if (enforcement.enforceStrictLimits) {
        const message = this.getPileOverflowMessage(step, pile);
        return this.createResult(false, message, 'error', 'bounce', message);
      } else {
        // Lenient mode - just warn
        return this.createResult(true, `Approaching limit (${count}/${constraint.max})`, 'warning');
      }
    }

    // Check exact requirement
    if (constraint.exact && count > constraint.exact) {
      const message = this.getPileOverflowMessage(step, pile);
      return this.createResult(false, message, 'error', 'bounce', message);
    }

    // Check approaching limits (warning state)
    if (constraint.max && enforcement.warningThreshold) {
      if (count >= enforcement.warningThreshold && count < constraint.max) {
        const message = this.getApproachingLimitMessage(step, pile, count, constraint.max);
        return this.createResult(true, message, 'warning', 'warn', message);
      }
    }

    return this.createResult(true, undefined, 'info');
  }

  /**
   * Check step progression requirements
   */
  private checkStepProgression(step: GameStep, pileCounts: Record<PileType, number>): ValidationResult {
    const constraints = PILE_CONSTRAINTS[step];
    const violations: ConstraintViolation[] = [];

    // Check all pile constraints for progression
    for (const [pile, constraint] of Object.entries(constraints)) {
      const count = pileCounts[pile as PileType] || 0;
      
      // Check exact requirements
      if (constraint.exact && count !== constraint.exact) {
        violations.push({
          pile: pile as PileType,
          currentCount: count,
          constraint,
          violationType: 'exact_mismatch',
          message: `${pile} must have exactly ${constraint.exact} cards (has ${count})`,
          severity: 'error'
        });
      }

      // Check minimum requirements
      if (constraint.min && count < constraint.min) {
        violations.push({
          pile: pile as PileType,
          currentCount: count,
          constraint,
          violationType: 'underflow', 
          message: `${pile} needs at least ${constraint.min} cards (has ${count})`,
          severity: 'error'
        });
      }

      // Check must be empty requirements
      if (constraint.mustBeEmpty && count > 0) {
        violations.push({
          pile: pile as PileType,
          currentCount: count,
          constraint,
          violationType: 'not_empty',
          message: `${pile} must be empty to continue (has ${count} cards)`,
          severity: 'error'
        });
      }
    }

    if (violations.length > 0) {
      const primaryViolation = violations[0];
      return this.createResult(
        false, 
        primaryViolation.message, 
        primaryViolation.severity, 
        'disable', 
        primaryViolation.message
      );
    }

    return this.createResult(true, undefined, 'info');
  }

  /**
   * Get pile state for visual feedback
   */
  getPileState(step: GameStep, pile: PileType, count: number): PileState {
    const constraints = PILE_CONSTRAINTS[step];
    const constraint = constraints[pile];
    const enforcement = PROGRESSIVE_ENFORCEMENT[step];

    if (!constraint) {
      return {
        pile,
        count,
        isValid: true,
        isApproaching: false,
        isAtLimit: false,
        isOverLimit: false,
        visualState: 'default'
      };
    }

    const isOverLimit = (constraint.max && count > constraint.max) || 
                       (constraint.exact && count > constraint.exact);
    const isAtLimit = (constraint.max && count === constraint.max) ||
                     (constraint.exact && count === constraint.exact);
    const isApproaching = enforcement.warningThreshold && 
                         count >= enforcement.warningThreshold && 
                         !isAtLimit && !isOverLimit;

    let visualState: PileState['visualState'] = 'default';
    if (isOverLimit) visualState = 'error';
    else if (isAtLimit) visualState = constraint.exact ? 'valid' : 'warning';
    else if (isApproaching) visualState = 'warning';

    return {
      pile,
      count,
      isValid: !isOverLimit,
      isApproaching: !!isApproaching,
      isAtLimit: !!isAtLimit,
      isOverLimit: !!isOverLimit,
      visualState
    };
  }

  /**
   * Get formatted counter display
   */
  getCounterDisplay(step: GameStep, pile: PileType, count: number): string {
    const constraint = PILE_CONSTRAINTS[step][pile];
    if (!constraint) return count.toString();

    if (constraint.exact) {
      return `${count}/${constraint.exact}`;
    } else if (constraint.max && constraint.max !== Infinity) {
      return `${count}/${constraint.max}`;
    }

    return count.toString();
  }

  /**
   * Check if drop zone should be disabled
   */
  isDropZoneDisabled(step: GameStep, pile: PileType, count: number): boolean {
    const constraint = PILE_CONSTRAINTS[step][pile];
    const enforcement = PROGRESSIVE_ENFORCEMENT[step];

    if (!constraint || !enforcement.enforceStrictLimits) {
      return false;
    }

    return (constraint.max != null && constraint.max !== Infinity && count >= constraint.max) ||
           (constraint.exact != null && count >= constraint.exact);
  }

  /**
   * Batch validate multiple piles for performance
   */
  batchValidatePiles(step: GameStep, pileCounts: Record<PileType, number>): Record<PileType, PileState> {
    const results: Record<PileType, PileState> = {} as Record<PileType, PileState>;

    for (const [pile, count] of Object.entries(pileCounts)) {
      results[pile as PileType] = this.getPileState(step, pile as PileType, count);
    }

    return results;
  }

  // Helper methods
  private createResult(
    valid: boolean, 
    reason?: string, 
    severity: ValidationResult['severity'] = 'info',
    action?: ValidationResult['action'],
    message?: string
  ): ValidationResult {
    return { valid, reason, severity, action, message };
  }

  private getPileOverflowMessage(step: GameStep, pile: PileType): string {
    const messages = CONSTRAINT_MESSAGES[step] as Record<string, string>;
    return messages[`${pile}_overflow`] || `Maximum cards exceeded in ${pile}`;
  }

  private getApproachingLimitMessage(step: GameStep, pile: PileType, count: number, max: number): string {
    const messages = CONSTRAINT_MESSAGES[step] as Record<string, string>;
    return messages[`${pile}_approaching`] || `${pile} pile is almost full (${count}/${max})`;
  }

  private trackPerformance(): void {
    const duration = performance.now() - this.validationStartTime;
    if (duration > PERFORMANCE_LIMITS.maxValidationTime) {
      console.warn(`Constraint validation took ${duration.toFixed(2)}ms (target: <${PERFORMANCE_LIMITS.maxValidationTime}ms)`);
    }
  }
}

// Export singleton instance for performance
export const constraintValidator = new ConstraintValidator();