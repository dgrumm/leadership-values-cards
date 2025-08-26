/**
 * Unit tests for animation utilities (Node environment - no DOM)
 */

import {
  AnimationController,
  createStaggerDelay,
  batchAnimations,
  animationController,
  performanceMonitor,
} from '@/lib/animations/utils';
import { PERFORMANCE } from '@/lib/animations/constants';

// Mock performance.now
const mockPerformanceNow = () => {
  let now = 0;
  Object.defineProperty(performance, 'now', {
    writable: true,
    value: jest.fn(() => now++),
  });
};

describe('Animation Utils (Node)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createStaggerDelay', () => {
    it('should create a stagger delay function', () => {
      const staggerFn = createStaggerDelay(100, 50);
      expect(typeof staggerFn).toBe('function');
    });

    it('should calculate correct delays', () => {
      const staggerFn = createStaggerDelay(100, 50);
      expect(staggerFn(0)).toBe(100);
      expect(staggerFn(1)).toBe(150);
      expect(staggerFn(2)).toBe(200);
      expect(staggerFn(5)).toBe(350);
    });

    it('should handle negative indices', () => {
      const staggerFn = createStaggerDelay(100, 50);
      expect(staggerFn(-1)).toBe(50);
      expect(staggerFn(-2)).toBe(0);
    });
  });

  describe('batchAnimations', () => {
    it('should batch animations according to batch size', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const animationFn = jest.fn().mockResolvedValue(undefined);
      
      await batchAnimations(items, animationFn, 3);
      
      expect(animationFn).toHaveBeenCalledTimes(10);
      items.forEach((item, index) => {
        expect(animationFn).toHaveBeenCalledWith(item, index);
      });
    });

    it('should handle empty arrays', async () => {
      const animationFn = jest.fn();
      const result = await batchAnimations([], animationFn);
      
      expect(animationFn).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should use default batch size when not specified', async () => {
      const items = Array.from({ length: PERFORMANCE.batchSize + 5 }, (_, i) => i);
      const animationFn = jest.fn().mockResolvedValue(undefined);
      
      await batchAnimations(items, animationFn);
      
      expect(animationFn).toHaveBeenCalledTimes(items.length);
    });

    it('should handle failed animations gracefully', async () => {
      const items = [1, 2, 3];
      const animationFn = jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Animation failed'))
        .mockResolvedValueOnce(undefined);
      
      await expect(batchAnimations(items, animationFn)).rejects.toThrow();
    });
  });

  describe('AnimationController', () => {
    let controller: AnimationController;

    beforeEach(() => {
      controller = new AnimationController();
    });

    describe('executeAnimation', () => {
      it('should execute animation successfully', async () => {
        const animationFn = jest.fn().mockResolvedValue(undefined);
        
        await controller.executeAnimation('test-animation', animationFn);
        
        expect(animationFn).toHaveBeenCalled();
      });

      it('should execute fallback on animation failure', async () => {
        const animationFn = jest.fn().mockRejectedValue(new Error('Animation failed'));
        const fallbackFn = jest.fn();
        
        await expect(
          controller.executeAnimation('test-animation', animationFn, fallbackFn)
        ).rejects.toThrow('Animation failed');
        
        expect(fallbackFn).toHaveBeenCalled();
      });

      it('should cancel existing animation with same ID', async () => {
        const firstAnimation = jest.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 1000))
        );
        const secondAnimation = jest.fn().mockResolvedValue(undefined);
        
        // Start first animation (don't await)
        const firstPromise = controller.executeAnimation('test', firstAnimation);
        
        // Start second animation with same ID
        await controller.executeAnimation('test', secondAnimation);
        
        expect(secondAnimation).toHaveBeenCalled();
        
        // Wait for first animation to complete (it should be cancelled)
        await expect(firstPromise).resolves.toBeUndefined();
      });

      it('should timeout long-running animations', async () => {
        const longAnimation = jest.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, PERFORMANCE.maxAnimationDuration + 1000))
        );
        const fallbackFn = jest.fn();
        
        await expect(
          controller.executeAnimation('test-timeout', longAnimation, fallbackFn)
        ).rejects.toThrow('Animation timeout');
        
        expect(fallbackFn).toHaveBeenCalled();
      }, PERFORMANCE.maxAnimationDuration + 2000);
    });

    describe('cancelAnimation', () => {
      it('should cancel running animation', async () => {
        const animationFn = jest.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 1000))
        );
        
        // Start animation (don't await)
        const animationPromise = controller.executeAnimation('test-cancel', animationFn);
        
        // Cancel immediately
        controller.cancelAnimation('test-cancel');
        
        // Animation should still complete (cleanup happens in executeAnimation)
        await expect(animationPromise).resolves.toBeUndefined();
      });

      it('should handle cancelling non-existent animation', () => {
        expect(() => {
          controller.cancelAnimation('non-existent');
        }).not.toThrow();
      });
    });

    describe('cancelAllAnimations', () => {
      it('should cancel all running animations', async () => {
        const animation1 = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
        const animation2 = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
        
        // Start animations
        const promise1 = controller.executeAnimation('test1', animation1);
        const promise2 = controller.executeAnimation('test2', animation2);
        
        // Cancel all
        controller.cancelAllAnimations();
        
        // Both should complete
        await Promise.all([promise1, promise2]);
      });
    });
  });

  describe('Global Instances', () => {
    it('should export global animation controller', () => {
      expect(animationController).toBeInstanceOf(AnimationController);
    });

    it('should export global performance monitor', () => {
      expect(performanceMonitor).toBeDefined();
      expect(typeof performanceMonitor.recordAnimation).toBe('function');
      expect(typeof performanceMonitor.getAverageFrameRate).toBe('function');
    });
  });
});