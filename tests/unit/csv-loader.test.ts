import { CSVLoader, DeckType } from '../../lib/csv-loader';
import { CardDefinition } from '../../lib/types/card';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs for testing
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('CSVLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock setup for normal file operations
    mockFs.statSync.mockReturnValue({
      size: 1000,
      mtime: new Date()
    } as any);
  });

  describe('loadDeck', () => {
    it('should load valid CSV successfully', async () => {
      const mockCSV = `value_name,description
Trust,"Firm reliance on the integrity, ability, or character of a person"
Teamwork,"Cooperative effort by a group or team"
Leadership,"Guiding and inspiring others toward common goals"`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockCSV);

      const result = await CSVLoader.loadDeck('dev');

      expect(result.success).toBe(true);
      expect(result.cards).toHaveLength(3);
      expect(result.cards[0]).toEqual({
        value_name: 'Trust',
        description: 'Firm reliance on the integrity, ability, or character of a person'
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for non-existent file', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = await CSVLoader.loadDeck('dev');

      expect(result.success).toBe(false);
      expect(result.cards).toHaveLength(0);
      expect(result.errors[0].message).toContain('CSV file not found');
    });

    it('should validate header format', async () => {
      const mockCSV = `wrong_header,another_header
Trust,Description`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockCSV);

      const result = await CSVLoader.loadDeck('dev');

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain('Expected header: value_name,description');
    });

    it('should handle quoted CSV values', async () => {
      const mockCSV = `value_name,description
"Trust with comma, test","Description with quotes and comma, test"
Teamwork,"Cooperative effort by a group or team"
Leadership,"Guiding and inspiring others toward common goals"`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockCSV);

      const result = await CSVLoader.loadDeck('dev');

      expect(result.success).toBe(true);
      expect(result.cards[0].value_name).toBe('Trust with comma, test');
      expect(result.cards[0].description).toBe('Description with quotes and comma, test');
    });

    it('should detect duplicate value names', async () => {
      const mockCSV = `value_name,description
Trust,"First description"
Trust,"Second description"`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockCSV);

      const result = await CSVLoader.loadDeck('dev');

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('Duplicate value name'))).toBe(true);
    });

    it('should validate minimum card count', async () => {
      const mockCSV = `value_name,description
Trust,"Only one card"`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockCSV);

      const result = await CSVLoader.loadDeck('dev');

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('at least 3 cards'))).toBe(true);
    });

    it('should warn about unexpected deck sizes', async () => {
      const mockCSV = `value_name,description
Trust,"Description 1"
Teamwork,"Description 2"
Honesty,"Description 3"
Integrity,"Description 4"
Leadership,"Description 5"`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockCSV);

      const result = await CSVLoader.loadDeck('dev'); // Expected: 16 cards

      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('has 5 cards, expected 16'))).toBe(true);
    });

    it('should reject files that are too large', async () => {
      const mockCSV = `value_name,description
Trust,"Description 1"
Teamwork,"Description 2"
Leadership,"Description 3"`;

      // Mock file stat to return large size
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        size: 6 * 1024 * 1024 // 6MB - exceeds 5MB limit
      } as any);
      mockFs.readFileSync.mockReturnValue(mockCSV);

      const result = await CSVLoader.loadDeck('dev');

      expect(result.success).toBe(false);
      expect(result.errors[0].field).toBe('file_size');
      expect(result.errors[0].message).toContain('CSV file too large');
    });

    it('should reject content that is too large after reading', async () => {
      const largeContent = 'value_name,description\n' + 'A'.repeat(6 * 1024 * 1024);

      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({
        size: 1000 // File size looks small
      } as any);
      mockFs.readFileSync.mockReturnValue(largeContent);

      const result = await CSVLoader.loadDeck('dev');

      expect(result.success).toBe(false);
      expect(result.errors[0].field).toBe('content_size');
      expect(result.errors[0].message).toContain('CSV content too large after reading');
    });
  });

  describe('parseCSVLine', () => {
    it('should parse simple CSV line', () => {
      const line = 'Trust,Simple description';
      const result = (CSVLoader as any).parseCSVLine(line);
      expect(result).toEqual(['Trust', 'Simple description']);
    });

    it('should handle quoted fields with commas', () => {
      const line = '"Trust, with comma","Description, with comma"';
      const result = (CSVLoader as any).parseCSVLine(line);
      expect(result).toEqual(['Trust, with comma', 'Description, with comma']);
    });

    it('should handle quoted fields with quotes', () => {
      const line = '"Trust with quotes","Description"';
      const result = (CSVLoader as any).parseCSVLine(line);
      expect(result).toEqual(['Trust with quotes', 'Description']);
    });
  });

  describe('getAvailableDecks', () => {
    it('should return available deck types', () => {
      mockFs.existsSync.mockImplementation((filePath: string) => {
        return filePath.includes('dev.csv') || filePath.includes('professional.csv');
      });

      const result = CSVLoader.getAvailableDecks();
      expect(result).toContain('dev');
      expect(result).toContain('professional');
      expect(result).not.toContain('extended');
    });
  });

  describe('validateAllDecks', () => {
    it('should validate all available decks', async () => {
      const mockCSV = `value_name,description
Trust,"Description"
Teamwork,"Description"
Honesty,"Description"`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(mockCSV);

      const results = await CSVLoader.validateAllDecks();

      expect(Object.keys(results)).toContain('dev');
      expect(Object.keys(results)).toContain('professional');
    });
  });
});