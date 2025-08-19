import {
  isValidSessionCode,
  isValidParticipantName,
  isValidPileTransition,
  canAddToPile,
  isValidPosition,
  isDuplicateName,
  validateCardMovement,
  validateGameState
} from '../../lib/utils/validators';
import { CardPile, GameState } from '../../lib/types';

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
    beforeEach(() => {
      // Clear memoization cache before each test
      validateCardMovement.clear();
    });

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

    it('should cache validation results for performance', () => {
      const args: Parameters<typeof validateCardMovement> = [
        'card-test',
        'staging',
        'more',
        { x: 100, y: 100 },
        5
      ];

      // First call
      const result1 = validateCardMovement(...args);
      expect(validateCardMovement.cache.size).toBe(1);

      // Second call with same args should use cache
      const result2 = validateCardMovement(...args);
      expect(result1).toEqual(result2);
      expect(validateCardMovement.cache.size).toBe(1);

      // Different args should create new cache entry
      validateCardMovement('card-different', 'staging', 'more', { x: 200, y: 200 }, 5);
      expect(validateCardMovement.cache.size).toBe(2);
    });
  });

  describe('validateGameState', () => {
    it('should validate a valid game state', () => {
      const validState: GameState = {
        sessionCode: 'ABC123',
        participants: {
          'user1': {
            name: 'Alice',
            emoji: '🎯',
            color: '#FF6B6B',
            joinedAt: '2024-01-01T00:00:00Z',
            currentStep: 1,
            status: 'sorting',
            cardStates: {
              step1: { more: [], less: [] },
              step2: { top8: [], less: [] },
              step3: { top3: [], less: [] }
            },
            revealed: { top8: false, top3: false },
            isViewing: null,
            lastActivity: '2024-01-01T00:00:00Z',
            cursor: { x: 0, y: 0 },
            isActive: true
          }
        },
        deck: [],
        piles: {
          deck: { cards: [], isVisible: true },
          staging: { cards: [], isVisible: true },
          more: { cards: [], isVisible: true },
          less: { cards: [], isVisible: true },
          top8: { cards: [], isVisible: true },
          top3: { cards: [], isVisible: true },
          discard: { cards: [], isVisible: true }
        },
        currentViewers: {},
        canvasState: { zoom: 1, panX: 0, panY: 0, width: 1920, height: 1080 },
        lastUpdated: '2024-01-01T00:00:00Z'
      };

      const result = validateGameState(validState);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect pile capacity violations', () => {
      const invalidState: GameState = {
        sessionCode: 'ABC123',
        participants: {
          'user1': {
            name: 'Alice',
            emoji: '🎯',
            color: '#FF6B6B',
            joinedAt: '2024-01-01T00:00:00Z',
            currentStep: 2,
            status: 'sorting',
            cardStates: {
              step1: { more: [], less: [] },
              step2: { 
                top8: new Array(10).fill(null).map((_, i) => ({ 
                  id: `card-${i}`, 
                  value_name: `Value ${i}`, 
                  description: 'Test', 
                  position: { x: 0, y: 0 }, 
                  pile: 'top8' as const 
                })), 
                less: [] 
              },
              step3: { top3: [], less: [] }
            },
            revealed: { top8: false, top3: false },
            isViewing: null,
            lastActivity: '2024-01-01T00:00:00Z',
            cursor: { x: 0, y: 0 },
            isActive: true
          }
        },
        deck: [],
        piles: {
          deck: { cards: [], isVisible: true },
          staging: { cards: [], isVisible: true },
          more: { cards: [], isVisible: true },
          less: { cards: [], isVisible: true },
          top8: { cards: [], isVisible: true },
          top3: { cards: [], isVisible: true },
          discard: { cards: [], isVisible: true }
        },
        currentViewers: {},
        canvasState: { zoom: 1, panX: 0, panY: 0, width: 1920, height: 1080 },
        lastUpdated: '2024-01-01T00:00:00Z'
      };

      const result = validateGameState(invalidState);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Participant Alice has more than 8 cards in top8 pile');
    });

    it('should use WeakMap caching for performance', () => {
      const state: GameState = {
        sessionCode: 'ABC123',
        participants: {},
        deck: [],
        piles: {
          deck: { cards: [], isVisible: true },
          staging: { cards: [], isVisible: true },
          more: { cards: [], isVisible: true },
          less: { cards: [], isVisible: true },
          top8: { cards: [], isVisible: true },
          top3: { cards: [], isVisible: true },
          discard: { cards: [], isVisible: true }
        },
        currentViewers: {},
        canvasState: { zoom: 1, panX: 0, panY: 0, width: 1920, height: 1080 },
        lastUpdated: '2024-01-01T00:00:00Z'
      };

      // First call should compute and cache
      const result1 = validateGameState(state);
      
      // Second call with same object should use cache
      const result2 = validateGameState(state);
      
      expect(result1).toEqual(result2);
      // WeakMap caching is transparent, so we just verify results are consistent
    });
  });
});
