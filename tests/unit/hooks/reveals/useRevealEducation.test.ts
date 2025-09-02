import { renderHook, act } from '@testing-library/react';
import { useRevealEducation } from '../../../../hooks/reveals/useRevealEducation';

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

describe('useRevealEducation', () => {
  const testSessionCode = 'TEST123';
  const expectedStorageKey = `leadership-values-reveal-education-${testSessionCode}`;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  describe('Initialization', () => {
    test('should initialize with shouldShowEducation=true when no stored value exists', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useRevealEducation(testSessionCode));

      expect(result.current.shouldShowEducation).toBe(true);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith(expectedStorageKey);
    });

    test('should initialize with shouldShowEducation=false when education was already shown', () => {
      mockSessionStorage.getItem.mockReturnValue('true');

      const { result } = renderHook(() => useRevealEducation(testSessionCode));

      expect(result.current.shouldShowEducation).toBe(false);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith(expectedStorageKey);
    });

    test('should handle empty sessionCode gracefully', () => {
      const { result } = renderHook(() => useRevealEducation(''));

      // Should be loaded and not show education for empty session code
      expect(result.current.shouldShowEducation).toBe(false);
      expect(mockSessionStorage.getItem).not.toHaveBeenCalled();
    });

    test('should handle sessionStorage errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      // Should not throw an error
      const { result } = renderHook(() => useRevealEducation(testSessionCode));

      expect(result.current.shouldShowEducation).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load reveal education state from sessionStorage:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('markEducationShown', () => {
    test('should mark education as shown and update state', () => {
      const { result } = renderHook(() => useRevealEducation(testSessionCode));

      // Initially should show education
      expect(result.current.shouldShowEducation).toBe(true);

      act(() => {
        result.current.markEducationShown();
      });

      // Should now not show education
      expect(result.current.shouldShowEducation).toBe(false);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(expectedStorageKey, 'true');
    });

    test('should handle sessionStorage setItem errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => useRevealEducation(testSessionCode));

      // Should not throw an error
      act(() => {
        result.current.markEducationShown();
      });

      // State should still be updated even if storage fails
      expect(result.current.shouldShowEducation).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save reveal education state to sessionStorage:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('resetEducation', () => {
    test('should reset education state and clear storage', () => {
      // Start with education already shown
      mockSessionStorage.getItem.mockReturnValue('true');
      
      const { result } = renderHook(() => useRevealEducation(testSessionCode));

      // Initially should not show education
      expect(result.current.shouldShowEducation).toBe(false);

      act(() => {
        result.current.resetEducation();
      });

      // Should now show education again
      expect(result.current.shouldShowEducation).toBe(true);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(expectedStorageKey);
    });

    test('should handle sessionStorage removeItem errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      mockSessionStorage.removeItem.mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      const { result } = renderHook(() => useRevealEducation(testSessionCode));

      // Should not throw an error
      act(() => {
        result.current.resetEducation();
      });

      // State should still be updated even if storage fails
      expect(result.current.shouldShowEducation).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to reset reveal education state:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Session isolation', () => {
    test('should use different storage keys for different sessions', () => {
      const session1 = 'ABC123';
      const session2 = 'XYZ789';

      const { result: result1 } = renderHook(() => useRevealEducation(session1));
      const { result: result2 } = renderHook(() => useRevealEducation(session2));

      act(() => {
        result1.current.markEducationShown();
      });

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        `leadership-values-reveal-education-${session1}`,
        'true'
      );

      act(() => {
        result2.current.markEducationShown();
      });

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        `leadership-values-reveal-education-${session2}`,
        'true'
      );
    });

    test('should maintain independent state per session', () => {
      // Mock storage to show education already seen for session1 but not session2
      mockSessionStorage.getItem.mockImplementation((key) => {
        if (key === 'leadership-values-reveal-education-ABC123') {
          return 'true';
        }
        return null;
      });

      const { result: result1 } = renderHook(() => useRevealEducation('ABC123'));
      const { result: result2 } = renderHook(() => useRevealEducation('XYZ789'));

      expect(result1.current.shouldShowEducation).toBe(false); // Already shown
      expect(result2.current.shouldShowEducation).toBe(true);  // Not shown yet
    });
  });

  describe('Return value consistency', () => {
    test('should return all expected methods and properties', () => {
      const { result } = renderHook(() => useRevealEducation(testSessionCode));

      expect(result.current).toHaveProperty('shouldShowEducation');
      expect(result.current).toHaveProperty('markEducationShown');
      expect(result.current).toHaveProperty('resetEducation');

      expect(typeof result.current.shouldShowEducation).toBe('boolean');
      expect(typeof result.current.markEducationShown).toBe('function');
      expect(typeof result.current.resetEducation).toBe('function');
    });
  });

  describe('State transitions', () => {
    test('should handle complete lifecycle: initial -> shown -> reset', () => {
      const { result } = renderHook(() => useRevealEducation(testSessionCode));

      // Initial state
      expect(result.current.shouldShowEducation).toBe(true);

      // Mark as shown
      act(() => {
        result.current.markEducationShown();
      });
      expect(result.current.shouldShowEducation).toBe(false);

      // Reset
      act(() => {
        result.current.resetEducation();
      });
      expect(result.current.shouldShowEducation).toBe(true);
    });

    test('should handle multiple markEducationShown calls', () => {
      const { result } = renderHook(() => useRevealEducation(testSessionCode));

      act(() => {
        result.current.markEducationShown();
        result.current.markEducationShown();
        result.current.markEducationShown();
      });

      expect(result.current.shouldShowEducation).toBe(false);
      expect(mockSessionStorage.setItem).toHaveBeenCalledTimes(3);
    });

    test('should handle multiple resetEducation calls', () => {
      const { result } = renderHook(() => useRevealEducation(testSessionCode));

      act(() => {
        result.current.resetEducation();
        result.current.resetEducation();
        result.current.resetEducation();
      });

      expect(result.current.shouldShowEducation).toBe(true);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledTimes(3);
    });
  });

  describe('Browser compatibility', () => {
    test('should handle undefined sessionStorage', () => {
      // Temporarily remove sessionStorage
      const originalSessionStorage = window.sessionStorage;
      delete (window as any).sessionStorage;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() => useRevealEducation(testSessionCode));

      // Should default to showing education
      expect(result.current.shouldShowEducation).toBe(true);

      // Methods should work without throwing
      act(() => {
        result.current.markEducationShown();
      });

      // Should still update state even if storage fails
      expect(result.current.shouldShowEducation).toBe(false);

      // Restore sessionStorage and cleanup
      window.sessionStorage = originalSessionStorage;
      consoleSpy.mockRestore();
    });
  });
});