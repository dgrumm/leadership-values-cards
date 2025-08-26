/**
 * Unit tests for animation hooks
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useReducedMotion, useAnimationDuration, useAnimationVariants } from '@/hooks/useReducedMotion';

// Mock window.matchMedia
const mockMatchMedia = (matches: boolean = false) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe('Animation Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchMedia(false);
  });

  describe('useReducedMotion', () => {
    it('should return false when user does not prefer reduced motion', () => {
      mockMatchMedia(false);
      const { result } = renderHook(() => useReducedMotion());
      expect(result.current).toBe(false);
    });

    it('should return true when user prefers reduced motion', () => {
      mockMatchMedia(true);
      const { result } = renderHook(() => useReducedMotion());
      expect(result.current).toBe(true);
    });

    it('should update when media query changes', () => {
      let mediaQueryCallback: ((event: MediaQueryListEvent) => void) | null = null;
      
      mockMatchMedia(false);
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(() => ({
          matches: false,
          addEventListener: jest.fn().mockImplementation((event, callback) => {
            if (event === 'change') {
              mediaQueryCallback = callback;
            }
          }),
          removeEventListener: jest.fn(),
        })),
      });

      const { result } = renderHook(() => useReducedMotion());
      expect(result.current).toBe(false);

      // Simulate media query change
      act(() => {
        if (mediaQueryCallback) {
          mediaQueryCallback({ matches: true } as MediaQueryListEvent);
        }
      });

      expect(result.current).toBe(true);
    });

    it('should handle server-side rendering', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const { result } = renderHook(() => useReducedMotion());
      expect(result.current).toBe(false);

      global.window = originalWindow;
    });
  });

  describe('useAnimationDuration', () => {
    it('should return normal duration when motion is not reduced', () => {
      mockMatchMedia(false);
      const { result } = renderHook(() => useAnimationDuration(500, 100));
      expect(result.current).toBe(500);
    });

    it('should return reduced duration when motion is reduced', () => {
      mockMatchMedia(true);
      const { result } = renderHook(() => useAnimationDuration(500, 100));
      expect(result.current).toBe(100);
    });

    it('should default to 0 for reduced duration', () => {
      mockMatchMedia(true);
      const { result } = renderHook(() => useAnimationDuration(500));
      expect(result.current).toBe(0);
    });
  });

  describe('useAnimationVariants', () => {
    it('should return normal variants when motion is not reduced', () => {
      mockMatchMedia(false);
      const normalVariants = { initial: { opacity: 0 }, animate: { opacity: 1 } };
      const reducedVariants = { initial: { opacity: 0 }, animate: { opacity: 1 } };
      
      const { result } = renderHook(() => 
        useAnimationVariants(normalVariants, reducedVariants)
      );
      
      expect(result.current).toBe(normalVariants);
    });

    it('should return reduced variants when motion is reduced', () => {
      mockMatchMedia(true);
      const normalVariants = { initial: { opacity: 0 }, animate: { opacity: 1 } };
      const reducedVariants = { initial: { opacity: 0 }, animate: { opacity: 1 } };
      
      const { result } = renderHook(() => 
        useAnimationVariants(normalVariants, reducedVariants)
      );
      
      expect(result.current).toBe(reducedVariants);
    });
  });
});