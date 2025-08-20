import {
  shuffleDeck,
  generateParticipantDeck,
  validateShuffleRandomness,
  generateMultipleShuffles,
  validateDeckCompleteness
} from '../../lib/game-logic/shuffle';
import { CardDefinition } from '../../lib/types/card';

describe('Shuffle Functions', () => {
  const mockDeck: CardDefinition[] = [
    { value_name: 'Trust', description: 'Trust description' },
    { value_name: 'Teamwork', description: 'Teamwork description' },
    { value_name: 'Honesty', description: 'Honesty description' },
    { value_name: 'Integrity', description: 'Integrity description' },
    { value_name: 'Leadership', description: 'Leadership description' }
  ];

  describe('shuffleDeck', () => {
    it('should return array of same length', () => {
      const shuffled = shuffleDeck(mockDeck);
      expect(shuffled).toHaveLength(mockDeck.length);
    });

    it('should contain all original elements', () => {
      const shuffled = shuffleDeck(mockDeck);
      mockDeck.forEach(card => {
        expect(shuffled).toContainEqual(card);
      });
    });

    it('should not modify original array', () => {
      const original = [...mockDeck];
      shuffleDeck(mockDeck);
      expect(mockDeck).toEqual(original);
    });

    it('should produce different results on multiple calls', () => {
      // Run multiple times to ensure at least one difference
      let foundDifference = false;
      for (let i = 0; i < 10; i++) {
        const shuffle1 = shuffleDeck(mockDeck);
        const shuffle2 = shuffleDeck(mockDeck);
        
        const identical = shuffle1.every((card, index) => 
          card.value_name === shuffle2[index].value_name
        );
        
        if (!identical) {
          foundDifference = true;
          break;
        }
      }
      expect(foundDifference).toBe(true);
    });

    it('should handle empty array', () => {
      const result = shuffleDeck([]);
      expect(result).toEqual([]);
    });

    it('should handle single element array', () => {
      const singleCard = [mockDeck[0]];
      const result = shuffleDeck(singleCard);
      expect(result).toEqual(singleCard);
    });
  });

  describe('generateParticipantDeck', () => {
    it('should return shuffled deck for participant', () => {
      const result = generateParticipantDeck(mockDeck, 'Alice');
      expect(result).toHaveLength(mockDeck.length);
      mockDeck.forEach(card => {
        expect(result).toContainEqual(card);
      });
    });

    it('should produce different shuffles for different participants', () => {
      const deck1 = generateParticipantDeck(mockDeck, 'Alice');
      const deck2 = generateParticipantDeck(mockDeck, 'Bob');
      
      // Should be different shuffles (very high probability)
      const identical = deck1.every((card, index) => 
        card.value_name === deck2[index].value_name
      );
      expect(identical).toBe(false);
    });
  });

  describe('validateShuffleRandomness', () => {
    it('should return true for well-shuffled array', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = [5, 1, 3, 2, 4]; // Only 1 item in same position
      
      const result = validateShuffleRandomness(original, shuffled, 0.5);
      expect(result).toBe(true);
    });

    it('should return false for poorly shuffled array', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = [1, 2, 3, 5, 4]; // 3 items in same position (60%)
      
      const result = validateShuffleRandomness(original, shuffled, 0.5);
      expect(result).toBe(false);
    });

    it('should return false for arrays of different lengths', () => {
      const original = [1, 2, 3];
      const shuffled = [1, 2];
      
      const result = validateShuffleRandomness(original, shuffled);
      expect(result).toBe(false);
    });

    it('should use custom threshold', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = [1, 2, 5, 4, 3]; // 3/5 = 0.6 = 60% identical positions (indices 0, 1, 3)
      
      // 60% > 50%, so should return false
      expect(validateShuffleRandomness(original, shuffled, 0.5)).toBe(false); 
      // 60% < 70%, so should return true
      expect(validateShuffleRandomness(original, shuffled, 0.7)).toBe(true);  
    });
  });

  describe('generateMultipleShuffles', () => {
    it('should generate requested number of shuffles', () => {
      const shuffles = generateMultipleShuffles(mockDeck, 3);
      expect(shuffles).toHaveLength(3);
      shuffles.forEach(shuffle => {
        expect(shuffle).toHaveLength(mockDeck.length);
      });
    });

    it('should generate unique shuffles', () => {
      const shuffles = generateMultipleShuffles(mockDeck, 10);
      
      // Check that not all shuffles are identical
      const firstShuffle = shuffles[0];
      const allIdentical = shuffles.every(shuffle =>
        shuffle.every((card, index) => 
          card.value_name === firstShuffle[index].value_name
        )
      );
      expect(allIdentical).toBe(false);
    });
  });

  describe('validateDeckCompleteness', () => {
    it('should validate complete identical deck', () => {
      const result = validateDeckCompleteness(mockDeck, mockDeck);
      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
    });

    it('should validate complete shuffled deck', () => {
      const shuffled = shuffleDeck(mockDeck);
      const result = validateDeckCompleteness(mockDeck, shuffled);
      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
    });

    it('should detect missing cards', () => {
      const incomplete = mockDeck.slice(0, 3); // Missing last 2 cards
      const result = validateDeckCompleteness(mockDeck, incomplete);
      expect(result.isValid).toBe(false);
      expect(result.missing).toHaveLength(2);
      expect(result.missing).toContainEqual(mockDeck[3]);
      expect(result.missing).toContainEqual(mockDeck[4]);
    });

    it('should detect duplicate cards', () => {
      const withDuplicates = [...mockDeck, mockDeck[0], mockDeck[1]];
      const result = validateDeckCompleteness(mockDeck, withDuplicates);
      expect(result.isValid).toBe(false);
      expect(result.duplicates).toContain(mockDeck[0]);
      expect(result.duplicates).toContain(mockDeck[1]);
    });

    it('should detect both missing and extra cards', () => {
      const modified = [mockDeck[0], mockDeck[1], mockDeck[0]]; // Missing 3, duplicate 1
      const result = validateDeckCompleteness(mockDeck, modified);
      expect(result.isValid).toBe(false);
      expect(result.missing).toHaveLength(3);
      expect(result.duplicates).toContain(mockDeck[0]);
    });

    it('should handle empty arrays', () => {
      const result1 = validateDeckCompleteness([], []);
      expect(result1.isValid).toBe(true);

      const result2 = validateDeckCompleteness(mockDeck, []);
      expect(result2.isValid).toBe(false);
      expect(result2.missing).toHaveLength(5);
    });
  });
});