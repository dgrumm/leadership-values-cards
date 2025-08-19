import {
  isValidSessionCode,
  isValidParticipantName,
  isValidPileTransition,
  canAddToPile,
  isValidPosition,
  isDuplicateName,
  validateCardMovement
} from '../../lib/utils/validators';
import { CardPile } from '../../lib/types';

describe('validators', () => {
  describe('isValidSessionCode', () => {
    it('should accept valid 6-character alphanumeric codes', () => {
      expect(isValidSessionCode('ABC123')).toBe(true);
      expect(isValidSessionCode('XYZ789')).toBe(true);
      expect(isValidSessionCode('123ABC')).toBe(true);
    });

    it('should reject invalid codes', () => {
      expect(isValidSessionCode('abc123')).toBe(false); // lowercase
      expect(isValidSessionCode('AB12')).toBe(false); // too short
      expect(isValidSessionCode('ABC1234')).toBe(false); // too long
      expect(isValidSessionCode('ABC-12')).toBe(false); // special chars
      expect(isValidSessionCode('')).toBe(false); // empty
    });
  });

  describe('isValidParticipantName', () => {
    it('should accept valid names', () => {
      expect(isValidParticipantName('John')).toBe(true);
      expect(isValidParticipantName('Mary Jane')).toBe(true);
      expect(isValidParticipantName('A')).toBe(true); // min length
      expect(isValidParticipantName('A'.repeat(50))).toBe(true); // max length
    });

    it('should reject invalid names', () => {
      expect(isValidParticipantName('')).toBe(false); // empty
      expect(isValidParticipantName('   ')).toBe(false); // only spaces
      expect(isValidParticipantName('A'.repeat(51))).toBe(false); // too long
    });
  });

  describe('isValidPileTransition', () => {
    it('should allow valid transitions', () => {
      expect(isValidPileTransition('deck', 'staging')).toBe(true);
      expect(isValidPileTransition('staging', 'more')).toBe(true);
      expect(isValidPileTransition('staging', 'less')).toBe(true);
      expect(isValidPileTransition('more', 'top8')).toBe(true);
      expect(isValidPileTransition('top8', 'top3')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(isValidPileTransition('deck', 'more')).toBe(false);
      expect(isValidPileTransition('more', 'top3')).toBe(false);
      expect(isValidPileTransition('top3', 'deck')).toBe(false);
    });
  });

  describe('canAddToPile', () => {
    it('should allow adding to piles under capacity', () => {
      expect(canAddToPile('top8', 7)).toBe(true);
      expect(canAddToPile('top3', 2)).toBe(true);
      expect(canAddToPile('staging', 0)).toBe(true);
    });

    it('should reject adding to full piles', () => {
      expect(canAddToPile('top8', 8)).toBe(false);
      expect(canAddToPile('top3', 3)).toBe(false);
      expect(canAddToPile('staging', 1)).toBe(false);
    });

    it('should respect pile capacity limits', () => {
      expect(canAddToPile('more', 39)).toBe(true);
      expect(canAddToPile('more', 40)).toBe(false);
      expect(canAddToPile('less', 39)).toBe(true);
      expect(canAddToPile('less', 40)).toBe(false);
    });
  });

  describe('isValidPosition', () => {
    it('should accept positions within bounds', () => {
      expect(isValidPosition({ x: 0, y: 0 })).toBe(true);
      expect(isValidPosition({ x: 1000, y: 500 })).toBe(true);
      expect(isValidPosition({ x: -1000, y: -500 })).toBe(true);
    });

    it('should reject positions outside bounds', () => {
      expect(isValidPosition({ x: 3000, y: 0 })).toBe(false);
      expect(isValidPosition({ x: 0, y: 2000 })).toBe(false);
      expect(isValidPosition({ x: -3000, y: 0 })).toBe(false);
    });
  });

  describe('isDuplicateName', () => {
    const existingNames = ['John', 'Mary', 'Bob'];

    it('should detect duplicates case-insensitively', () => {
      expect(isDuplicateName('john', existingNames)).toBe(true);
      expect(isDuplicateName('MARY', existingNames)).toBe(true);
      expect(isDuplicateName('Bob', existingNames)).toBe(true);
    });

    it('should allow unique names', () => {
      expect(isDuplicateName('Alice', existingNames)).toBe(false);
      expect(isDuplicateName('Charlie', existingNames)).toBe(false);
    });
  });

  describe('validateCardMovement', () => {
    it('should validate successful card movement', () => {
      const result = validateCardMovement(
        'card-1',
        'staging',
        'more',
        { x: 100, y: 100 },
        10
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch multiple validation errors', () => {
      const result = validateCardMovement(
        '',
        'deck',
        'more', // invalid transition
        { x: 5000, y: 5000 }, // invalid position
        8 // over capacity for some piles
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Card ID is required');
      expect(result.errors).toContain('Invalid transition from deck to more');
      expect(result.errors).toContain('Position is outside canvas bounds');
    });
  });
});
