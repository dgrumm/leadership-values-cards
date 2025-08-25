import { generateSessionCode, generateUniqueSessionCode, isValidSessionCodeFormat } from '@/lib/utils/session-codes';

// Mock fetch globally
global.fetch = jest.fn();

describe('session-codes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('generateSessionCode', () => {
    it('should generate a 6-character code', () => {
      const code = generateSessionCode();
      expect(code).toHaveLength(6);
    });

    it('should only contain valid characters (A-Z, 0-9)', () => {
      const code = generateSessionCode();
      expect(/^[A-Z0-9]{6}$/.test(code)).toBe(true);
    });

    it('should generate different codes on subsequent calls', () => {
      const codes = new Set();
      
      // Generate 100 codes to check for uniqueness
      for (let i = 0; i < 100; i++) {
        codes.add(generateSessionCode());
      }
      
      // Should have high uniqueness (at least 90% unique)
      expect(codes.size).toBeGreaterThan(90);
    });

    it('should use all possible characters in generated codes', () => {
      const allChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const usedChars = new Set<string>();
      
      // Generate many codes to get good character coverage
      for (let i = 0; i < 1000; i++) {
        const code = generateSessionCode();
        for (const char of code) {
          usedChars.add(char);
        }
      }
      
      // Should use most characters (at least 30 out of 36)
      expect(usedChars.size).toBeGreaterThan(30);
      
      // All used characters should be valid
      for (const char of usedChars) {
        expect(allChars.includes(char)).toBe(true);
      }
    });
  });

  describe('generateUniqueSessionCode', () => {
    it('should return code when session does not exist (404)', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        status: 404
      });

      const code = await generateUniqueSessionCode();
      
      expect(code).toHaveLength(6);
      expect(/^[A-Z0-9]{6}$/.test(code)).toBe(true);
      expect(fetch).toHaveBeenCalledWith(`/api/sessions/${code}`, {
        method: 'GET'
      });
    });

    it('should retry when session exists and find available code', async () => {
      const mockFetch = fetch as jest.Mock;
      
      // First call returns 200 (exists), second call returns 404 (available)
      mockFetch
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce({ status: 404 });

      const code = await generateUniqueSessionCode();
      
      expect(code).toHaveLength(6);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should return code when network error occurs', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const code = await generateUniqueSessionCode();
      
      expect(code).toHaveLength(6);
      expect(/^[A-Z0-9]{6}$/.test(code)).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should return fallback code with timestamp when max attempts reached', async () => {
      // Mock all attempts to return 200 (session exists)
      (fetch as jest.Mock).mockResolvedValue({ status: 200 });
      
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1634567890123);

      const code = await generateUniqueSessionCode();
      
      expect(code).toHaveLength(6);
      expect(code.slice(-2)).toBe('23'); // Last 2 digits of timestamp
      expect(/^[A-Z0-9]{4}23$/.test(code)).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(10); // Max attempts
      
      Date.now = originalDateNow;
    });

    it('should handle different response statuses', async () => {
      const mockFetch = fetch as jest.Mock;
      
      // Test various non-404 statuses, then 404
      mockFetch
        .mockResolvedValueOnce({ status: 200 })
        .mockResolvedValueOnce({ status: 500 })
        .mockResolvedValueOnce({ status: 403 })
        .mockResolvedValueOnce({ status: 404 });

      const code = await generateUniqueSessionCode();
      
      expect(code).toHaveLength(6);
      expect(fetch).toHaveBeenCalledTimes(4);
    });

    it('should generate different codes on retry attempts', async () => {
      const mockFetch = fetch as jest.Mock;
      const codes: string[] = [];
      
      // Mock to capture the codes being checked
      mockFetch.mockImplementation((url: string) => {
        const code = url.split('/').pop();
        codes.push(code!);
        
        // First two attempts return 200 (exists), third returns 404
        if (codes.length < 3) {
          return Promise.resolve({ status: 200 });
        }
        return Promise.resolve({ status: 404 });
      });

      await generateUniqueSessionCode();
      
      expect(codes).toHaveLength(3);
      expect(codes[0]).not.toBe(codes[1]);
      expect(codes[1]).not.toBe(codes[2]);
    });
  });

  describe('isValidSessionCodeFormat', () => {
    it('should return true for valid 6-character codes', () => {
      expect(isValidSessionCodeFormat('ABC123')).toBe(true);
      expect(isValidSessionCodeFormat('XXXXXX')).toBe(true);
      expect(isValidSessionCodeFormat('000000')).toBe(true);
      expect(isValidSessionCodeFormat('Z9Z9Z9')).toBe(true);
    });

    it('should return false for invalid lengths', () => {
      expect(isValidSessionCodeFormat('ABC12')).toBe(false); // Too short
      expect(isValidSessionCodeFormat('ABC1234')).toBe(false); // Too long
      expect(isValidSessionCodeFormat('')).toBe(false); // Empty
      expect(isValidSessionCodeFormat('A')).toBe(false); // Single character
    });

    it('should return false for invalid characters', () => {
      expect(isValidSessionCodeFormat('ABC12a')).toBe(false); // Lowercase
      expect(isValidSessionCodeFormat('ABC12@')).toBe(false); // Symbol
      expect(isValidSessionCodeFormat('ABC 23')).toBe(false); // Space
      expect(isValidSessionCodeFormat('ABC-23')).toBe(false); // Hyphen
      expect(isValidSessionCodeFormat('ABC.23')).toBe(false); // Period
    });

    it('should handle edge cases', () => {
      expect(isValidSessionCodeFormat('abc123')).toBe(false); // All lowercase
      expect(isValidSessionCodeFormat('AbC123')).toBe(false); // Mixed case
      expect(isValidSessionCodeFormat('ABC12\n')).toBe(false); // With newline
      expect(isValidSessionCodeFormat('ABC12\t')).toBe(false); // With tab
    });

    it('should handle non-string inputs', () => {
      // The regex test() method converts inputs to strings, so some may pass
      // @ts-expect-error Testing invalid input types
      expect(isValidSessionCodeFormat(null)).toBe(false); // 'null'
      // @ts-expect-error Testing invalid input types
      expect(isValidSessionCodeFormat(undefined)).toBe(false); // 'undefined'
      // @ts-expect-error Testing invalid input types  
      expect(isValidSessionCodeFormat(123456)).toBe(true); // '123456' - valid format
      // @ts-expect-error Testing invalid input types
      expect(isValidSessionCodeFormat(['A', 'B', 'C', '1', '2', '3'])).toBe(false); // 'A,B,C,1,2,3'
    });
  });

  describe('Integration', () => {
    it('should generate codes that pass format validation', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateSessionCode();
        expect(isValidSessionCodeFormat(code)).toBe(true);
      }
    });

    it('should generate unique codes that pass format validation', async () => {
      (fetch as jest.Mock).mockResolvedValue({ status: 404 });

      for (let i = 0; i < 10; i++) {
        const code = await generateUniqueSessionCode();
        expect(isValidSessionCodeFormat(code)).toBe(true);
      }
    });

    it('should generate fallback codes that pass format validation', async () => {
      (fetch as jest.Mock).mockResolvedValue({ status: 200 });
      
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1234567890123);

      const code = await generateUniqueSessionCode();
      expect(isValidSessionCodeFormat(code)).toBe(true);
      
      Date.now = originalDateNow;
    });
  });
});