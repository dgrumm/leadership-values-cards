import { describe, it, expect } from '@jest/globals';
import {
  validateSessionCode,
  validateParticipantName,
  resolveNameConflict,
  sanitizeParticipantName,
  SESSION_VALIDATION_ERRORS
} from '@/lib/session/session-validator';

describe('SessionValidator', () => {
  describe('validateSessionCode', () => {
    it('should accept valid 6-character alphanumeric codes', () => {
      const validCodes = ['ABC123', 'XYZ789', '123456', 'ABCDEF'];
      
      validCodes.forEach(code => {
        const result = validateSessionCode(code);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject empty or null codes', () => {
      const invalidCodes = ['', null as any, undefined as any];
      
      invalidCodes.forEach(code => {
        const result = validateSessionCode(code);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(SESSION_VALIDATION_ERRORS.INVALID_SESSION_CODE);
      });
    });

    it('should reject codes with wrong length', () => {
      const invalidCodes = ['ABC12', 'ABC1234', 'A', 'ABCDEFG'];
      
      invalidCodes.forEach(code => {
        const result = validateSessionCode(code);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(SESSION_VALIDATION_ERRORS.INVALID_SESSION_CODE);
      });
    });

    it('should reject codes with invalid characters', () => {
      const invalidCodes = ['ABC-12', 'ABC@12', 'ABC 12', 'abc123'];
      
      invalidCodes.forEach(code => {
        const result = validateSessionCode(code);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(SESSION_VALIDATION_ERRORS.INVALID_SESSION_CODE);
      });
    });
  });

  describe('validateParticipantName', () => {
    it('should accept valid names', () => {
      const validNames = ['John', 'Jane Doe', 'John-Smith', 'User_123', 'A'];
      
      validNames.forEach(name => {
        const result = validateParticipantName(name);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject empty or null names', () => {
      const invalidNames = ['', null as any, undefined as any];
      
      invalidNames.forEach(name => {
        const result = validateParticipantName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(SESSION_VALIDATION_ERRORS.INVALID_PARTICIPANT_NAME);
      });
    });

    it('should reject names that are too long', () => {
      const longName = 'A'.repeat(51);
      const result = validateParticipantName(longName);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(SESSION_VALIDATION_ERRORS.INVALID_PARTICIPANT_NAME);
    });

    it('should reject names with invalid characters', () => {
      const invalidNames = ['John@Doe', 'Jane#Smith', 'User!123', 'Test$Name'];
      
      invalidNames.forEach(name => {
        const result = validateParticipantName(name);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(SESSION_VALIDATION_ERRORS.INVALID_PARTICIPANT_NAME);
      });
    });

    it('should accept names at length boundaries', () => {
      const minName = 'A';
      const maxName = 'A'.repeat(50);
      
      expect(validateParticipantName(minName).isValid).toBe(true);
      expect(validateParticipantName(maxName).isValid).toBe(true);
    });
  });

  describe('resolveNameConflict', () => {
    it('should return original name when no conflict', () => {
      const existingNames = new Set(['Jane', 'Bob']);
      const result = resolveNameConflict('John', existingNames);
      
      expect(result).toBe('John');
    });

    it('should append -2 for first conflict', () => {
      const existingNames = new Set(['John', 'Jane']);
      const result = resolveNameConflict('John', existingNames);
      
      expect(result).toBe('John-2');
    });

    it('should increment number for multiple conflicts', () => {
      const existingNames = new Set(['John', 'John-2', 'John-3']);
      const result = resolveNameConflict('John', existingNames);
      
      expect(result).toBe('John-4');
    });

    it('should handle gaps in numbering', () => {
      const existingNames = new Set(['John', 'John-2', 'John-5']);
      const result = resolveNameConflict('John', existingNames);
      
      expect(result).toBe('John-3'); // Should fill the gap
    });

    it('should fallback to timestamp when counter exceeds 100', () => {
      // Create a large set of existing names to trigger fallback
      const existingNames = new Set(['John']);
      for (let i = 2; i <= 101; i++) {
        existingNames.add(`John-${i}`);
      }
      
      const result = resolveNameConflict('John', existingNames);
      
      expect(result).toMatch(/^John-\d{4}$/); // Should match John-XXXX pattern
      expect(result).not.toBe('John-102'); // Should not be the normal increment
    });
  });

  describe('sanitizeParticipantName', () => {
    it('should trim whitespace', () => {
      const result = sanitizeParticipantName('  John  ');
      expect(result).toBe('John');
    });

    it('should normalize multiple spaces', () => {
      const result = sanitizeParticipantName('John    Doe');
      expect(result).toBe('John Doe');
    });

    it('should handle mixed whitespace', () => {
      const result = sanitizeParticipantName('  John   Doe  Smith  ');
      expect(result).toBe('John Doe Smith');
    });

    it('should preserve valid characters', () => {
      const result = sanitizeParticipantName('John-Smith_123');
      expect(result).toBe('John-Smith_123');
    });

    it('should handle empty string', () => {
      const result = sanitizeParticipantName('   ');
      expect(result).toBe('');
    });
  });
});