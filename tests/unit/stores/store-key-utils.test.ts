/**
 * Unit tests for store key utilities
 * Tests key generation, validation, and extraction functions
 */

import {
  generateStoreKey,
  validateSessionCode,
  validateParticipantId,
  validateStoreKey,
  extractSessionCode,
  extractParticipantId,
  getSessionParticipantKeys
} from '../../../lib/stores/store-key-utils';

describe('Store Key Utils', () => {
  describe('validateSessionCode', () => {
    it('should accept valid session codes', () => {
      expect(validateSessionCode('ABC123')).toBe(true);
      expect(validateSessionCode('XYZ999')).toBe(true);
      expect(validateSessionCode('000000')).toBe(true);
      expect(validateSessionCode('ZZZZZZ')).toBe(true);
    });

    it('should reject invalid session codes', () => {
      expect(validateSessionCode('')).toBe(false);
      expect(validateSessionCode('abc123')).toBe(false); // lowercase
      expect(validateSessionCode('ABC12')).toBe(false);  // too short
      expect(validateSessionCode('ABC1234')).toBe(false); // too long
      expect(validateSessionCode('ABC-12')).toBe(false);  // special chars
      expect(validateSessionCode('ABC 12')).toBe(false);  // space
      expect(validateSessionCode(null as any)).toBe(false); // null
      expect(validateSessionCode(undefined as any)).toBe(false); // undefined
    });
  });

  describe('validateParticipantId', () => {
    it('should accept valid participant IDs', () => {
      expect(validateParticipantId('user123')).toBe(true);
      expect(validateParticipantId('user-456')).toBe(true);
      expect(validateParticipantId('user_789')).toBe(true);
      expect(validateParticipantId('USER123')).toBe(true);
      expect(validateParticipantId('a')).toBe(true); // single character
      expect(validateParticipantId('user-uuid-123-456')).toBe(true);
    });

    it('should reject invalid participant IDs', () => {
      expect(validateParticipantId('')).toBe(false); // empty
      expect(validateParticipantId('user 123')).toBe(false); // space
      expect(validateParticipantId('user@123')).toBe(false); // special chars
      expect(validateParticipantId('user.123')).toBe(false); // dot
      expect(validateParticipantId('user+123')).toBe(false); // plus
      expect(validateParticipantId(null as any)).toBe(false); // null
      expect(validateParticipantId(undefined as any)).toBe(false); // undefined
    });
  });

  describe('generateStoreKey', () => {
    it('should generate valid store keys', () => {
      const key1 = generateStoreKey('ABC123', 'user456');
      expect(key1).toBe('ABC123:user456');
      
      const key2 = generateStoreKey('XYZ999', 'participant-uuid-789');
      expect(key2).toBe('XYZ999:participant-uuid-789');
    });

    it('should validate inputs and throw for invalid session codes', () => {
      expect(() => generateStoreKey('abc123', 'user456')).toThrow('Invalid session code format');
      expect(() => generateStoreKey('ABC12', 'user456')).toThrow('Invalid session code format');
      expect(() => generateStoreKey('', 'user456')).toThrow('Invalid session code format');
    });

    it('should validate inputs and throw for invalid participant IDs', () => {
      expect(() => generateStoreKey('ABC123', '')).toThrow('Invalid participant ID format');
      expect(() => generateStoreKey('ABC123', 'user 456')).toThrow('Invalid participant ID format');
      expect(() => generateStoreKey('ABC123', 'user@456')).toThrow('Invalid participant ID format');
    });
  });

  describe('validateStoreKey', () => {
    it('should accept valid store keys', () => {
      expect(validateStoreKey('ABC123:user456')).toBe(true);
      expect(validateStoreKey('XYZ999:participant-uuid-789')).toBe(true);
      expect(validateStoreKey('000000:a')).toBe(true);
    });

    it('should reject invalid store keys', () => {
      expect(validateStoreKey('')).toBe(false);
      expect(validateStoreKey('ABC123')).toBe(false); // no colon
      expect(validateStoreKey(':user456')).toBe(false); // empty session
      expect(validateStoreKey('ABC123:')).toBe(false); // empty participant
      expect(validateStoreKey('abc123:user456')).toBe(false); // invalid session
      expect(validateStoreKey('ABC123:user 456')).toBe(false); // invalid participant
      expect(validateStoreKey('ABC123:user456:extra')).toBe(false); // too many parts
      expect(validateStoreKey(null as any)).toBe(false); // null
    });
  });

  describe('extractSessionCode', () => {
    it('should extract session code from valid store keys', () => {
      expect(extractSessionCode('ABC123:user456')).toBe('ABC123');
      expect(extractSessionCode('XYZ999:participant-789')).toBe('XYZ999');
    });

    it('should throw for invalid store keys', () => {
      expect(() => extractSessionCode('invalid')).toThrow('Invalid store key format');
      expect(() => extractSessionCode('ABC123')).toThrow('Invalid store key format');
      expect(() => extractSessionCode('')).toThrow('Invalid store key format');
    });
  });

  describe('extractParticipantId', () => {
    it('should extract participant ID from valid store keys', () => {
      expect(extractParticipantId('ABC123:user456')).toBe('user456');
      expect(extractParticipantId('XYZ999:participant-789')).toBe('participant-789');
    });

    it('should throw for invalid store keys', () => {
      expect(() => extractParticipantId('invalid')).toThrow('Invalid store key format');
      expect(() => extractParticipantId('ABC123')).toThrow('Invalid store key format');
      expect(() => extractParticipantId('')).toThrow('Invalid store key format');
    });
  });

  describe('getSessionParticipantKeys', () => {
    const sampleKeys = [
      'ABC123:user1',
      'ABC123:user2',
      'ABC123:user3',
      'XYZ999:user1',
      'XYZ999:user4',
      'DEF456:user5',
      'invalid-key',
      'ABC123' // invalid format
    ];

    it('should return all participant keys for a session', () => {
      const abc123Keys = getSessionParticipantKeys(sampleKeys, 'ABC123');
      expect(abc123Keys).toEqual(['ABC123:user1', 'ABC123:user2', 'ABC123:user3']);
      
      const xyz999Keys = getSessionParticipantKeys(sampleKeys, 'XYZ999');
      expect(xyz999Keys).toEqual(['XYZ999:user1', 'XYZ999:user4']);
      
      const def456Keys = getSessionParticipantKeys(sampleKeys, 'DEF456');
      expect(def456Keys).toEqual(['DEF456:user5']);
    });

    it('should return empty array for non-existent sessions', () => {
      const result = getSessionParticipantKeys(sampleKeys, 'NOEXIST');
      expect(result).toEqual([]);
    });

    it('should throw for invalid session codes', () => {
      expect(() => getSessionParticipantKeys(sampleKeys, 'invalid')).toThrow('Invalid session code');
      expect(() => getSessionParticipantKeys(sampleKeys, '')).toThrow('Invalid session code');
    });

    it('should filter out invalid keys', () => {
      const keysWithInvalid = ['ABC123:user1', 'invalid-key', 'ABC123:user2', 'ABC123'];
      const result = getSessionParticipantKeys(keysWithInvalid, 'ABC123');
      expect(result).toEqual(['ABC123:user1', 'ABC123:user2']);
    });
  });
});