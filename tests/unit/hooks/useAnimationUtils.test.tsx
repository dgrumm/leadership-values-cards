/**
 * Unit tests for animation utilities that need DOM/window
 */

import React from 'react';
import {
  prefersReducedMotion,
  getAnimationDuration,
  debugUtils,
  setupAnimationDebugging,
} from '@/lib/animations/utils';
import { A11Y_CONFIG } from '@/lib/animations/constants';

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

describe('Animation Utils (DOM)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchMedia(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('prefersReducedMotion', () => {
    it('should return false when matchMedia is not available', () => {
      // @ts-ignore
      delete window.matchMedia;
      expect(prefersReducedMotion()).toBe(false);
    });

    it('should return true when user prefers reduced motion', () => {
      mockMatchMedia(true);
      expect(prefersReducedMotion()).toBe(true);
    });

    it('should return false when user does not prefer reduced motion', () => {
      mockMatchMedia(false);
      expect(prefersReducedMotion()).toBe(false);
    });
  });

  describe('getAnimationDuration', () => {
    beforeEach(() => {
      mockMatchMedia(false);
    });

    it('should return normal duration when reduced motion is not preferred', () => {
      const result = getAnimationDuration(500, 100);
      expect(result).toBe(500);
    });

    it('should return reduced duration when reduced motion is preferred', () => {
      mockMatchMedia(true);
      const result = getAnimationDuration(500, 100);
      expect(result).toBe(100);
    });

    it('should return fallback duration when no reduced duration provided', () => {
      mockMatchMedia(true);
      const result = getAnimationDuration(500);
      expect(result).toBe(A11Y_CONFIG.skipAnimationsThreshold || 0);
    });

    it('should ignore reduced motion when respectReducedMotion is false', () => {
      const originalRespectReducedMotion = A11Y_CONFIG.respectReducedMotion;
      (A11Y_CONFIG as any).respectReducedMotion = false;
      
      mockMatchMedia(true);
      const result = getAnimationDuration(500, 100);
      expect(result).toBe(500);
      
      (A11Y_CONFIG as any).respectReducedMotion = originalRespectReducedMotion;
    });
  });

  describe('debugUtils', () => {
    beforeEach(() => {
      // Mock environment to enable debug mode
      process.env.NODE_ENV = 'development';
      
      // Mock document methods
      Object.defineProperty(document, 'documentElement', {
        value: {
          style: {
            setProperty: jest.fn(),
            removeProperty: jest.fn(),
          },
          classList: {
            add: jest.fn(),
            remove: jest.fn(),
          },
        },
        writable: true,
      });
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should have debug utility functions', () => {
      expect(typeof debugUtils.enableSlowMotion).toBe('function');
      expect(typeof debugUtils.disableSlowMotion).toBe('function');
      expect(typeof debugUtils.showAnimationBoundaries).toBe('function');
      expect(typeof debugUtils.hideAnimationBoundaries).toBe('function');
    });
  });

  describe('setupAnimationDebugging', () => {
    it('should be a function', () => {
      expect(typeof setupAnimationDebugging).toBe('function');
    });

    it('should not throw when called', () => {
      expect(() => setupAnimationDebugging()).not.toThrow();
    });
  });
});