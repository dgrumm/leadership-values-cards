/**
 * Pre-computed state fixtures for fast e2e test setup
 * Eliminates need to manually progress through steps in tests
 */

import { Card } from '@/lib/types/card';
import { DEVELOPMENT_DECK } from '@/lib/generated/card-decks';

function createCardFromDefinition(definition: { value_name: string; description: string }, index: number): Card {
  return {
    id: `card-${index}`,
    value_name: definition.value_name,
    description: definition.description,
    position: { x: 0, y: 0 },
    pile: 'deck',
  };
}

// Create consistent card set for testing (no randomization)
const TEST_CARDS = DEVELOPMENT_DECK.slice(0, 16).map((def, index) => 
  createCardFromDefinition(def, index)
);

/**
 * Step 1 Complete State - 8 cards in each pile
 * Simulates completion of Step 1 where user has sorted all cards
 */
export const STEP1_COMPLETE_STATE = {
  // Step 1 store state
  step1: {
    deck: TEST_CARDS,
    deckPosition: 16, // All cards have been flipped
    stagingCard: null,
    moreImportantPile: TEST_CARDS.slice(0, 8).map(card => ({ ...card, pile: 'more' as const })),
    lessImportantPile: TEST_CARDS.slice(8, 16).map(card => ({ ...card, pile: 'less' as const })),
    isDragging: false,
    draggedCardId: null,
    showOverflowWarning: false,
  }
};

/**
 * Step 2 Ready State - Step 1 complete, ready to start Step 2
 * Simulates the state when user clicks "Continue to Step 2"
 */
export const STEP2_START_STATE = {
  // Step 2 store initialized from Step 1 results
  step2: {
    deck: TEST_CARDS.slice(0, 8).map(card => ({ ...card, pile: 'deck' as const })), // More important cards become deck
    deckPosition: 0,
    stagingCard: null,
    top8Pile: [] as Card[],
    lessImportantPile: [] as Card[],
    discardedPile: TEST_CARDS.slice(8, 16).map(card => ({ ...card, pile: 'discard' as const })), // Less important discarded
    isDragging: false,
    draggedCardId: null,
    showOverflowWarning: false,
    isTransitioning: false,
    transitionPhase: null,
  }
};

/**
 * Step 2 Complete State - Top 8 selected
 * Simulates completion of Step 2 where user has selected their top 8 cards
 */
export const STEP2_COMPLETE_STATE = {
  // Step 2 store state after completion
  step2: {
    deck: TEST_CARDS.slice(0, 8),
    deckPosition: 8, // All 8 cards from Step 1 "more important" have been processed
    stagingCard: null,
    top8Pile: TEST_CARDS.slice(0, 8).map(card => ({ ...card, pile: 'top8' as const })), // All 8 selected as top
    lessImportantPile: [] as Card[], // None moved to less important in this fixture
    discardedPile: TEST_CARDS.slice(8, 16).map(card => ({ ...card, pile: 'discard' as const })),
    isDragging: false,
    draggedCardId: null,
    showOverflowWarning: false,
    isTransitioning: false,
    transitionPhase: null,
  }
};

/**
 * Step 3 Ready State - Step 2 complete, ready to start Step 3
 * Simulates the state when user clicks "Continue to Step 3"
 */
export const STEP3_START_STATE = {
  // Step 3 store initialized from Step 2 results
  step3: {
    deck: TEST_CARDS.slice(0, 8).map(card => ({ ...card, pile: 'deck' as const })), // Top 8 cards become deck
    deckPosition: 0,
    stagingCard: null,
    top3Pile: [] as Card[],
    lessImportantPile: [] as Card[],
    // All discarded cards from Steps 1 & 2
    discardedPile: [
      ...TEST_CARDS.slice(8, 16).map(card => ({ ...card, pile: 'discard' as const })), // Step 1 less important
      // Step 2 didn't discard any in this fixture since all 8 went to top8
    ],
    isDragging: false,
    draggedCardId: null,
    showOverflowWarning: false,
    isTransitioning: false,
    transitionPhase: null,
  }
};

/**
 * Step 3 Complete State - Top 3 selected
 * Simulates completion of Step 3 where user has selected their final top 3 cards
 */
export const STEP3_COMPLETE_STATE = {
  // Step 3 store state after completion
  step3: {
    deck: TEST_CARDS.slice(0, 8),
    deckPosition: 8, // All 8 cards from Step 2 top8 have been processed
    stagingCard: null,
    top3Pile: TEST_CARDS.slice(0, 3).map(card => ({ ...card, pile: 'top3' as const })), // First 3 as final selection
    lessImportantPile: TEST_CARDS.slice(3, 8).map(card => ({ ...card, pile: 'less' as const })), // Remaining 5
    discardedPile: TEST_CARDS.slice(8, 16).map(card => ({ ...card, pile: 'discard' as const })),
    isDragging: false,
    draggedCardId: null,
    showOverflowWarning: false,
    isTransitioning: false,
    transitionPhase: null,
  }
};

/**
 * Export card subsets for easier testing
 */
export const TEST_CARD_SUBSETS = {
  ALL_CARDS: TEST_CARDS,
  STEP1_MORE_IMPORTANT: TEST_CARDS.slice(0, 8),
  STEP1_LESS_IMPORTANT: TEST_CARDS.slice(8, 16),
  STEP2_TOP8: TEST_CARDS.slice(0, 8),
  STEP3_TOP3: TEST_CARDS.slice(0, 3),
  STEP3_REMAINING: TEST_CARDS.slice(3, 8),
} as const;