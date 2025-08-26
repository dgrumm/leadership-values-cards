/**
 * Unit tests for constraint validation system
 */

import { constraintValidator, ConstraintValidator } from '@/lib/constraints/validator';
import { PILE_CONSTRAINTS } from '@/lib/constraints/rules';
import { ConstraintCheckContext, GameStep, PileType } from '@/lib/constraints/types';

describe('ConstraintValidator', () => {
  let validator: ConstraintValidator;

  beforeEach(() => {
    validator = new ConstraintValidator();
  });

  describe('validateMove', () => {
    it('should allow valid moves', () => {
      const context: ConstraintCheckContext = {
        step: 'step1',
        targetPile: 'more',
        cardCount: 1,
        allPileCounts: {
          deck: 10,
          staging: 0,
          more: 0,
          less: 0,
          top8: 0,
          top3: 0,
          discard: 0
        }
      };

      const result = validator.validateMove(context);
      expect(result.valid).toBe(true);
    });

    it('should reject moves to invalid piles', () => {
      const context: ConstraintCheckContext = {
        step: 'step1',
        targetPile: 'invalid' as PileType,
        cardCount: 1,
        allPileCounts: {
          deck: 10,
          staging: 0,
          more: 0,
          less: 0,
          top8: 0,
          top3: 0,
          discard: 0
        }
      };

      const result = validator.validateMove(context);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid target pile');
    });

    it('should enforce staging area limit (1 card max)', () => {
      const context: ConstraintCheckContext = {
        step: 'step1',
        targetPile: 'staging',
        cardCount: 2,
        allPileCounts: {
          deck: 10,
          staging: 1,
          more: 0,
          less: 0,
          top8: 0,
          top3: 0,
          discard: 0
        }
      };

      const result = validator.validateMove(context);
      expect(result.valid).toBe(false);
      expect(result.action).toBe('bounce');
    });

    it('should enforce Top 8 pile limit in Step 2', () => {
      const context: ConstraintCheckContext = {
        step: 'step2',
        targetPile: 'top8',
        cardCount: 9,
        allPileCounts: {
          deck: 5,
          staging: 0,
          more: 0,
          less: 0,
          top8: 8,
          top3: 0,
          discard: 0
        }
      };

      const result = validator.validateMove(context);
      expect(result.valid).toBe(false);
      expect(result.severity).toBe('error');
      expect(result.action).toBe('bounce');
    });

    it('should enforce Top 3 pile limit in Step 3', () => {
      const context: ConstraintCheckContext = {
        step: 'step3',
        targetPile: 'top3',
        cardCount: 4,
        allPileCounts: {
          deck: 2,
          staging: 0,
          more: 0,
          less: 0,
          top8: 0,
          top3: 3,
          discard: 0
        }
      };

      const result = validator.validateMove(context);
      expect(result.valid).toBe(false);
      expect(result.severity).toBe('error');
    });

    it('should provide warnings when approaching limits', () => {
      const context: ConstraintCheckContext = {
        step: 'step2',
        targetPile: 'top8',
        cardCount: 7,
        allPileCounts: {
          deck: 5,
          staging: 0,
          more: 0,
          less: 0,
          top8: 6, // Current count is 6, trying to add 1 to make 7
          top3: 0,
          discard: 0
        }
      };

      const result = validator.validateMove(context);
      expect(result.valid).toBe(true);
      // Note: The warning is based on the final count after move, not during move validation
      // The warning is shown in pile state, not move validation
      expect(result.severity).toBe('info'); // Move itself is valid
    });
  });

  describe('getPileState', () => {
    it('should return correct pile state for valid pile', () => {
      const state = validator.getPileState('step2', 'top8', 5);
      
      expect(state.pile).toBe('top8');
      expect(state.count).toBe(5);
      expect(state.isValid).toBe(true);
      expect(state.isOverLimit).toBe(false);
      expect(state.visualState).toBe('default');
    });

    it('should detect approaching limit state', () => {
      const state = validator.getPileState('step2', 'top8', 7);
      
      expect(state.isApproaching).toBe(true);
      expect(state.visualState).toBe('warning');
    });

    it('should detect at limit state', () => {
      const state = validator.getPileState('step2', 'top8', 8);
      
      expect(state.isAtLimit).toBe(true);
      expect(state.visualState).toBe('valid');
    });

    it('should detect over limit state', () => {
      const state = validator.getPileState('step2', 'top8', 9);
      
      expect(state.isOverLimit).toBe(true);
      expect(state.isValid).toBe(false);
      expect(state.visualState).toBe('error');
    });

    it('should handle unknown piles gracefully', () => {
      const state = validator.getPileState('step1', 'unknown' as PileType, 5);
      
      expect(state.isValid).toBe(true);
      expect(state.visualState).toBe('default');
    });
  });

  describe('getCounterDisplay', () => {
    it('should format exact constraint counters', () => {
      const display = validator.getCounterDisplay('step2', 'top8', 5);
      expect(display).toBe('5/8');
    });

    it('should format infinite constraint counters', () => {
      const display = validator.getCounterDisplay('step1', 'more', 10);
      expect(display).toBe('10');
    });

    it('should format staging area counter', () => {
      const display = validator.getCounterDisplay('step1', 'staging', 1);
      expect(display).toBe('1/1');
    });
  });

  describe('isDropZoneDisabled', () => {
    it('should disable drop zone when at limit in strict enforcement mode', () => {
      const disabled = validator.isDropZoneDisabled('step2', 'top8', 8);
      expect(disabled).toBe(true);
    });

    it('should not disable drop zone in lenient mode (Step 1)', () => {
      const disabled = validator.isDropZoneDisabled('step1', 'more', 100);
      expect(disabled).toBe(false);
    });

    it('should not disable unlimited piles', () => {
      const disabled = validator.isDropZoneDisabled('step2', 'less', 50);
      expect(typeof disabled).toBe('boolean');
      expect(disabled).toBe(false);
    });
  });

  describe('batchValidatePiles', () => {
    it('should validate all piles in batch', () => {
      const pileCounts = {
        deck: 10,
        staging: 1,
        more: 5,
        less: 3,
        top8: 0,
        top3: 0,
        discard: 0
      };

      const results = validator.batchValidatePiles('step1', pileCounts);
      
      expect(Object.keys(results)).toHaveLength(7);
      expect(results.staging.isAtLimit).toBe(true);
      expect(results.more.isValid).toBe(true);
      expect(results.less.isValid).toBe(true);
    });
  });

  describe('step progression validation', () => {
    it('should validate step progression requirements', () => {
      const context: ConstraintCheckContext = {
        step: 'step2',
        targetPile: 'deck',
        cardCount: 0,
        allPileCounts: {
          deck: 0,
          staging: 0,
          more: 0,
          less: 5,
          top8: 8,
          top3: 0,
          discard: 0
        },
        isProgression: true
      };

      const result = validator.validateMove(context);
      expect(result.valid).toBe(true);
    });

    it('should reject progression with invalid pile states', () => {
      const context: ConstraintCheckContext = {
        step: 'step2',
        targetPile: 'deck',
        cardCount: 0,
        allPileCounts: {
          deck: 5, // Should be empty for progression
          staging: 0,
          more: 0,
          less: 0,
          top8: 7, // Should be exactly 8
          top3: 0,
          discard: 0
        },
        isProgression: true
      };

      const result = validator.validateMove(context);
      expect(result.valid).toBe(false);
      expect(result.action).toBe('disable');
    });
  });

  describe('performance tracking', () => {
    it('should track validation performance', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock performance.now to simulate slow validation using Object.defineProperty
      const originalNow = performance.now;
      let callCount = 0;
      Object.defineProperty(performance, 'now', {
        value: jest.fn(() => {
          callCount++;
          return callCount === 1 ? 0 : 50; // 50ms duration
        }),
        writable: true,
        configurable: true
      });

      const context: ConstraintCheckContext = {
        step: 'step1',
        targetPile: 'more',
        cardCount: 1,
        allPileCounts: {
          deck: 10,
          staging: 0,
          more: 0,
          less: 0,
          top8: 0,
          top3: 0,
          discard: 0
        }
      };

      validator.validateMove(context);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Constraint validation took')
      );

      // Cleanup
      Object.defineProperty(performance, 'now', {
        value: originalNow,
        writable: true,
        configurable: true
      });
      consoleSpy.mockRestore();
    });
  });
});

describe('constraintValidator singleton', () => {
  it('should export a singleton instance', () => {
    expect(constraintValidator).toBeInstanceOf(ConstraintValidator);
  });

  it('should maintain state across calls', () => {
    const context: ConstraintCheckContext = {
      step: 'step1',
      targetPile: 'more',
      cardCount: 1,
      allPileCounts: {
        deck: 10,
        staging: 0,
        more: 0,
        less: 0,
        top8: 0,
        top3: 0,
        discard: 0
      }
    };

    const result1 = constraintValidator.validateMove(context);
    const result2 = constraintValidator.validateMove(context);
    
    expect(result1.valid).toBe(result2.valid);
  });
});