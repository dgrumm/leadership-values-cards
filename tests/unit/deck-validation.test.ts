import { DeckValidator, ValidationError, ValidationResult } from '../../lib/validation/deck-validation';
import { CardDefinition, Card } from '../../lib/types/card';
import { DeckType } from '../../lib/csv-loader';

describe('DeckValidator', () => {
  const validCardDefinitions: CardDefinition[] = [
    { value_name: 'Trust', description: 'Firm reliance on the integrity and ability of others' },
    { value_name: 'Teamwork', description: 'Cooperative effort by a group or team toward common goals' },
    { value_name: 'Leadership', description: 'The ability to guide and inspire others effectively' }
  ];

  const validCards: Card[] = validCardDefinitions.map((def, index) => ({
    ...def,
    id: `card-${index}`,
    position: { x: 0, y: 0 },
    pile: 'deck' as const,
    owner: 'TestUser'
  }));

  describe('validateCardDefinitions', () => {
    it('should validate correct card definitions', () => {
      const result = DeckValidator.validateCardDefinitions(validCardDefinitions);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should enforce minimum card count', () => {
      const tooFewCards = validCardDefinitions.slice(0, 2); // Only 2 cards
      const result = DeckValidator.validateCardDefinitions(tooFewCards);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INSUFFICIENT_CARDS')).toBe(true);
    });

    it('should enforce maximum card count', () => {
      const tooManyCards = new Array(101).fill(null).map((_, i) => ({
        value_name: `Value${i}`,
        description: `Description for value ${i}`
      }));
      const result = DeckValidator.validateCardDefinitions(tooManyCards);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'EXCESSIVE_CARDS')).toBe(true);
    });

    it('should warn about unexpected deck size', () => {
      const result = DeckValidator.validateCardDefinitions(validCardDefinitions, 'professional'); // Expected: 40

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === 'UNEXPECTED_DECK_SIZE')).toBe(true);
    });

    it('should not warn about development deck size', () => {
      const result = DeckValidator.validateCardDefinitions(validCardDefinitions, 'development');

      expect(result.warnings.some(w => w.code === 'UNEXPECTED_DECK_SIZE')).toBe(false);
    });

    it('should detect missing value_name', () => {
      const invalidCards = [
        { value_name: '', description: 'Valid description' },
        { value_name: 'Valid', description: 'Valid description' }
      ];
      const result = DeckValidator.validateCardDefinitions(invalidCards as CardDefinition[]);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_VALUE_NAME')).toBe(true);
    });

    it('should detect missing description', () => {
      const invalidCards = [
        { value_name: 'Trust', description: '' },
        { value_name: 'Teamwork', description: 'Valid description' }
      ];
      const result = DeckValidator.validateCardDefinitions(invalidCards as CardDefinition[]);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_DESCRIPTION')).toBe(true);
    });

    it('should detect duplicate value names', () => {
      const duplicateCards = [
        { value_name: 'Trust', description: 'First description' },
        { value_name: 'Trust', description: 'Second description' }
      ];
      const result = DeckValidator.validateCardDefinitions(duplicateCards);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_VALUE_NAME')).toBe(true);
    });

    it('should warn about long value names', () => {
      const longNameCards = [
        { 
          value_name: 'A'.repeat(60), // Too long
          description: 'Valid description' 
        }
      ];
      const result = DeckValidator.validateCardDefinitions(longNameCards);

      expect(result.warnings.some(w => w.code === 'VALUE_NAME_TOO_LONG')).toBe(true);
    });

    it('should warn about short descriptions', () => {
      const shortDescCards = [
        { value_name: 'Trust', description: 'Hi' } // Too short
      ];
      const result = DeckValidator.validateCardDefinitions(shortDescCards);

      expect(result.warnings.some(w => w.code === 'DESCRIPTION_TOO_SHORT')).toBe(true);
    });

    it('should warn about long descriptions', () => {
      const longDescCards = [
        { 
          value_name: 'Trust', 
          description: 'A'.repeat(600) // Too long
        }
      ];
      const result = DeckValidator.validateCardDefinitions(longDescCards);

      expect(result.warnings.some(w => w.code === 'DESCRIPTION_TOO_LONG')).toBe(true);
    });

    it('should warn about special characters in value names', () => {
      const specialCharCards = [
        { value_name: 'Trust & Honor', description: 'Valid description' },
        { value_name: 'Team<work>', description: 'Valid description' }
      ];
      const result = DeckValidator.validateCardDefinitions(specialCharCards);

      expect(result.warnings.filter(w => w.code === 'SPECIAL_CHARACTERS')).toHaveLength(2);
    });

    it('should warn about placeholder content', () => {
      const placeholderCards = [
        { value_name: 'Trust', description: 'Lorem ipsum dolor sit amet' },
        { value_name: 'Team', description: 'TODO: Add real description' }
      ];
      const result = DeckValidator.validateCardDefinitions(placeholderCards);

      expect(result.warnings.filter(w => w.code === 'PLACEHOLDER_CONTENT')).toHaveLength(2);
    });
  });

  describe('validateCards', () => {
    it('should validate correct cards', () => {
      const result = DeckValidator.validateCards(validCards);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid card IDs', () => {
      const invalidCards = [...validCards];
      invalidCards[0].id = ''; // Invalid ID
      const result = DeckValidator.validateCards(invalidCards);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_CARD_ID')).toBe(true);
    });

    it('should detect duplicate card IDs', () => {
      const duplicateCards = validCards.map(c => ({
        ...c,
        position: { ...c.position }
      }));
      
      // Ensure we have valid IDs first
      expect(duplicateCards[0].id).toBeDefined();
      expect(duplicateCards[1].id).toBeDefined();
      
      // Create duplicate
      duplicateCards[1].id = duplicateCards[0].id; 
      
      const result = DeckValidator.validateCards(duplicateCards);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_CARD_ID')).toBe(true);
    });

    it('should detect invalid positions', () => {
      const invalidCards = [...validCards];
      invalidCards[0].position = { x: 'invalid' as any, y: 0 };
      const result = DeckValidator.validateCards(invalidCards);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_POSITION')).toBe(true);
    });

    it('should detect invalid pile types', () => {
      const invalidCards = [...validCards];
      invalidCards[0].pile = 'invalid_pile' as any;
      const result = DeckValidator.validateCards(invalidCards);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_PILE')).toBe(true);
    });

    it('should warn about invalid owner type', () => {
      const invalidCards = [...validCards];
      invalidCards[0].owner = 123 as any; // Invalid owner type
      const result = DeckValidator.validateCards(invalidCards);

      expect(result.warnings.some(w => w.code === 'INVALID_OWNER')).toBe(true);
    });
  });

  describe('pile constraint validation', () => {
    it('should enforce top8 pile constraint', () => {
      const top8Cards = new Array(10).fill(null).map((_, i) => ({
        ...validCards[0],
        id: `card-${i}`,
        pile: 'top8' as const
      }));

      const result = DeckValidator.validateCards(top8Cards);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'TOP8_CONSTRAINT_VIOLATION')).toBe(true);
    });

    it('should enforce top3 pile constraint', () => {
      const top3Cards = new Array(5).fill(null).map((_, i) => ({
        ...validCards[0],
        id: `card-${i}`,
        pile: 'top3' as const
      }));

      const result = DeckValidator.validateCards(top3Cards);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'TOP3_CONSTRAINT_VIOLATION')).toBe(true);
    });

    it('should warn about empty final pile', () => {
      const cards = [
        { ...validCards[0], pile: 'deck' as const },
        { ...validCards[1], pile: 'staging' as const },
        { ...validCards[2], pile: 'more' as const }
      ]; // Multiple piles, but no top3 cards
      const result = DeckValidator.validateCards(cards);

      expect(result.warnings.some(w => w.code === 'EMPTY_FINAL_PILE')).toBe(true);
    });
  });

  describe('validatePerformance', () => {
    it('should pass normal performance requirements', () => {
      const result = DeckValidator.validatePerformance(10, 40);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn about high participant count', () => {
      const result = DeckValidator.validatePerformance(60, 40);

      expect(result.warnings.some(w => w.code === 'HIGH_PARTICIPANT_COUNT')).toBe(true);
    });

    it('should warn about high card count', () => {
      const result = DeckValidator.validatePerformance(60, 40); // 2400 cards

      expect(result.warnings.some(w => w.code === 'HIGH_CARD_COUNT')).toBe(true);
    });

    it('should error on excessive card count', () => {
      const result = DeckValidator.validatePerformance(200, 40); // 8000 cards

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'EXCESSIVE_CARD_COUNT')).toBe(true);
    });
  });

  describe('generateSummary', () => {
    it('should generate summary for clean validation', () => {
      const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        info: []
      };

      const summary = DeckValidator.generateSummary(result);
      expect(summary).toBe('✅ All validation checks passed');
    });

    it('should generate summary with errors and warnings', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: [
          { code: 'TEST1', message: 'Error 1', severity: 'error' },
          { code: 'TEST2', message: 'Error 2', severity: 'error' }
        ],
        warnings: [
          { code: 'WARN1', message: 'Warning 1', severity: 'warning' }
        ],
        info: [
          { code: 'INFO1', message: 'Info 1', severity: 'info' }
        ]
      };

      const summary = DeckValidator.generateSummary(result);
      expect(summary).toBe('❌ 2 errors, ⚠️  1 warning, ℹ️  1 info message');
    });

    it('should handle singular forms correctly', () => {
      const result: ValidationResult = {
        isValid: false,
        errors: [{ code: 'TEST', message: 'Single error', severity: 'error' }],
        warnings: [],
        info: []
      };

      const summary = DeckValidator.generateSummary(result);
      expect(summary).toBe('❌ 1 error');
    });
  });
});