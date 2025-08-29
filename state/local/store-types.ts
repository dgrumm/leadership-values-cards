/**
 * Store Type Definitions - Shared interfaces for all Step stores
 * Extracted from global stores for factory pattern migration
 */

import { Card } from '@/lib/types/card';

// Step 1 Store Interface
export interface Step1State {
  // Deck state
  deck: Card[];
  deckPosition: number;
  
  // Staging area
  stagingCard: Card | null;
  
  // Piles
  moreImportantPile: Card[];
  lessImportantPile: Card[];
  
  // UI state
  isDragging: boolean;
  draggedCardId: string | null;
  showOverflowWarning: boolean;
  
  // Actions
  initializeDeck: () => void;
  flipNextCard: () => void;
  moveCardToPile: (cardId: string, pile: 'more' | 'less') => void;
  moveCardBetweenPiles: (cardId: string, fromPile: 'more' | 'less', toPile: 'more' | 'less') => void;
  setDragging: (isDragging: boolean, cardId?: string) => void;
  showOverflowWarningMessage: () => void;
  hideOverflowWarningMessage: () => void;
  resetStep1: () => void;
}

// Step 2 Store Interface
export interface Step2State {
  // Deck state (from Step 1 "More Important" pile)
  deck: Card[];
  deckPosition: number;
  
  // Staging area
  stagingCard: Card | null;
  
  // Piles
  top8Pile: Card[];
  lessImportantPile: Card[];
  discardedPile: Card[]; // Previous Step 1 "Less Important" cards
  
  // UI state
  isDragging: boolean;
  draggedCardId: string | null;
  showOverflowWarning: boolean;
  
  // Transition state
  isTransitioning: boolean;
  transitionPhase: 'clearing' | 'complete' | null;
  
  // Actions
  initializeFromStep1: (moreImportantCards: Card[], lessImportantCards: Card[]) => void;
  startTransition: (moreImportantCards: Card[], lessImportantCards: Card[]) => Promise<void>;
  flipNextCard: () => void;
  moveCardToPile: (cardId: string, pile: 'top8' | 'less') => void;
  moveCardBetweenPiles: (cardId: string, fromPile: 'top8' | 'less', toPile: 'top8' | 'less') => void;
  setDragging: (isDragging: boolean, cardId?: string) => void;
  showOverflowWarningMessage: () => void;
  hideOverflowWarningMessage: () => void;
  resetStep2: () => void;
  cleanup: () => void;
}

// Step 3 Store Interface  
export interface Step3State {
  // Deck state (from Step 2 Top 8 cards)
  deck: Card[];
  deckPosition: number;
  
  // Staging area
  stagingCard: Card | null;
  
  // Piles
  top3Pile: Card[];
  lessImportantPile: Card[];
  discardedPile: Card[]; // Combined from Steps 1 & 2 discard piles
  
  // UI state
  isDragging: boolean;
  draggedCardId: string | null;
  showOverflowWarning: boolean;
  
  // Transition state
  isTransitioning: boolean;
  transitionPhase: 'clearing' | 'complete' | null;
  
  // Actions
  initializeFromStep2: (top8Cards: Card[], step2DiscardedCards: Card[], step1DiscardedCards: Card[]) => void;
  startTransition: (top8Cards: Card[], step2DiscardedCards: Card[], step1DiscardedCards: Card[]) => Promise<void>;
  flipNextCard: () => void;
  moveCardToPile: (cardId: string, pile: 'top3' | 'less') => void;
  moveCardBetweenPiles: (cardId: string, fromPile: 'top3' | 'less', toPile: 'top3' | 'less') => void;
  setDragging: (isDragging: boolean, cardId?: string) => void;
  showOverflowWarningMessage: () => void;
  hideOverflowWarningMessage: () => void;
  resetStep3: () => void;
  cleanup: () => void;
}

// Utility type for store factories
export type StoreFactory<T> = () => T;

// Store instance types (return types from create())
export type Step1StoreInstance = ReturnType<typeof import('zustand').create<Step1State>>;
export type Step2StoreInstance = ReturnType<typeof import('zustand').create<Step2State>>;
export type Step3StoreInstance = ReturnType<typeof import('zustand').create<Step3State>>;

// Combined store bundle type for SessionStoreManager
export interface StoreBundle {
  step1: Step1StoreInstance;
  step2: Step2StoreInstance;
  step3: Step3StoreInstance;
  createdAt: number;
  lastAccessed: number;
}