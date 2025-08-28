#!/usr/bin/env node

/**
 * Build-time CSV processing script
 * Validates and loads card deck CSVs for use in the application
 */

const fs = require('fs');
const path = require('path');

// Constants
const CSV_DIR = path.join(process.cwd(), 'data', 'csv');
const OUTPUT_DIR = path.join(process.cwd(), 'lib', 'generated');
const VALID_DECK_TYPES = ['development', 'professional', 'extended'];

/**
 * Parse CSV content
 */
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const errors = [];
  const cards = [];
  
  if (lines.length === 0) {
    errors.push('CSV file is empty');
    return { success: false, cards: [], errors };
  }

  // Validate header
  const header = lines[0].trim().toLowerCase();
  if (header !== 'value_name,description') {
    errors.push(`Expected header: value_name,description, got: ${lines[0]}`);
  }

  // Parse data rows
  const valueNames = new Set();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = parseCSVLine(line);
    if (columns.length !== 2) {
      errors.push(`Row ${i + 1}: Expected 2 columns, found ${columns.length}`);
      continue;
    }

    const [value_name, description] = columns.map(col => col.trim());

    if (!value_name) {
      errors.push(`Row ${i + 1}: value_name cannot be empty`);
      continue;
    }

    if (!description) {
      errors.push(`Row ${i + 1}: description cannot be empty`);
      continue;
    }

    if (valueNames.has(value_name)) {
      errors.push(`Row ${i + 1}: Duplicate value_name: ${value_name}`);
      continue;
    }

    valueNames.add(value_name);
    cards.push({ value_name, description });
  }

  return { success: errors.length === 0, cards, errors };
}

/**
 * Simple CSV line parser
 */
function parseCSVLine(line) {
  const result = [];
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
 * Validate deck size requirements
 */
function validateDeckSize(deckType, cardCount) {
  const expectedCounts = {
    professional: 40,
    extended: 72,
    development: 12 // Flexible for testing
  };

  const expected = expectedCounts[deckType];
  const warnings = [];

  if (deckType !== 'development' && cardCount !== expected) {
    if (cardCount < expected) {
      warnings.push(`${deckType} deck has ${cardCount} cards, expected ${expected}`);
    } else {
      warnings.push(`${deckType} deck has ${cardCount} cards, expected ${expected}`);
    }
  }

  return warnings;
}

/**
 * Process a single CSV file
 */
function processDeck(deckType) {
  const filePath = path.join(CSV_DIR, `${deckType}.csv`);
  
  console.log(`Processing ${deckType} deck...`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: ${deckType}.csv not found`);
    return false;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = parseCSV(content);

    if (!result.success) {
      console.error(`❌ Error in ${deckType}.csv:`);
      result.errors.forEach(error => console.error(`   ${error}`));
      return false;
    }

    const warnings = validateDeckSize(deckType, result.cards.length);
    warnings.forEach(warning => console.warn(`⚠️  ${warning}`));

    console.log(`✅ ${deckType} deck: ${result.cards.length} cards loaded successfully`);
    return { deckType, cards: result.cards, cardCount: result.cards.length };

  } catch (error) {
    console.error(`❌ Error reading ${deckType}.csv: ${error.message}`);
    return false;
  }
}

/**
 * Generate TypeScript constants file
 */
function generateConstants(decks) {
  const content = `// Generated at build time - DO NOT EDIT
// Generated on: ${new Date().toISOString()}

import { CardDefinition } from '../types/card';

export type DeckType = ${decks.map(d => `'${d.deckType}'`).join(' | ')};

export const AVAILABLE_DECKS: DeckType[] = [${decks.map(d => `'${d.deckType}'`).join(', ')}];

${decks.map(deck => `
export const ${deck.deckType.toUpperCase()}_DECK: CardDefinition[] = ${JSON.stringify(deck.cards, null, 2)};
`).join('')}

export const DECK_MAP: Record<DeckType, CardDefinition[]> = {
${decks.map(deck => `  ${deck.deckType}: ${deck.deckType.toUpperCase()}_DECK`).join(',\n')}
};

export const DECK_INFO = {
${decks.map(deck => `  ${deck.deckType}: {
    name: '${deck.deckType.charAt(0).toUpperCase() + deck.deckType.slice(1)}',
    cardCount: ${deck.cardCount},
    type: '${deck.deckType}' as DeckType
  }`).join(',\n')}
};
`;

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const outputPath = path.join(OUTPUT_DIR, 'card-decks.ts');
  fs.writeFileSync(outputPath, content);
  console.log(`📝 Generated constants at: ${outputPath}`);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🎴 Card Deck Builder\n');

  if (command === 'validate') {
    console.log('Validating all CSV files...\n');
    
    let allValid = true;
    const validDecks = [];

    for (const deckType of VALID_DECK_TYPES) {
      const result = processDeck(deckType);
      if (result) {
        validDecks.push(result);
      } else {
        allValid = false;
      }
    }

    if (allValid && validDecks.length > 0) {
      console.log('\n🎉 All CSV files are valid!');
      generateConstants(validDecks);
      process.exit(0);
    } else {
      console.log('\n💥 CSV validation failed!');
      process.exit(1);
    }

  } else if (command && VALID_DECK_TYPES.includes(command)) {
    console.log(`Building ${command} deck...\n`);
    
    const result = processDeck(command);
    if (result) {
      generateConstants([result]);
      console.log(`\n✨ ${command} deck built successfully!`);
      process.exit(0);
    } else {
      console.log(`\n💥 Failed to build ${command} deck!`);
      process.exit(1);
    }

  } else {
    console.log('Usage:');
    console.log('  node scripts/build-csv.js validate           # Validate all CSV files');
    console.log('  node scripts/build-csv.js <deck-type>        # Build specific deck');
    console.log('');
    console.log('Available deck types:', VALID_DECK_TYPES.join(', '));
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { parseCSV, processDeck, generateConstants };