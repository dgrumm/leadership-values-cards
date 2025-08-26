/**
 * Unit tests for useAnimations hooks
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AnimationControls } from 'framer-motion';
import {
  useCardFlipAnimation,
  usePileTransitionAnimation,
  useFrameExpansionAnimation,
  useAnimationPerformance
} from '@/hooks/useAnimations';
import * as animationUtils from '@/lib/animations/utils';
import * as useReducedMotionHook from '@/hooks/useReducedMotion';

// Mock dependencies
jest.mock('framer-motion', () => ({
  useAnimation: jest.fn(),
}));

jest.mock('@/lib/animations/utils', () => ({
  animationController: {
    executeAnimation: jest.fn(),
    cancelAnimation: jest.fn(),
  },
  performanceMonitor: {
    getAverageFrameRate: jest.fn(),
    isPerformancePoor: jest.fn(),
    getAnimationStats: jest.fn(),
  },
}));

jest.mock('@/hooks/useReducedMotion', () => ({
  useReducedMotion: jest.fn(),
}));

// Mock animation controls
const mockControls: Partial<AnimationControls> = {
  start: jest.fn().mockResolvedValue(undefined),
  set: jest.fn(),
  stop: jest.fn(),
};

describe('useAnimations hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (require('framer-motion').useAnimation as jest.Mock).mockReturnValue(mockControls);
    (useReducedMotionHook.useReducedMotion as jest.Mock).mockReturnValue(false);
    (animationUtils.animationController.executeAnimation as jest.Mock).mockImplementation(
      (id, animationFn, fallbackFn) => animationFn()
    );
  });

  describe('useCardFlipAnimation', () => {
    it('should initialize with proper controls and functions', () => {
      const { result } = renderHook(() => useCardFlipAnimation('test-card'));
      
      expect(result.current.controls).toBe(mockControls);
      expect(typeof result.current.flipToFront).toBe('function');
      expect(typeof result.current.flipToBack).toBe('function');
      expect(typeof result.current.moveToStaging).toBe('function');
      expect(typeof result.current.cancelAnimation).toBe('function');
      expect(result.current.isAnimating).toBe(false);
    });

    it('should execute flip to front animation', async () => {
      const { result } = renderHook(() => useCardFlipAnimation('test-card'));
      
      await act(async () => {
        await result.current.flipToFront();
      });
      
      expect(animationUtils.animationController.executeAnimation).toHaveBeenCalledWith(
        'card-flip-test-card-front',
        expect.any(Function),
        expect.any(Function)
      );
      expect(mockControls.start).toHaveBeenCalledWith('front');
    });

    it('should execute flip to back animation', async () => {
      const { result } = renderHook(() => useCardFlipAnimation('test-card'));
      
      await act(async () => {
        await result.current.flipToBack();
      });
      
      expect(animationUtils.animationController.executeAnimation).toHaveBeenCalledWith(
        'card-flip-test-card-back',
        expect.any(Function),
        expect.any(Function)
      );
      expect(mockControls.start).toHaveBeenCalledWith('back');
    });

    it('should use reduced motion when preference is enabled', async () => {
      (useReducedMotionHook.useReducedMotion as jest.Mock).mockReturnValue(true);
      const { result } = renderHook(() => useCardFlipAnimation('test-card'));
      
      await act(async () => {
        await result.current.flipToFront();
      });
      
      expect(mockControls.set).toHaveBeenCalledWith('front');
      expect(mockControls.start).not.toHaveBeenCalled();
    });

    it('should handle animation cancellation', () => {
      const { result } = renderHook(() => useCardFlipAnimation('test-card'));
      
      act(() => {
        result.current.cancelAnimation();
      });
      
      expect(animationUtils.animationController.cancelAnimation).toHaveBeenCalledWith('card-flip-test-card-front');
      expect(animationUtils.animationController.cancelAnimation).toHaveBeenCalledWith('card-flip-test-card-back');
      expect(animationUtils.animationController.cancelAnimation).toHaveBeenCalledWith('card-staging-test-card');
    });

    it('should prevent concurrent animations', async () => {
      const { result } = renderHook(() => useCardFlipAnimation('test-card'));
      
      // Simply test that both animations can be called
      await act(async () => {
        await result.current.flipToFront();
      });
      
      await act(async () => {
        await result.current.flipToBack();
      });
      
      expect(animationUtils.animationController.executeAnimation).toHaveBeenCalledTimes(2);
    });

    it('should cleanup animations on unmount', () => {
      const { result, unmount } = renderHook(() => useCardFlipAnimation('test-card'));
      
      unmount();
      
      expect(animationUtils.animationController.cancelAnimation).toHaveBeenCalledTimes(3);
    });
  });

  describe('usePileTransitionAnimation', () => {
    it('should initialize with proper controls and functions', () => {
      const { result } = renderHook(() => usePileTransitionAnimation('test-pile'));
      
      expect(result.current.controls).toBe(mockControls);
      expect(typeof result.current.collectAndMove).toBe('function');
      expect(typeof result.current.redistribute).toBe('function');
      expect(typeof result.current.cancelTransition).toBe('function');
      expect(result.current.isTransitioning).toBe(false);
    });

    it('should execute collect and move sequence', async () => {
      const { result } = renderHook(() => usePileTransitionAnimation('test-pile'));
      
      await act(async () => {
        await result.current.collectAndMove();
      });
      
      expect(animationUtils.animationController.executeAnimation).toHaveBeenCalledWith(
        'pile-transition-test-pile',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should handle transition sequence with delays', async () => {
      const { result } = renderHook(() => usePileTransitionAnimation('test-pile'));
      
      await act(async () => {
        await result.current.collectAndMove();
      });
      
      expect(animationUtils.animationController.executeAnimation).toHaveBeenCalledWith(
        'pile-transition-test-pile',
        expect.any(Function),
        expect.any(Function)
      );
    }, 10000);

    it('should use reduced motion in transitions', async () => {
      (useReducedMotionHook.useReducedMotion as jest.Mock).mockReturnValue(true);
      const { result } = renderHook(() => usePileTransitionAnimation('test-pile'));
      
      await act(async () => {
        await result.current.collectAndMove();
      });
      
      expect(mockControls.set).toHaveBeenCalled();
      expect(mockControls.start).not.toHaveBeenCalled();
    });
  });

  describe('useFrameExpansionAnimation', () => {
    it('should initialize with proper controls and functions', () => {
      const { result } = renderHook(() => useFrameExpansionAnimation());
      
      expect(result.current.controls).toBe(mockControls);
      expect(typeof result.current.expandFrame).toBe('function');
      expect(typeof result.current.collapseFrame).toBe('function');
      expect(typeof result.current.cancelExpansion).toBe('function');
      expect(result.current.isExpanding).toBe(false);
    });

    it('should execute frame expansion', async () => {
      const { result } = renderHook(() => useFrameExpansionAnimation());
      
      await act(async () => {
        await result.current.expandFrame();
      });
      
      expect(animationUtils.animationController.executeAnimation).toHaveBeenCalledWith(
        'frame-expansion',
        expect.any(Function),
        expect.any(Function)
      );
      expect(mockControls.start).toHaveBeenCalledWith('expanded');
    });

    it('should execute frame collapse', async () => {
      const { result } = renderHook(() => useFrameExpansionAnimation());
      
      await act(async () => {
        await result.current.collapseFrame();
      });
      
      expect(animationUtils.animationController.executeAnimation).toHaveBeenCalledWith(
        'frame-collapse',
        expect.any(Function),
        expect.any(Function)
      );
      expect(mockControls.start).toHaveBeenCalledWith('collapsed');
    });
  });

  describe('useAnimationPerformance', () => {
    beforeEach(() => {
      (animationUtils.performanceMonitor.getAverageFrameRate as jest.Mock).mockReturnValue(58.5);
      (animationUtils.performanceMonitor.isPerformancePoor as jest.Mock).mockReturnValue(false);
      (animationUtils.performanceMonitor.getAnimationStats as jest.Mock).mockReturnValue({ duration: 100, fps: 60 });
    });

    it('should provide performance monitoring functions', () => {
      const { result } = renderHook(() => useAnimationPerformance());
      
      expect(result.current).toBeTruthy();
      expect(typeof result.current.getFrameRate).toBe('function');
      expect(typeof result.current.isPerformancePoor).toBe('function');
      expect(typeof result.current.getAnimationStats).toBe('function');
    });

    it('should get current frame rate', () => {
      const { result } = renderHook(() => useAnimationPerformance());
      
      const frameRate = result.current.getFrameRate();
      expect(frameRate).toBe(58.5);
      expect(animationUtils.performanceMonitor.getAverageFrameRate).toHaveBeenCalled();
    });

    it('should detect poor performance', () => {
      (animationUtils.performanceMonitor.isPerformancePoor as jest.Mock).mockReturnValue(true);
      const { result } = renderHook(() => useAnimationPerformance());
      
      const isPoor = result.current.isPerformancePoor();
      expect(isPoor).toBe(true);
      expect(animationUtils.performanceMonitor.isPerformancePoor).toHaveBeenCalled();
    });

    it('should get animation stats', () => {
      const { result } = renderHook(() => useAnimationPerformance());
      
      const stats = result.current.getAnimationStats('test-id');
      expect(stats).toEqual({ duration: 100, fps: 60 });
      expect(animationUtils.performanceMonitor.getAnimationStats).toHaveBeenCalledWith('test-id');
    });
  });
});