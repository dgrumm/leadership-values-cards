import {
  CardDistribution,
  ParticipantDeck,
  DistributionResult
} from '../../lib/game-logic/card-distribution';
import { CardDefinition } from '../../lib/types/card';

// Mock the shuffle functions
jest.mock('../../lib/game-logic/shuffle', () => ({
  generateParticipantDeck: jest.fn(),
  validateDeckCompleteness: jest.fn()
}));

import { generateParticipantDeck, validateDeckCompleteness } from '../../lib/game-logic/shuffle';

describe('CardDistribution', () => {
  const mockBaseDeck: CardDefinition[] = [
    { value_name: 'Trust', description: 'Trust description' },
    { value_name: 'Teamwork', description: 'Teamwork description' },
    { value_name: 'Leadership', description: 'Leadership description' }
  ];

  const mockGenerateParticipantDeck = generateParticipantDeck as jest.MockedFunction<typeof generateParticipantDeck>;
  const mockValidateDeckCompleteness = validateDeckCompleteness as jest.MockedFunction<typeof validateDeckCompleteness>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockGenerateParticipantDeck.mockImplementation((baseDeck) => [...baseDeck]);
    mockValidateDeckCompleteness.mockReturnValue({
      isValid: true,
      missing: [],
      duplicates: []
    });
  });

  describe('distributeCards', () => {
    it('should distribute cards to multiple participants successfully', () => {
      const participants = ['Alice', 'Bob', 'Charlie'];
      
      const result = CardDistribution.distributeCards(mockBaseDeck, participants);

      expect(result.success).toBe(true);
      expect(result.participants).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
      
      // Check each participant
      result.participants.forEach((participant, index) => {
        expect(participant.participantName).toBe(participants[index]);
        expect(participant.cards).toHaveLength(mockBaseDeck.length);
        expect(participant.totalCards).toBe(mockBaseDeck.length);
        expect(participant.createdAt).toBeDefined();
      });
    });

    it('should generate unique card IDs for each participant', () => {
      const participants = ['Alice', 'Bob'];
      
      const result = CardDistribution.distributeCards(mockBaseDeck, participants);

      const aliceCards = result.participants[0].cards;
      const bobCards = result.participants[1].cards;

      // All card IDs should be unique
      const allCardIds = [...aliceCards.map(c => c.id), ...bobCards.map(c => c.id)];
      const uniqueCardIds = new Set(allCardIds);
      expect(uniqueCardIds.size).toBe(allCardIds.length);

      // Cards should belong to correct participants
      aliceCards.forEach(card => {
        expect(card.owner).toBe('Alice');
        expect(card.id).toContain('alice');
      });

      bobCards.forEach(card => {
        expect(card.owner).toBe('Bob');
        expect(card.id).toContain('bob');
      });
    });

    it('should set correct initial card properties', () => {
      const result = CardDistribution.distributeCards(mockBaseDeck, ['Alice']);
      
      const cards = result.participants[0].cards;
      cards.forEach((card, index) => {
        expect(card.value_name).toBe(mockBaseDeck[index].value_name);
        expect(card.description).toBe(mockBaseDeck[index].description);
        expect(card.position).toEqual({ x: 0, y: 0 });
        expect(card.pile).toBe('deck');
        expect(card.owner).toBe('Alice');
        expect(card.id).toBeDefined();
      });
    });

    it('should return error for empty base deck', () => {
      const result = CardDistribution.distributeCards([], ['Alice']);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Base deck cannot be empty');
      expect(result.participants).toHaveLength(0);
    });

    it('should return error for no participants', () => {
      const result = CardDistribution.distributeCards(mockBaseDeck, []);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('At least one participant is required');
      expect(result.participants).toHaveLength(0);
    });

    it('should return error for duplicate participant names', () => {
      const result = CardDistribution.distributeCards(mockBaseDeck, ['Alice', 'Bob', 'Alice']);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Participant names must be unique');
      expect(result.participants).toHaveLength(0);
    });

    it('should handle deck validation failure', () => {
      mockValidateDeckCompleteness.mockReturnValue({
        isValid: false,
        missing: [mockBaseDeck[0]],
        duplicates: []
      });

      const result = CardDistribution.distributeCards(mockBaseDeck, ['Alice']);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('Deck validation failed'))).toBe(true);
    });

    it('should generate session ID when not provided', () => {
      const result = CardDistribution.distributeCards(mockBaseDeck, ['Alice']);

      expect(result.sessionId).toBeDefined();
      expect(result.sessionId).toContain('session');
    });

    it('should use provided session ID', () => {
      const sessionId = 'custom-session-id';
      const result = CardDistribution.distributeCards(mockBaseDeck, ['Alice'], sessionId);

      expect(result.sessionId).toBe(sessionId);
    });
  });

  describe('redistributeForParticipant', () => {
    it('should return existing cards if valid', () => {
      const existingCards = mockBaseDeck.map((cardDef, index) => ({
        id: `existing-${index}`,
        ...cardDef,
        position: { x: 10, y: 20 },
        pile: 'staging' as const,
        owner: 'Alice'
      }));

      mockValidateDeckCompleteness.mockReturnValue({
        isValid: true,
        missing: [],
        duplicates: []
      });

      const result = CardDistribution.redistributeForParticipant(
        mockBaseDeck, 
        'Alice', 
        'session-123', 
        existingCards
      );

      expect(result.participantName).toBe('Alice');
      expect(result.cards).toEqual(existingCards);
      expect(result.totalCards).toBe(existingCards.length);
    });

    it('should create new deck if existing cards invalid', () => {
      const invalidCards = [mockBaseDeck[0]].map((cardDef) => ({
        id: 'invalid-card',
        ...cardDef,
        position: { x: 0, y: 0 },
        pile: 'deck' as const,
        owner: 'Alice'
      }));

      // Mock the validation for the existing cards to fail
      mockValidateDeckCompleteness.mockReturnValueOnce({
        isValid: false,
        missing: [mockBaseDeck[1], mockBaseDeck[2]],
        duplicates: []
      });
      
      // Mock the validation for the new deck creation to succeed  
      mockValidateDeckCompleteness.mockReturnValueOnce({
        isValid: true,
        missing: [],
        duplicates: []
      });

      const result = CardDistribution.redistributeForParticipant(
        mockBaseDeck,
        'Alice',
        'session-123',
        invalidCards
      );

      expect(result.participantName).toBe('Alice');
      expect(result.cards).toHaveLength(mockBaseDeck.length);
      expect(result.cards).not.toEqual(invalidCards);
    });

    it('should create new deck if no existing cards provided', () => {
      const result = CardDistribution.redistributeForParticipant(
        mockBaseDeck,
        'Bob',
        'session-456'
      );

      expect(result.participantName).toBe('Bob');
      expect(result.cards).toHaveLength(mockBaseDeck.length);
      expect(result.totalCards).toBe(mockBaseDeck.length);
    });
  });

  describe('validateDistribution', () => {
    let validDistribution: DistributionResult;

    beforeEach(() => {
      validDistribution = CardDistribution.distributeCards(mockBaseDeck, ['Alice', 'Bob']);
    });

    it('should validate successful distribution', () => {
      const result = CardDistribution.validateDistribution(validDistribution, mockBaseDeck);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect failed distribution', () => {
      const failedDistribution: DistributionResult = {
        success: false,
        participants: [],
        errors: ['Test error'],
        sessionId: 'session-123'
      };

      const result = CardDistribution.validateDistribution(failedDistribution, mockBaseDeck);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Distribution was not successful');
    });

    it('should detect incorrect card count', () => {
      // Remove one card from first participant
      validDistribution.participants[0].cards.pop();

      const result = CardDistribution.validateDistribution(validDistribution, mockBaseDeck);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('has 2 cards, expected 3'))).toBe(true);
    });

    it('should detect duplicate card IDs within participant', () => {
      const firstCard = validDistribution.participants[0].cards[0];
      validDistribution.participants[0].cards[1].id = firstCard.id; // Create duplicate

      const result = CardDistribution.validateDistribution(validDistribution, mockBaseDeck);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('duplicate card IDs'))).toBe(true);
    });

    it('should detect wrong ownership', () => {
      validDistribution.participants[0].cards[0].owner = 'WrongOwner';

      const result = CardDistribution.validateDistribution(validDistribution, mockBaseDeck);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('wrong ownership'))).toBe(true);
    });

    it('should warn about high card count', () => {
      // Mock a distribution with many participants
      const manyParticipants: DistributionResult = {
        success: true,
        participants: new Array(100).fill(null).map((_, i) => ({
          participantName: `User${i}`,
          cards: new Array(25).fill(null).map((_, j) => ({
            id: `card-${i}-${j}`,
            value_name: `Value${j}`,
            description: 'Description',
            position: { x: 0, y: 0 },
            pile: 'deck' as const,
            owner: `User${i}`
          })),
          totalCards: 25,
          createdAt: Date.now()
        })),
        errors: [],
        sessionId: 'session-123'
      };

      const result = CardDistribution.validateDistribution(manyParticipants, []);

      expect(result.warnings.some(w => w.includes('High card count'))).toBe(true);
      expect(result.warnings.some(w => w.includes('High participant count'))).toBe(true);
    });
  });

  describe('getDistributionStats', () => {
    it('should return correct statistics', () => {
      const distribution = CardDistribution.distributeCards(mockBaseDeck, ['Alice', 'Bob', 'Charlie']);
      const stats = CardDistribution.getDistributionStats(distribution);

      expect(stats.totalParticipants).toBe(3);
      expect(stats.totalCards).toBe(9); // 3 participants × 3 cards
      expect(stats.cardsPerParticipant).toBe(3);
      expect(stats.avgCardsPerParticipant).toBe(3);
      expect(stats.sessionId).toBeDefined();
    });

    it('should handle empty distribution', () => {
      const emptyDistribution: DistributionResult = {
        success: true,
        participants: [],
        errors: [],
        sessionId: 'empty-session'
      };

      const stats = CardDistribution.getDistributionStats(emptyDistribution);

      expect(stats.totalParticipants).toBe(0);
      expect(stats.totalCards).toBe(0);
      expect(stats.cardsPerParticipant).toBe(0);
      expect(stats.avgCardsPerParticipant).toBe(0);
    });
  });
});