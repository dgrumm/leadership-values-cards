import { 
  generateSessionCode, 
  generateCardId, 
  generateUniqueId, 
  createTimestamp, 
  addMinutes 
} from '../../lib/utils/generators';
import { SESSION_CODE_LENGTH, SESSION_CODE_PATTERN } from '../../lib/constants';

describe('generators', () => {
  describe('generateSessionCode', () => {
    it('should generate code of correct length', () => {
      const code = generateSessionCode();
      expect(code).toHaveLength(SESSION_CODE_LENGTH);
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
