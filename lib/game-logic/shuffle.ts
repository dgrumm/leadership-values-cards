import { CardDefinition } from '../types/card';

/**
 * Fisher-Yates shuffle algorithm for randomizing card order
 * This provides true randomness without seeding for session recovery
 */
export function shuffleDeck<T>(array: T[]): T[] {
  const shuffled = [...array];
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Generate a shuffled deck for a specific participant
 * Each participant gets the same cards but in a unique random order
 */
export function generateParticipantDeck(baseDeck: CardDefinition[], participantName: string): CardDefinition[] {
  // Use true randomness as specified in requirements
  return shuffleDeck(baseDeck);
}

/**
 * Validate shuffle quality by checking for identical sequences
 * Used for testing to ensure proper randomization
 */
export function validateShuffleRandomness<T>(original: T[], shuffled: T[], threshold: number = 0.8): boolean {
  if (original.length !== shuffled.length) {
    return false;
  }
  
  let identicalPositions = 0;
  for (let i = 0; i < original.length; i++) {
    if (original[i] === shuffled[i]) {
      identicalPositions++;
    }
  }
  
  // If more than threshold% of items are in the same position, shuffle quality is poor
  const identicalRatio = identicalPositions / original.length;
  return identicalRatio < threshold;
}

/**
 * Create multiple shuffled decks for testing randomness
 * Returns multiple shuffles to analyze distribution
 */
export function generateMultipleShuffles<T>(array: T[], count: number): T[][] {
  const shuffles: T[][] = [];
  
  for (let i = 0; i < count; i++) {
    shuffles.push(shuffleDeck(array));
  }
  
  return shuffles;
}

/**
 * Ensure deck completeness after shuffle operations
 * Validates that all cards are present and no duplicates exist
 */
export function validateDeckCompleteness<T>(original: T[], shuffled: T[]): { isValid: boolean; missing: T[]; duplicates: T[] } {
  const originalSet = new Set(original);
  const shuffledSet = new Set(shuffled);
  
  const missing: T[] = [];
  const duplicates: T[] = [];
  
  // Check for missing items
  for (const item of original) {
    if (!shuffledSet.has(item)) {
      missing.push(item);
    }
  }
  
  // Check for duplicates (if shuffled array is longer than set)
  if (shuffled.length !== shuffledSet.size) {
    const seen = new Set<T>();
    for (const item of shuffled) {
      if (seen.has(item)) {
        duplicates.push(item);
      }
      seen.add(item);
    }
  }
  
  return {
    isValid: missing.length === 0 && duplicates.length === 0 && original.length === shuffled.length,
    missing,
    duplicates
  };
}