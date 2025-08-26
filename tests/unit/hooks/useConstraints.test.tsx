/**
 * Unit tests for useConstraints hook
 */

import { renderHook, act } from '@testing-library/react';
import { useConstraints, usePileStates, useConstraintFeedback } from '@/hooks/useConstraints';
import { GameStep, PileType } from '@/lib/constraints/types';

const mockPileCounts = {
  deck: 10,
  staging: 0,
  more: 5,
  less: 3,
  top8: 0,
  top3: 0,
  discard: 0
};

describe('useConstraints', () => {
  it('should initialize with correct default values', () => {
    const { result } = renderHook(() =>
      useConstraints({
        step: 'step1',
        pileCounts: mockPileCounts
      })
    );

    expect(result.current.pileStates).toBeDefined();
    expect(result.current.validateMove).toBeInstanceOf(Function);
    expect(result.current.isValidMove).toBeInstanceOf(Function);
    expect(result.current.canProgressToNextStep).toBeInstanceOf(Function);
  });

  it('should validate moves correctly', () => {
    const { result } = renderHook(() =>
      useConstraints({
        step: 'step1',
        pileCounts: mockPileCounts
      })
    );

    const validResult = result.current.validateMove('more', 1);
    expect(validResult.valid).toBe(true);
  });

  it('should detect invalid moves', () => {
    const { result } = renderHook(() =>
      useConstraints({
        step: 'step1',
        pileCounts: { ...mockPileCounts, staging: 1 }
      })
    );

    const invalidResult = result.current.validateMove('staging', 2);
    expect(invalidResult.valid).toBe(false);
  });

  it('should check step progression correctly', () => {
    const validProgressionCounts = {
      deck: 0,
      staging: 0,
      more: 15,
      less: 5,
      top8: 0,
      top3: 0,
      discard: 0
    };

    const { result } = renderHook(() =>
      useConstraints({
        step: 'step1',
        pileCounts: validProgressionCounts
      })
    );

    const progressionResult = result.current.canProgressToNextStep();
    expect(progressionResult.valid).toBe(true);
  });

  it('should provide counter displays', () => {
    const { result } = renderHook(() =>
      useConstraints({
        step: 'step2',
        pileCounts: { ...mockPileCounts, top8: 5 }
      })
    );

    const counterDisplay = result.current.getCounterDisplay('top8');
    expect(counterDisplay).toBe('5/8');
  });

  it('should determine drop zone disabled state', () => {
    const { result } = renderHook(() =>
      useConstraints({
        step: 'step2',
        pileCounts: { ...mockPileCounts, top8: 8 }
      })
    );

    const isDisabled = result.current.isDropZoneDisabled('top8');
    expect(isDisabled).toBe(true);
  });

  it('should get pile states', () => {
    const { result } = renderHook(() =>
      useConstraints({
        step: 'step2',
        pileCounts: { ...mockPileCounts, top8: 7 }
      })
    );

    const pileState = result.current.getPileState('top8');
    expect(pileState.count).toBe(7);
    expect(pileState.isApproaching).toBe(true);
  });

  it('should batch validate multiple moves', () => {
    const { result } = renderHook(() =>
      useConstraints({
        step: 'step1',
        pileCounts: mockPileCounts
      })
    );

    const moves = [
      { targetPile: 'more' as PileType, cardCount: 1 },
      { targetPile: 'staging' as PileType, cardCount: 2 }
    ];

    const results = result.current.batchValidateMoves(moves);
    expect(results).toHaveLength(2);
    expect(results[0].valid).toBe(true);
    expect(results[1].valid).toBe(false);
  });

  it('should get invalid piles', () => {
    const { result } = renderHook(() =>
      useConstraints({
        step: 'step2',
        pileCounts: { ...mockPileCounts, top8: 9 }
      })
    );

    const invalidPiles = result.current.getInvalidPiles();
    expect(invalidPiles).toContain('top8');
  });

  it('should provide constraint summary', () => {
    const { result } = renderHook(() =>
      useConstraints({
        step: 'step2',
        pileCounts: { ...mockPileCounts, top8: 8, staging: 1 }
      })
    );

    const summary = result.current.getConstraintSummary();
    expect(summary.step).toBe('step2');
    expect(summary.validPiles).toBeGreaterThan(0);
  });

  it('should trigger validation error callback', () => {
    const onValidationError = jest.fn();

    const { result } = renderHook(() =>
      useConstraints({
        step: 'step1',
        pileCounts: { ...mockPileCounts, staging: 1 },
        onValidationError
      })
    );

    result.current.validateMove('staging', 2);
    expect(onValidationError).toHaveBeenCalled();
  });

  it('should trigger constraint violation callback', () => {
    const onConstraintViolation = jest.fn();

    const { result } = renderHook(() =>
      useConstraints({
        step: 'step2',
        pileCounts: { ...mockPileCounts, top8: 8 },
        onConstraintViolation
      })
    );

    result.current.validateMove('top8', 9);
    expect(onConstraintViolation).toHaveBeenCalledWith('top8', expect.any(String));
  });

  it('should clear validation cache', () => {
    const { result } = renderHook(() =>
      useConstraints({
        step: 'step1',
        pileCounts: mockPileCounts
      })
    );

    act(() => {
      result.current.clearValidationCache();
    });

    // Should not throw or cause issues
    const validationResult = result.current.validateMove('more', 1);
    expect(validationResult.valid).toBe(true);
  });
});

describe('usePileStates', () => {
  it('should return pile states for given step and counts', () => {
    const { result } = renderHook(() =>
      usePileStates('step2', { ...mockPileCounts, top8: 5 })
    );

    expect(result.current.top8).toBeDefined();
    expect(result.current.top8.count).toBe(5);
    expect(result.current.top8.pile).toBe('top8');
  });

  it('should update when pileCounts change', () => {
    const { result, rerender } = renderHook(
      ({ pileCounts }) => usePileStates('step2', pileCounts),
      { initialProps: { pileCounts: { ...mockPileCounts, top8: 5 } } }
    );

    expect(result.current.top8.count).toBe(5);

    rerender({ pileCounts: { ...mockPileCounts, top8: 7 } });
    expect(result.current.top8.count).toBe(7);
  });
});

describe('useConstraintFeedback', () => {
  it('should record violations', () => {
    const { result } = renderHook(() => useConstraintFeedback());

    act(() => {
      result.current.recordViolation('top8', 'Pile is full');
    });

    const violations = result.current.getRecentViolations();
    expect(violations).toContain('Pile is full');
  });

  it('should clear old violations', () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useConstraintFeedback());

    act(() => {
      result.current.recordViolation('top8', 'Old violation');
    });

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(6000); // 6 seconds
    });

    const violations = result.current.getRecentViolations(5000); // 5 second window
    expect(violations).not.toContain('Old violation');
    
    jest.useRealTimers();
  });

  it('should clear all violations', () => {
    const { result } = renderHook(() => useConstraintFeedback());

    act(() => {
      result.current.recordViolation('top8', 'Test violation');
      result.current.clearViolations();
    });

    const violations = result.current.getRecentViolations();
    expect(violations).toHaveLength(0);
  });

  it('should filter violations by age', () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => useConstraintFeedback());

    act(() => {
      result.current.recordViolation('top8', 'Recent violation');
    });

    act(() => {
      jest.advanceTimersByTime(3000); // 3 seconds
    });

    act(() => {
      result.current.recordViolation('staging', 'Very recent violation');
    });

    const recentViolations = result.current.getRecentViolations(2000); // 2 second window
    expect(recentViolations).toHaveLength(1);
    expect(recentViolations[0]).toBe('Very recent violation');
    
    jest.useRealTimers();
  });
});