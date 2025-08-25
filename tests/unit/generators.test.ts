import { 
  generateSessionCode, 
  generateCardId, 
  generateUniqueId, 
  createTimestamp, 
  addMinutes 
} from '../../lib/utils/generators';
import { SESSION_CODE_LENGTH, SESSION_CODE_PATTERN } from '../../lib/constants';

// Mock crypto for Node.js test environment
const mockGetRandomValues = jest.fn();
const mockRandomBytes = jest.fn();

// Setup crypto mock
(global as any).crypto = {
  getRandomValues: mockGetRandomValues
};

// Mock Node.js crypto module
jest.mock('crypto', () => ({
  randomBytes: mockRandomBytes
}));

describe('generators', () => {
  describe('generateSessionCode', () => {
    beforeEach(() => {
      mockGetRandomValues.mockReset();
      mockRandomBytes.mockReset();
      
      // Default mock: simulate browser crypto.getRandomValues
      mockGetRandomValues.mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      });
    });

    it('should generate code of correct length', () => {
      const code = generateSessionCode();
      expect(code).toHaveLength(SESSION_CODE_LENGTH);
      expect(mockGetRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
    });

    it('should generate code matching pattern', () => {
      const code = generateSessionCode();
      expect(code).toMatch(SESSION_CODE_PATTERN);
    });

    it('should generate unique codes', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateSessionCode());
      }
      expect(codes.size).toBe(100);
    });

    it('should use Node.js crypto when browser crypto is not available', () => {
      // Simulate Node.js environment
      (global as any).crypto = undefined;
      
      mockRandomBytes.mockReturnValue(Buffer.from([1, 2, 3, 4, 5, 6]));
      
      const code = generateSessionCode();
      expect(code).toHaveLength(SESSION_CODE_LENGTH);
      expect(mockRandomBytes).toHaveBeenCalledWith(SESSION_CODE_LENGTH);
      
      // Restore crypto for other tests
      (global as any).crypto = { getRandomValues: mockGetRandomValues };
    });

    it('should throw error when no crypto is available', () => {
      // Simulate environment with no crypto available
      (global as any).crypto = undefined;
      
      // Mock require to throw when trying to load crypto module
      const originalRequire = require;
      (global as any).require = jest.fn().mockImplementation((module) => {
        if (module === 'crypto') {
          throw new Error('Module not found');
        }
        return originalRequire(module);
      });
      
      expect(() => generateSessionCode()).toThrow('Node.js crypto module not available for secure random generation');
      
      // Restore environment
      (global as any).require = originalRequire;
      (global as any).crypto = { getRandomValues: mockGetRandomValues };
    });
  });

  describe('generateCardId', () => {
    it('should generate valid card ID from value name', () => {
      const id = generateCardId('Leadership');
      expect(id).toBe('card-leadership');
    });

    it('should handle special characters', () => {
      const id = generateCardId('Work-Life Balance!');
      expect(id).toBe('card-work-life-balance-');
    });

    it('should include index when provided', () => {
      const id = generateCardId('Integrity', 5);
      expect(id).toBe('card-integrity-5');
    });
  });

  describe('generateUniqueId', () => {
    it('should generate unique IDs with prefix', () => {
      const id1 = generateUniqueId('test');
      const id2 = generateUniqueId('test');
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^test-/);
      expect(id2).toMatch(/^test-/);
    });

    it('should use default prefix when none provided', () => {
      const id = generateUniqueId();
      expect(id).toMatch(/^id-/);
    });
  });

  describe('createTimestamp', () => {
    it('should create valid ISO timestamp', () => {
      const timestamp = createTimestamp();
      expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
  });

  describe('addMinutes', () => {
    it('should add minutes correctly', () => {
      const baseDate = new Date('2024-01-01T12:00:00Z');
      const result = addMinutes(baseDate, 30);
      expect(result.toISOString()).toBe('2024-01-01T12:30:00.000Z');
    });

    it('should handle negative minutes', () => {
      const baseDate = new Date('2024-01-01T12:00:00Z');
      const result = addMinutes(baseDate, -15);
      expect(result.toISOString()).toBe('2024-01-01T11:45:00.000Z');
    });
  });
});
