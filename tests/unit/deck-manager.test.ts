import { DeckManager } from '../../lib/deck-manager';
import { CSVLoader } from '../../lib/csv-loader';
import { CardDefinition } from '../../lib/types/card';
import * as fs from 'fs';

// Mock CSVLoader and fs
jest.mock('../../lib/csv-loader');
jest.mock('fs');
const mockCSVLoader = CSVLoader as jest.Mocked<typeof CSVLoader>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('DeckManager', () => {
  let deckManager: DeckManager;

  const mockDevDeck: CardDefinition[] = [
    { value_name: 'Trust', description: 'Trust description' },
    { value_name: 'Teamwork', description: 'Teamwork description' }
  ];

  const mockProfessionalDeck: CardDefinition[] = [
    ...mockDevDeck,
    { value_name: 'Leadership', description: 'Leadership description' },
    { value_name: 'Integrity', description: 'Integrity description' }
  ];

  beforeEach(() => {
    // Reset singleton
    (DeckManager as any).instance = null;
    deckManager = DeckManager.getInstance();
    jest.clearAllMocks();
    
    // Mock fs.statSync to return valid timestamps
    mockFs.statSync.mockReturnValue({
      mtime: new Date(),
      size: 1000
    } as any);
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = DeckManager.getInstance();
      const instance2 = DeckManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should load all available decks successfully', async () => {
      mockCSVLoader.validateAllDecks.mockResolvedValue({
        dev: { success: true, cards: mockDevDeck, errors: [], warnings: [] },
        professional: { success: true, cards: mockProfessionalDeck, errors: [], warnings: [] }
      });

      const result = await deckManager.initialize();

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(deckManager.getCurrentDeckType()).toBe('professional'); // Default
    });

    it('should handle deck loading failures', async () => {
      mockCSVLoader.validateAllDecks.mockResolvedValue({
        dev: { success: false, cards: [], errors: [{ row: 1, field: 'test', value: 'test', message: 'Test error' }], warnings: [] }
      });

      const result = await deckManager.initialize();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to load dev deck');
    });

    it('should fail when no decks can be loaded', async () => {
      mockCSVLoader.validateAllDecks.mockResolvedValue({});

      const result = await deckManager.initialize();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No valid decks could be loaded');
    });

    it('should fallback to first available deck if professional not available', async () => {
      mockCSVLoader.validateAllDecks.mockResolvedValue({
        dev: { success: true, cards: mockDevDeck, errors: [], warnings: [] }
      });

      const result = await deckManager.initialize();

      expect(result.success).toBe(true);
      expect(deckManager.getCurrentDeckType()).toBe('dev');
    });
  });

  describe('deck management', () => {
    beforeEach(async () => {
      mockCSVLoader.validateAllDecks.mockResolvedValue({
        dev: { success: true, cards: mockDevDeck, errors: [], warnings: [] },
        professional: { success: true, cards: mockProfessionalDeck, errors: [], warnings: [] }
      });
      await deckManager.initialize();
    });

    it('should get current deck', () => {
      const deck = deckManager.getCurrentDeck();
      expect(deck).toEqual(mockProfessionalDeck);
    });

    it('should get current deck type', () => {
      const deckType = deckManager.getCurrentDeckType();
      expect(deckType).toBe('professional');
    });

    it('should switch deck types', () => {
      const result = deckManager.setCurrentDeck('dev');
      expect(result).toBe(true);
      expect(deckManager.getCurrentDeckType()).toBe('dev');
      expect(deckManager.getCurrentDeck()).toEqual(mockDevDeck);
    });

    it('should reject invalid deck type', () => {
      const result = deckManager.setCurrentDeck('invalid' as any);
      expect(result).toBe(false);
      expect(deckManager.getCurrentDeckType()).toBe('professional'); // Should remain unchanged
    });

    it('should get specific deck by type', () => {
      const deck = deckManager.getDeck('dev');
      expect(deck).toEqual(mockDevDeck);
    });

    it('should return null for non-existent deck', () => {
      const deck = deckManager.getDeck('extended' as any);
      expect(deck).toBeNull();
    });
  });

  describe('deck information', () => {
    beforeEach(async () => {
      mockCSVLoader.validateAllDecks.mockResolvedValue({
        dev: { success: true, cards: mockDevDeck, errors: [], warnings: [] },
        professional: { success: true, cards: mockProfessionalDeck, errors: [], warnings: [] }
      });
      await deckManager.initialize();
    });

    it('should get available decks info', () => {
      const decks = deckManager.getAvailableDecks();
      
      expect(decks).toHaveLength(2);
      expect(decks.find(d => d.type === 'dev')).toMatchObject({
        type: 'dev',
        name: 'Development',
        cardCount: 2,
        isDefault: false
      });
      expect(decks.find(d => d.type === 'professional')).toMatchObject({
        type: 'professional',
        name: 'Professional',
        cardCount: 4,
        isDefault: true
      });
    });

    it('should get deck statistics', () => {
      const stats = deckManager.getDeckStats();
      
      expect(stats).toMatchObject({
        totalDecks: 2,
        currentDeck: 'professional',
        currentCardCount: 4,
        availableTypes: ['dev', 'professional']
      });
    });

    it('should check deck availability', () => {
      expect(deckManager.isDeckAvailable('dev')).toBe(true);
      expect(deckManager.isDeckAvailable('professional')).toBe(true);
      expect(deckManager.isDeckAvailable('extended')).toBe(false);
    });
  });

  describe('deck validation and reloading', () => {
    beforeEach(async () => {
      mockCSVLoader.validateAllDecks.mockResolvedValue({
        professional: { success: true, cards: mockProfessionalDeck, errors: [], warnings: [] }
      });
      await deckManager.initialize();
    });

    it('should validate deck integrity', async () => {
      const mockValidation = { success: true, cards: mockProfessionalDeck, errors: [], warnings: [] };
      mockCSVLoader.loadDeck.mockResolvedValue(mockValidation);

      const result = await deckManager.validateDeckIntegrity();
      
      expect(result).toEqual(mockValidation);
      expect(mockCSVLoader.loadDeck).toHaveBeenCalledWith('professional');
    });

    it('should validate specific deck', async () => {
      const mockValidation = { success: true, cards: mockDevDeck, errors: [], warnings: [] };
      mockCSVLoader.loadDeck.mockResolvedValue(mockValidation);

      const result = await deckManager.validateDeckIntegrity('dev');
      
      expect(result).toEqual(mockValidation);
      expect(mockCSVLoader.loadDeck).toHaveBeenCalledWith('dev');
    });

    it('should reload deck successfully', async () => {
      const updatedDeck = [...mockProfessionalDeck, { value_name: 'New Card', description: 'New description' }];
      mockCSVLoader.loadDeck.mockResolvedValue({
        success: true,
        cards: updatedDeck,
        errors: [],
        warnings: []
      });

      const result = await deckManager.reloadDeck('professional');
      
      expect(result).toBe(true);
      expect(deckManager.getCurrentDeck()).toEqual(updatedDeck);
    });

    it('should handle reload failure', async () => {
      mockCSVLoader.loadDeck.mockResolvedValue({
        success: false,
        cards: [],
        errors: [{ row: 1, field: 'test', value: 'test', message: 'Error' }],
        warnings: []
      });

      const result = await deckManager.reloadDeck('professional');
      
      expect(result).toBe(false);
      // Original deck should remain unchanged
      expect(deckManager.getCurrentDeck()).toEqual(mockProfessionalDeck);
    });

    it('should invalidate cache when CSV file is modified', async () => {
      // Initialize with original timestamp
      const originalTime = new Date('2023-01-01').getTime();
      mockFs.statSync.mockReturnValue({
        mtime: new Date(originalTime),
        size: 1000
      } as any);

      await deckManager.initialize();
      const originalDeck = deckManager.getDeck('professional');

      // Simulate file modification
      const newTime = originalTime + 10000;
      mockFs.statSync.mockReturnValue({
        mtime: new Date(newTime),
        size: 1000
      } as any);

      // Mock reload to return updated deck
      const updatedDeck = [...mockProfessionalDeck, { value_name: 'New Card', description: 'New description' }];
      mockCSVLoader.loadDeck.mockResolvedValue({
        success: true,
        cards: updatedDeck,
        errors: [],
        warnings: []
      });

      // Getting deck should trigger cache invalidation and reload
      const reloadedDeck = await deckManager.getDeckAsync('professional');
      
      expect(mockCSVLoader.loadDeck).toHaveBeenCalledWith('professional');
      expect(reloadedDeck).toEqual(updatedDeck);
      expect(reloadedDeck).not.toEqual(originalDeck);
    });
  });

  describe('static methods', () => {
    it('should get deck type from environment', () => {
      // Test default
      const defaultType = DeckManager.getDeckTypeFromEnvironment();
      expect(defaultType).toBe('professional');
      
      // Test with environment variable
      process.env.CARD_DECK_TYPE = 'dev';
      const envType = DeckManager.getDeckTypeFromEnvironment();
      expect(envType).toBe('dev');
      
      // Test invalid environment variable
      process.env.CARD_DECK_TYPE = 'invalid';
      const fallbackType = DeckManager.getDeckTypeFromEnvironment();
      expect(fallbackType).toBe('professional');
      
      // Cleanup
      delete process.env.CARD_DECK_TYPE;
    });

    it('should create build config', async () => {
      mockCSVLoader.loadDeck.mockResolvedValue({
        success: true,
        cards: mockProfessionalDeck,
        errors: [],
        warnings: []
      });

      const config = await DeckManager.createBuildConfig();
      
      expect(config.deckType).toBe('professional');
      expect(config.cards).toEqual(mockProfessionalDeck);
      expect(config.config.cardCount).toBe(4);
      expect(config.config.version).toBe('1.0.0');
      expect(config.config.buildTime).toBeDefined();
    });

    it('should throw on build config failure', async () => {
      mockCSVLoader.loadDeck.mockResolvedValue({
        success: false,
        cards: [],
        errors: [{ row: 1, field: 'test', value: 'test', message: 'Load error' }],
        warnings: []
      });

      await expect(DeckManager.createBuildConfig()).rejects.toThrow('Failed to load professional deck');
    });
  });
});