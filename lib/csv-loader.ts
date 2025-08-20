import * as fs from 'fs';
import * as path from 'path';
import { CardDefinition } from './types/card';
import { DeckValidator, ValidationResult } from './validation/deck-validation';

export interface CSVValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface CSVLoadResult {
  success: boolean;
  cards: CardDefinition[];
  errors: CSVValidationError[];
  warnings: string[];
}

export type DeckType = 'dev' | 'professional' | 'extended' | 'development';

export class CSVLoader {
  private static readonly CSV_DIR = path.join(process.cwd(), 'data', 'csv');
  private static readonly MIN_CARDS = 3;
  private static readonly MAX_CARDS = 100;
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit

  /**
   * Load and validate cards from a specific deck type
   */
  static async loadDeck(deckType: DeckType): Promise<CSVLoadResult> {
    const filePath = path.join(this.CSV_DIR, `${deckType}.csv`);
    
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        cards: [],
        errors: [{ row: 0, field: 'file', value: filePath, message: `CSV file not found: ${deckType}.csv` }],
        warnings: []
      };
    }

    try {
      // Check file size before reading
      const stats = fs.statSync(filePath);
      if (stats.size > this.MAX_FILE_SIZE) {
        return {
          success: false,
          cards: [],
          errors: [{ 
            row: 0, 
            field: 'file_size', 
            value: stats.size.toString(), 
            message: `CSV file too large: ${Math.round(stats.size / 1024 / 1024)}MB exceeds ${Math.round(this.MAX_FILE_SIZE / 1024 / 1024)}MB limit` 
          }],
          warnings: []
        };
      }

      const csvContent = fs.readFileSync(filePath, 'utf-8');
      
      // Double-check content size (in case of encoding issues)
      if (csvContent.length > this.MAX_FILE_SIZE) {
        return {
          success: false,
          cards: [],
          errors: [{ 
            row: 0, 
            field: 'content_size', 
            value: csvContent.length.toString(), 
            message: `CSV content too large after reading: ${Math.round(csvContent.length / 1024 / 1024)}MB exceeds limit` 
          }],
          warnings: []
        };
      }

      return this.parseCSV(csvContent, deckType);
    } catch (error) {
      return {
        success: false,
        cards: [],
        errors: [{ row: 0, field: 'file', value: filePath, message: `Failed to read CSV file: ${error}` }],
        warnings: []
      };
    }
  }

  /**
   * Parse CSV content and validate card data
   */
  private static parseCSV(csvContent: string, deckType: DeckType): CSVLoadResult {
    const lines = csvContent.trim().split('\n');
    const errors: CSVValidationError[] = [];
    const warnings: string[] = [];
    const cards: CardDefinition[] = [];
    const valueNames = new Set<string>();

    if (lines.length === 0) {
      errors.push({ row: 0, field: 'file', value: '', message: 'CSV file is empty' });
      return { success: false, cards: [], errors, warnings };
    }

    // Validate header
    const header = lines[0].trim().toLowerCase();
    if (header !== 'value_name,description') {
      errors.push({ 
        row: 1, 
        field: 'header', 
        value: lines[0], 
        message: 'Expected header: value_name,description' 
      });
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const result = this.parseCSVRow(line, i + 1);
      
      if (result.errors.length > 0) {
        errors.push(...result.errors);
        continue;
      }

      if (result.card) {
        // Check for duplicate value names
        if (valueNames.has(result.card.value_name)) {
          errors.push({
            row: i + 1,
            field: 'value_name',
            value: result.card.value_name,
            message: 'Duplicate value name found'
          });
          continue;
        }

        valueNames.add(result.card.value_name);
        cards.push(result.card);
      }
    }

    // Validate card count
    if (cards.length < this.MIN_CARDS) {
      errors.push({
        row: 0,
        field: 'count',
        value: cards.length.toString(),
        message: `Deck must have at least ${this.MIN_CARDS} cards`
      });
    }

    if (cards.length > this.MAX_CARDS) {
      errors.push({
        row: 0,
        field: 'count',
        value: cards.length.toString(),
        message: `Deck cannot exceed ${this.MAX_CARDS} cards`
      });
    }

    // Add deck-specific validations
    this.validateDeckSize(deckType, cards.length, warnings, errors);

    // Use comprehensive validation
    if (errors.length === 0) {
      const validationResult = DeckValidator.validateCardDefinitions(cards, deckType);
      
      // Convert validation errors to CSV errors
      validationResult.errors.forEach(error => {
        errors.push({
          row: 0,
          field: error.field || 'validation',
          value: error.value || '',
          message: error.message
        });
      });

      // Add validation warnings
      validationResult.warnings.forEach(warning => {
        warnings.push(warning.message);
      });
    }

    return {
      success: errors.length === 0,
      cards,
      errors,
      warnings
    };
  }

  /**
   * Parse a single CSV row
   */
  private static parseCSVRow(line: string, rowNumber: number): { card: CardDefinition | null; errors: CSVValidationError[] } {
    const errors: CSVValidationError[] = [];
    
    // Simple CSV parsing (handles quoted descriptions)
    const columns = this.parseCSVLine(line);
    
    if (columns.length !== 2) {
      errors.push({
        row: rowNumber,
        field: 'format',
        value: line,
        message: `Expected 2 columns, found ${columns.length}`
      });
      return { card: null, errors };
    }

    const [value_name, description] = columns;

    // Validate value_name
    if (!value_name || value_name.trim().length === 0) {
      errors.push({
        row: rowNumber,
        field: 'value_name',
        value: value_name,
        message: 'Value name cannot be empty'
      });
    }

    // Validate description
    if (!description || description.trim().length === 0) {
      errors.push({
        row: rowNumber,
        field: 'description',
        value: description,
        message: 'Description cannot be empty'
      });
    }

    if (errors.length > 0) {
      return { card: null, errors };
    }

    return {
      card: {
        value_name: value_name.trim(),
        description: description.trim()
      },
      errors: []
    };
  }

  /**
   * Simple CSV line parser that handles quoted fields
   */
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Validate deck-specific size requirements
   */
  private static validateDeckSize(deckType: DeckType, cardCount: number, warnings: string[], errors: CSVValidationError[]): void {
    const expectedCounts: Record<DeckType, number> = {
      dev: 16,
      professional: 40,
      extended: 72,
      development: 12 // Flexible for testing
    };

    const expected = expectedCounts[deckType];
    
    if (deckType !== 'development' && cardCount !== expected) {
      if (cardCount < expected) {
        warnings.push(`${deckType} deck has ${cardCount} cards, expected ${expected}`);
      } else {
        warnings.push(`${deckType} deck has ${cardCount} cards, expected ${expected}`);
      }
    }
  }

  /**
   * Get all available deck types
   */
  static getAvailableDecks(): DeckType[] {
    const availableDecks: DeckType[] = [];
    const deckTypes: DeckType[] = ['dev', 'professional', 'extended', 'development'];
    
    for (const deckType of deckTypes) {
      const filePath = path.join(this.CSV_DIR, `${deckType}.csv`);
      if (fs.existsSync(filePath)) {
        availableDecks.push(deckType);
      }
    }
    
    return availableDecks;
  }

  /**
   * Validate all available decks
   */
  static async validateAllDecks(): Promise<Record<DeckType, CSVLoadResult>> {
    const results: Record<string, CSVLoadResult> = {};
    const availableDecks = this.getAvailableDecks();
    
    for (const deckType of availableDecks) {
      results[deckType] = await this.loadDeck(deckType);
    }
    
    return results as Record<DeckType, CSVLoadResult>;
  }
}