import { renderHook, act } from '@testing-library/react';
import { useRevealToast } from '../../../../hooks/reveals/useRevealToast';

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

// Replace the global sessionStorage with our mock
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

describe('useRevealToast', () => {
  const testSessionCode = 'TOAST123';
  const expectedStorageKey = `leadership-values-reveal-toast-${testSessionCode}`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  describe('Initialization', () => {
    test('should initialize with both steps not shown when no stored value exists', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useRevealToast(testSessionCode));

      expect(result.current.shouldShowToast('step2')).toBe(true);
      expect(result.current.shouldShowToast('step3')).toBe(true);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith(expectedStorageKey);
    });

    test('should initialize with stored toast state when data exists', () => {
      const storedState = JSON.stringify({ step2Shown: true, step3Shown: false });
      mockSessionStorage.getItem.mockReturnValue(storedState);

      const { result } = renderHook(() => useRevealToast(testSessionCode));

      expect(result.current.shouldShowToast('step2')).toBe(false);
      expect(result.current.shouldShowToast('step3')).toBe(true);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith(expectedStorageKey);
    });

    test('should handle empty sessionCode gracefully', () => {
      const { result } = renderHook(() => useRevealToast(''));

      expect(result.current.shouldShowToast('step2')).toBe(false);
      expect(result.current.shouldShowToast('step3')).toBe(false);
      expect(mockSessionStorage.getItem).not.toHaveBeenCalled();
    });

    test('should handle sessionStorage errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const { result } = renderHook(() => useRevealToast(testSessionCode));

      expect(result.current.shouldShowToast('step2')).toBe(true);
      expect(result.current.shouldShowToast('step3')).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load reveal toast state from sessionStorage:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    test('should handle malformed JSON in storage', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockSessionStorage.getItem.mockReturnValue('invalid-json');

      const { result } = renderHook(() => useRevealToast(testSessionCode));

      expect(result.current.shouldShowToast('step2')).toBe(true);
      expect(result.current.shouldShowToast('step3')).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('markToastShown', () => {
    test('should mark step2 toast as shown and update storage', () => {
      const { result } = renderHook(() => useRevealToast(testSessionCode));

      // Initially both should show
      expect(result.current.shouldShowToast('step2')).toBe(true);
      expect(result.current.shouldShowToast('step3')).toBe(true);

      act(() => {
        result.current.markToastShown('step2');
      });

      // Only step2 should be marked as shown
      expect(result.current.shouldShowToast('step2')).toBe(false);
      expect(result.current.shouldShowToast('step3')).toBe(true);

      const expectedState = { step2Shown: true, step3Shown: false };
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(expectedStorageKey, JSON.stringify(expectedState));
    });

    test('should mark step3 toast as shown and update storage', () => {
      const { result } = renderHook(() => useRevealToast(testSessionCode));

      act(() => {
        result.current.markToastShown('step3');
      });

      expect(result.current.shouldShowToast('step2')).toBe(true);
      expect(result.current.shouldShowToast('step3')).toBe(false);

      const expectedState = { step2Shown: false, step3Shown: true };
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(expectedStorageKey, JSON.stringify(expectedState));
    });

    test('should handle marking both steps as shown', () => {
      const { result } = renderHook(() => useRevealToast(testSessionCode));

      act(() => {
        result.current.markToastShown('step2');
        result.current.markToastShown('step3');
      });

      expect(result.current.shouldShowToast('step2')).toBe(false);
      expect(result.current.shouldShowToast('step3')).toBe(false);

      const expectedFinalState = { step2Shown: true, step3Shown: true };
      expect(mockSessionStorage.setItem).toHaveBeenLastCalledWith(expectedStorageKey, JSON.stringify(expectedFinalState));
    });

    test('should handle sessionStorage setItem errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => useRevealToast(testSessionCode));

      act(() => {
        result.current.markToastShown('step2');
      });

      // State should still be updated even if storage fails
      expect(result.current.shouldShowToast('step2')).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save reveal toast state to sessionStorage:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('resetToasts', () => {
    test('should reset toast state and clear storage', () => {
      // Start with both toasts marked as shown
      const initialState = JSON.stringify({ step2Shown: true, step3Shown: true });
      mockSessionStorage.getItem.mockReturnValue(initialState);
      
      const { result } = renderHook(() => useRevealToast(testSessionCode));

      // Initially both should not show
      expect(result.current.shouldShowToast('step2')).toBe(false);
      expect(result.current.shouldShowToast('step3')).toBe(false);

      act(() => {
        result.current.resetToasts();
      });

      // Both should now show again
      expect(result.current.shouldShowToast('step2')).toBe(true);
      expect(result.current.shouldShowToast('step3')).toBe(true);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(expectedStorageKey);
    });

    test('should handle sessionStorage removeItem errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockSessionStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const { result } = renderHook(() => useRevealToast(testSessionCode));

      act(() => {
        result.current.resetToasts();
      });

      // State should still be updated even if storage fails
      expect(result.current.shouldShowToast('step2')).toBe(true);
      expect(result.current.shouldShowToast('step3')).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to reset reveal toast state:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Session isolation', () => {
    test('should use different storage keys for different sessions', () => {
      const session1 = 'ABC123';
      const session2 = 'XYZ789';

      const { result: result1 } = renderHook(() => useRevealToast(session1));
      const { result: result2 } = renderHook(() => useRevealToast(session2));

      act(() => {
        result1.current.markToastShown('step2');
      });

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        `leadership-values-reveal-toast-${session1}`,
        expect.stringContaining('step2Shown":true')
      );

      act(() => {
        result2.current.markToastShown('step3');
      });

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        `leadership-values-reveal-toast-${session2}`,
        expect.stringContaining('step3Shown":true')
      );
    });

    test('should maintain independent state per session', () => {
      // Mock storage to show different states for different sessions
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'leadership-values-reveal-toast-ABC123') {
          return JSON.stringify({ step2Shown: true, step3Shown: false });
        }
        if (key === 'leadership-values-reveal-toast-XYZ789') {
          return JSON.stringify({ step2Shown: false, step3Shown: true });
        }
        return null;
      });

      const { result: result1 } = renderHook(() => useRevealToast('ABC123'));
      const { result: result2 } = renderHook(() => useRevealToast('XYZ789'));

      // Session 1: step2 shown, step3 not shown
      expect(result1.current.shouldShowToast('step2')).toBe(false);
      expect(result1.current.shouldShowToast('step3')).toBe(true);

      // Session 2: step2 not shown, step3 shown  
      expect(result2.current.shouldShowToast('step2')).toBe(true);
      expect(result2.current.shouldShowToast('step3')).toBe(false);
    });
  });

  describe('Return value consistency', () => {
    test('should return all expected methods and properties', () => {
      const { result } = renderHook(() => useRevealToast(testSessionCode));

      expect(result.current).toHaveProperty('shouldShowToast');
      expect(result.current).toHaveProperty('markToastShown');
      expect(result.current).toHaveProperty('resetToasts');

      expect(typeof result.current.shouldShowToast).toBe('function');
      expect(typeof result.current.markToastShown).toBe('function');
      expect(typeof result.current.resetToasts).toBe('function');
    });

    test('shouldShowToast should handle invalid step values', () => {
      const { result } = renderHook(() => useRevealToast(testSessionCode));

      // Should handle invalid step gracefully
      expect(result.current.shouldShowToast('step2')).toBe(true);
      expect(result.current.shouldShowToast('step3')).toBe(true);
    });
  });

  describe('State transitions', () => {
    test('should handle complete lifecycle for both steps', () => {
      const { result } = renderHook(() => useRevealToast(testSessionCode));

      // Initial state - both should show
      expect(result.current.shouldShowToast('step2')).toBe(true);
      expect(result.current.shouldShowToast('step3')).toBe(true);

      // Mark step2 as shown
      act(() => {
        result.current.markToastShown('step2');
      });
      expect(result.current.shouldShowToast('step2')).toBe(false);
      expect(result.current.shouldShowToast('step3')).toBe(true);

      // Mark step3 as shown
      act(() => {
        result.current.markToastShown('step3');
      });
      expect(result.current.shouldShowToast('step2')).toBe(false);
      expect(result.current.shouldShowToast('step3')).toBe(false);

      // Reset all
      act(() => {
        result.current.resetToasts();
      });
      expect(result.current.shouldShowToast('step2')).toBe(true);
      expect(result.current.shouldShowToast('step3')).toBe(true);
    });
  });
});