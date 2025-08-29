/**
 * Store Factory Tests - Validates factory functions create isolated store instances
 * Tests each Step store factory for proper isolation and functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createStep1Store, createStep2Store, createStep3Store } from '@/state/local';
import type { Step1Store, Step2Store, Step3Store } from '@/state/local';
import type { Card } from '@/lib/types/card';

// Mock card data for testing
const mockCards: Card[] = Array.from({ length: 40 }, (_, i) => ({
  id: `card-${i + 1}`,
  title: `Test Card ${i + 1}`,
  description: `Description for test card ${i + 1}`,
  category: 'test',
  pile: 'deck' as const
}));

describe('Store Factory Functions', () => {
  describe('createStep1Store', () => {
    let store1: Step1Store;
    let store2: Step1Store;

    beforeEach(() => {
      store1 = createStep1Store();
      store2 = createStep1Store();
    });

    it('creates independent store instances', () => {
      expect(store1).not.toBe(store2);
      expect(store1.getState()).not.toBe(store2.getState());
    });

    it('initializes with correct default state', () => {
      const state = store1.getState();
      
      expect(state.deck).toEqual([]);
      expect(state.deckPosition).toBe(0);
      expect(state.stagingCard).toBeNull();
      expect(state.moreImportantPile).toEqual([]);
      expect(state.lessImportantPile).toEqual([]);
      expect(state.isDragging).toBe(false);
      expect(state.draggedCardId).toBeNull();
      expect(state.showOverflowWarning).toBe(false);
    });

    it('maintains state isolation between instances', () => {
      // Initialize first store
      store1.getState().initializeDeck();
      const cards1 = mockCards.slice(0, 5);
      store1.setState({ deck: cards1, deckPosition: 0 });
      
      // Initialize second store  
      store2.getState().initializeDeck();
      const cards2 = mockCards.slice(5, 10);
      store2.setState({ deck: cards2, deckPosition: 0 });

      // Flip card in store1
      store1.getState().flipNextCard();
      
      // Verify store2 is unaffected
      expect(store1.getState().stagingCard).not.toBeNull();
      expect(store2.getState().stagingCard).toBeNull();
      expect(store1.getState().deckPosition).toBe(1);
      expect(store2.getState().deckPosition).toBe(0);
    });

    it('has all required action methods', () => {
      const state = store1.getState();
      
      expect(typeof state.initializeDeck).toBe('function');
      expect(typeof state.flipNextCard).toBe('function');
      expect(typeof state.moveCardToPile).toBe('function');
      expect(typeof state.moveCardBetweenPiles).toBe('function');
      expect(typeof state.setDragging).toBe('function');
      expect(typeof state.showOverflowWarningMessage).toBe('function');
      expect(typeof state.hideOverflowWarningMessage).toBe('function');
      expect(typeof state.resetStep1).toBe('function');
    });
  });

  describe('createStep2Store', () => {
    let store1: Step2Store;
    let store2: Step2Store;

    beforeEach(() => {
      store1 = createStep2Store();
      store2 = createStep2Store();
    });

    it('creates independent store instances', () => {
      expect(store1).not.toBe(store2);
      expect(store1.getState()).not.toBe(store2.getState());
    });

    it('initializes with correct default state', () => {
      const state = store1.getState();
      
      expect(state.deck).toEqual([]);
      expect(state.deckPosition).toBe(0);
      expect(state.stagingCard).toBeNull();
      expect(state.top8Pile).toEqual([]);
      expect(state.lessImportantPile).toEqual([]);
      expect(state.discardedPile).toEqual([]);
      expect(state.isDragging).toBe(false);
      expect(state.draggedCardId).toBeNull();
      expect(state.showOverflowWarning).toBe(false);
      expect(state.isTransitioning).toBe(false);
      expect(state.transitionPhase).toBeNull();
    });

    it('maintains state isolation during transitions', async () => {
      const moreImportant1 = mockCards.slice(0, 10);
      const lessImportant1 = mockCards.slice(10, 20);
      const moreImportant2 = mockCards.slice(20, 30);
      const lessImportant2 = mockCards.slice(30, 40);

      // Start transitions in both stores
      const promise1 = store1.getState().startTransition(moreImportant1, lessImportant1);
      const promise2 = store2.getState().startTransition(moreImportant2, lessImportant2);

      // Both should be in transition
      expect(store1.getState().isTransitioning).toBe(true);
      expect(store2.getState().isTransitioning).toBe(true);

      await Promise.all([promise1, promise2]);

      // Verify different decks after transition
      expect(store1.getState().deck).not.toEqual(store2.getState().deck);
      
      // Verify discarded piles have correct cards with updated pile property
      expect(store1.getState().discardedPile).toHaveLength(lessImportant1.length);
      expect(store2.getState().discardedPile).toHaveLength(lessImportant2.length);
      expect(store1.getState().discardedPile[0].id).toBe(lessImportant1[0].id);
      expect(store2.getState().discardedPile[0].id).toBe(lessImportant2[0].id);
      expect(store1.getState().discardedPile[0].pile).toBe('discard');
      expect(store2.getState().discardedPile[0].pile).toBe('discard');
      
      expect(store1.getState().isTransitioning).toBe(false);
      expect(store2.getState().isTransitioning).toBe(false);
    });

    it('has all required action methods', () => {
      const state = store1.getState();
      
      expect(typeof state.initializeFromStep1).toBe('function');
      expect(typeof state.startTransition).toBe('function');
      expect(typeof state.flipNextCard).toBe('function');
      expect(typeof state.moveCardToPile).toBe('function');
      expect(typeof state.moveCardBetweenPiles).toBe('function');
      expect(typeof state.setDragging).toBe('function');
      expect(typeof state.showOverflowWarningMessage).toBe('function');
      expect(typeof state.hideOverflowWarningMessage).toBe('function');
      expect(typeof state.resetStep2).toBe('function');
      expect(typeof state.cleanup).toBe('function');
    });
  });

  describe('createStep3Store', () => {
    let store1: Step3Store;
    let store2: Step3Store;

    beforeEach(() => {
      store1 = createStep3Store();
      store2 = createStep3Store();
    });

    it('creates independent store instances', () => {
      expect(store1).not.toBe(store2);
      expect(store1.getState()).not.toBe(store2.getState());
    });

    it('initializes with correct default state', () => {
      const state = store1.getState();
      
      expect(state.deck).toEqual([]);
      expect(state.deckPosition).toBe(0);
      expect(state.stagingCard).toBeNull();
      expect(state.top3Pile).toEqual([]);
      expect(state.lessImportantPile).toEqual([]);
      expect(state.discardedPile).toEqual([]);
      expect(state.isDragging).toBe(false);
      expect(state.draggedCardId).toBeNull();
      expect(state.showOverflowWarning).toBe(false);
      expect(state.isTransitioning).toBe(false);
      expect(state.transitionPhase).toBeNull();
    });

    it('maintains Top 3 pile limit isolation', () => {
      const top8Cards1 = mockCards.slice(0, 8);
      const top8Cards2 = mockCards.slice(8, 16);
      
      // Initialize both stores
      store1.getState().initializeFromStep2(top8Cards1, [], []);
      store2.getState().initializeFromStep2(top8Cards2, [], []);
      
      // Fill Top 3 pile in store1
      store1.getState().flipNextCard();
      const card1 = store1.getState().stagingCard!;
      store1.getState().moveCardToPile(card1.id, 'top3');
      
      store1.getState().flipNextCard();
      const card2 = store1.getState().stagingCard!;
      store1.getState().moveCardToPile(card2.id, 'top3');
      
      store1.getState().flipNextCard();
      const card3 = store1.getState().stagingCard!;
      store1.getState().moveCardToPile(card3.id, 'top3');
      
      // Verify store1 has 3 cards, store2 has none
      expect(store1.getState().top3Pile).toHaveLength(3);
      expect(store2.getState().top3Pile).toHaveLength(0);
      
      // Try to add 4th card to store1 (should fail)
      store1.getState().flipNextCard();
      const card4 = store1.getState().stagingCard!;
      store1.getState().moveCardToPile(card4.id, 'top3');
      
      // Should still have only 3 cards and staging card should remain
      expect(store1.getState().top3Pile).toHaveLength(3);
      expect(store1.getState().stagingCard).toBeTruthy();
      
      // Store2 should still be unaffected
      expect(store2.getState().top3Pile).toHaveLength(0);
      expect(store2.getState().stagingCard).toBeNull();
    });

    it('has all required action methods', () => {
      const state = store1.getState();
      
      expect(typeof state.initializeFromStep2).toBe('function');
      expect(typeof state.startTransition).toBe('function');
      expect(typeof state.flipNextCard).toBe('function');
      expect(typeof state.moveCardToPile).toBe('function');
      expect(typeof state.moveCardBetweenPiles).toBe('function');
      expect(typeof state.setDragging).toBe('function');
      expect(typeof state.showOverflowWarningMessage).toBe('function');
      expect(typeof state.hideOverflowWarningMessage).toBe('function');
      expect(typeof state.resetStep3).toBe('function');
      expect(typeof state.cleanup).toBe('function');
    });
  });

  describe('Factory Integration', () => {
    it('creates stores with different memory addresses', () => {
      const step1a = createStep1Store();
      const step1b = createStep1Store();
      const step2a = createStep2Store();
      const step2b = createStep2Store();
      const step3a = createStep3Store();
      const step3b = createStep3Store();

      // Same type stores should be different instances
      expect(step1a).not.toBe(step1b);
      expect(step2a).not.toBe(step2b);
      expect(step3a).not.toBe(step3b);

      // Different type stores should also be different
      expect(step1a).not.toBe(step2a);
      expect(step2a).not.toBe(step3a);
      expect(step1a).not.toBe(step3a);
    });

    it('maintains complete functional isolation across factory types', () => {
      const step1Store = createStep1Store();
      const step2Store = createStep2Store();
      const step3Store = createStep3Store();

      // Set up different states in each
      step1Store.setState({ 
        deck: mockCards.slice(0, 5), 
        deckPosition: 2,
        isDragging: true 
      });
      
      step2Store.setState({ 
        deck: mockCards.slice(5, 10), 
        deckPosition: 3,
        isTransitioning: true 
      });
      
      step3Store.setState({ 
        deck: mockCards.slice(10, 15), 
        deckPosition: 1,
        showOverflowWarning: true 
      });

      // Verify complete isolation
      expect(step1Store.getState().deckPosition).toBe(2);
      expect(step2Store.getState().deckPosition).toBe(3);
      expect(step3Store.getState().deckPosition).toBe(1);

      expect(step1Store.getState().isDragging).toBe(true);
      expect(step2Store.getState().isDragging).toBe(false);
      expect(step3Store.getState().isDragging).toBe(false);

      expect(step1Store.getState().isTransitioning).toBe(undefined); // Step1 doesn't have this
      expect(step2Store.getState().isTransitioning).toBe(true);
      expect(step3Store.getState().isTransitioning).toBe(false);

      expect(step1Store.getState().showOverflowWarning).toBe(false);
      expect(step2Store.getState().showOverflowWarning).toBe(false);
      expect(step3Store.getState().showOverflowWarning).toBe(true);
    });
  });
});