import { CSVLoader, DeckType, CSVLoadResult } from './csv-loader';
import { CardDefinition } from './types/card';
import * as fs from 'fs';
import * as path from 'path';

export interface DeckInfo {
  type: DeckType;
  name: string;
  description: string;
  cardCount: number;
  isDefault: boolean;
}

export class DeckManager {
  private static instance: DeckManager | null = null;
  private loadedDecks: Map<DeckType, CardDefinition[]> = new Map();
  private currentDeck: DeckType = 'professional'; // Default deck type
  private deckTimestamps: Map<DeckType, number> = new Map(); // Track file modification times

  private constructor() {}

  /**
   * Get CSV file modification time
   */
  private getCSVFileTimestamp(deckType: DeckType): number {
    try {
      const csvPath = path.join(process.cwd(), 'data', 'csv', `${deckType}.csv`);
      const stats = fs.statSync(csvPath);
      return stats.mtime.getTime();
    } catch {
      return 0; // Return 0 if file doesn't exist or can't be accessed
    }
  }

  /**
   * Check if deck cache is still valid
   */
  private isCacheValid(deckType: DeckType): boolean {
    if (!this.loadedDecks.has(deckType)) {
      return false;
    }
    
    const cachedTimestamp = this.deckTimestamps.get(deckType) || 0;
    const currentTimestamp = this.getCSVFileTimestamp(deckType);
    
    return cachedTimestamp >= currentTimestamp;
  }

  /**
   * Get singleton instance of DeckManager
   */
  static getInstance(): DeckManager {
    if (!this.instance) {
      this.instance = new DeckManager();
    }
    return this.instance;
  }

  /**
   * Load all available decks at build time
   */
  async initialize(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    const results = await CSVLoader.validateAllDecks();
    
    for (const [deckType, result] of Object.entries(results)) {
      if (result.success) {
        this.loadedDecks.set(deckType as DeckType, result.cards);
        // Store the timestamp when we loaded this deck
        this.deckTimestamps.set(deckType as DeckType, this.getCSVFileTimestamp(deckType as DeckType));
      } else {
        errors.push(`Failed to load ${deckType} deck: ${result.errors.map(e => e.message).join(', ')}`);
      }
    }

    // Ensure at least one deck is loaded
    if (this.loadedDecks.size === 0) {
      errors.push('No valid decks could be loaded');
      return { success: false, errors };
    }

    // Set default deck to first available deck if professional is not available
    if (!this.loadedDecks.has(this.currentDeck)) {
      this.currentDeck = Array.from(this.loadedDecks.keys())[0];
    }

    return { success: errors.length === 0, errors };
  }

  /**
   * Get the current active deck
   */
  getCurrentDeck(): CardDefinition[] | null {
    return this.loadedDecks.get(this.currentDeck) || null;
  }

  /**
   * Get the current deck type
   */
  getCurrentDeckType(): DeckType {
    return this.currentDeck;
  }

  /**
   * Switch to a different deck type
   */
  setCurrentDeck(deckType: DeckType): boolean {
    if (this.loadedDecks.has(deckType)) {
      this.currentDeck = deckType;
      return true;
    }
    return false;
  }

  /**
   * Get a specific deck by type
   */
  getDeck(deckType: DeckType): CardDefinition[] | null {
    // Check if cache is still valid, reload if not
    if (!this.isCacheValid(deckType)) {
      // For synchronous access, we'll trigger reload but return existing data
      // This maintains backward compatibility while ensuring eventual consistency
      this.reloadDeck(deckType).catch(err => {
        console.warn(`Failed to reload deck ${deckType}:`, err);
      });
    }
    return this.loadedDecks.get(deckType) || null;
  }

  /**
   * Get a specific deck by type (async version for cache invalidation)
   */
  async getDeckAsync(deckType: DeckType): Promise<CardDefinition[] | null> {
    // Check if cache is still valid, reload if not
    if (!this.isCacheValid(deckType)) {
      await this.reloadDeck(deckType);
    }
    return this.loadedDecks.get(deckType) || null;
  }

  /**
   * Get information about all loaded decks
   */
  getAvailableDecks(): DeckInfo[] {
    const deckInfos: Record<DeckType, Omit<DeckInfo, 'cardCount' | 'type'>> = {
      dev: {
        name: 'Development',
        description: '16 cards for testing and development',
        isDefault: false
      },
      professional: {
        name: 'Professional',
        description: '40 cards for standard leadership assessment',
        isDefault: true
      },
      extended: {
        name: 'Extended',
        description: '72 cards for comprehensive leadership evaluation',
        isDefault: false
      },
      development: {
        name: 'Development Test',
        description: 'Flexible deck for local development and testing',
        isDefault: false
      }
    };

    return Array.from(this.loadedDecks.entries()).map(([type, cards]) => ({
      type,
      ...deckInfos[type],
      cardCount: cards.length
    }));
  }

  /**
   * Get deck statistics
   */
  getDeckStats(): {
    totalDecks: number;
    currentDeck: DeckType;
    currentCardCount: number;
    availableTypes: DeckType[];
  } {
    const currentCards = this.getCurrentDeck();
    
    return {
      totalDecks: this.loadedDecks.size,
      currentDeck: this.currentDeck,
      currentCardCount: currentCards?.length || 0,
      availableTypes: Array.from(this.loadedDecks.keys())
    };
  }

  /**
   * Validate deck integrity
   */
  async validateDeckIntegrity(deckType?: DeckType): Promise<CSVLoadResult> {
    const targetDeck = deckType || this.currentDeck;
    return await CSVLoader.loadDeck(targetDeck);
  }

  /**
   * Reload a specific deck from disk
   */
  async reloadDeck(deckType: DeckType): Promise<boolean> {
    try {
      const result = await CSVLoader.loadDeck(deckType);
      if (result.success) {
        this.loadedDecks.set(deckType, result.cards);
        // Update the timestamp after successful reload
        this.deckTimestamps.set(deckType, this.getCSVFileTimestamp(deckType));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if a deck type is available
   */
  isDeckAvailable(deckType: DeckType): boolean {
    return this.loadedDecks.has(deckType);
  }

  /**
   * Get deck type from environment variable or default
   */
  static getDeckTypeFromEnvironment(): DeckType {
    const envDeck = process.env.CARD_DECK_TYPE as DeckType;
    const validTypes: DeckType[] = ['dev', 'professional', 'extended', 'development'];
    
    if (envDeck && validTypes.includes(envDeck)) {
      return envDeck;
    }
    
    return 'professional'; // Default fallback
  }

  /**
   * Create a build-time deck configuration
   */
  static async createBuildConfig(): Promise<{
    deckType: DeckType;
    cards: CardDefinition[];
    config: {
      cardCount: number;
      buildTime: string;
      version: string;
    };
  }> {
    const deckType = this.getDeckTypeFromEnvironment();
    const result = await CSVLoader.loadDeck(deckType);
    
    if (!result.success) {
      throw new Error(`Failed to load ${deckType} deck: ${result.errors.map(e => e.message).join(', ')}`);
    }

    return {
      deckType,
      cards: result.cards,
      config: {
        cardCount: result.cards.length,
        buildTime: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }
}