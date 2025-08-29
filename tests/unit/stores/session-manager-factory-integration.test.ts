/**
 * SessionStoreManager Factory Integration Tests
 * Validates that SessionStoreManager works correctly with real factory functions
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SessionStoreManager } from '@/lib/stores/session-store-manager';
import type { Card } from '@/lib/types/card';

// Mock card data for testing
const mockCards: Card[] = Array.from({ length: 40 }, (_, i) => ({
  id: `card-${i + 1}`,
  title: `Test Card ${i + 1}`,
  description: `Description for test card ${i + 1}`,
  category: 'test',
  pile: 'deck' as const
}));

describe('SessionStoreManager Factory Integration', () => {
  let manager: SessionStoreManager;
  
  beforeEach(() => {
    manager = new SessionStoreManager({
      enableDebugLogging: false, // Quiet during tests
      enableMemoryTracking: false
    });
  });

  afterEach(() => {
    // Clean up all sessions
    manager.performAutoCleanup();
  });

  describe('Real Store Creation', () => {
    it('creates real Step1 stores with full functionality', () => {
      const store = manager.getStep1Store('ABC123', 'user1');
      const state = store.getState();

      // Verify it's a real store, not a mock
      expect(typeof state.initializeDeck).toBe('function');
      expect(typeof state.flipNextCard).toBe('function');
      expect(typeof state.moveCardToPile).toBe('function');
      expect(state.deck).toEqual([]);
      expect(state.deckPosition).toBe(0);
      expect(state.stagingCard).toBeNull();
      
      // Mock stores would have _mockStoreType property
      expect((state as any)._mockStoreType).toBeUndefined();
    });

    it('creates real Step2 stores with full functionality', () => {
      const store = manager.getStep2Store('ABC123', 'user1');
      const state = store.getState();

      // Verify it's a real store, not a mock
      expect(typeof state.initializeFromStep1).toBe('function');
      expect(typeof state.startTransition).toBe('function');
      expect(typeof state.flipNextCard).toBe('function');
      expect(typeof state.cleanup).toBe('function');
      expect(state.deck).toEqual([]);
      expect(state.top8Pile).toEqual([]);
      expect(state.isTransitioning).toBe(false);
      
      // Mock stores would have _mockStoreType property
      expect((state as any)._mockStoreType).toBeUndefined();
    });

    it('creates real Step3 stores with full functionality', () => {
      const store = manager.getStep3Store('ABC123', 'user1');
      const state = store.getState();

      // Verify it's a real store, not a mock
      expect(typeof state.initializeFromStep2).toBe('function');
      expect(typeof state.startTransition).toBe('function');
      expect(typeof state.flipNextCard).toBe('function');
      expect(typeof state.cleanup).toBe('function');
      expect(state.deck).toEqual([]);
      expect(state.top3Pile).toEqual([]);
      expect(state.isTransitioning).toBe(false);
      
      // Mock stores would have _mockStoreType property
      expect((state as any)._mockStoreType).toBeUndefined();
    });
  });

  describe('Real Store State Isolation', () => {
    it('maintains complete isolation between participants with real stores', () => {
      // Get stores for two different participants
      const user1Step1 = manager.getStep1Store('ABC123', 'user1');
      const user2Step1 = manager.getStep1Store('ABC123', 'user2');

      // Initialize different deck states
      user1Step1.setState({ 
        deck: mockCards.slice(0, 5),
        deckPosition: 0 
      });
      
      user2Step1.setState({ 
        deck: mockCards.slice(5, 10),
        deckPosition: 0 
      });

      // Flip card for user1 only
      user1Step1.getState().flipNextCard();

      // Verify isolation
      expect(user1Step1.getState().stagingCard).not.toBeNull();
      expect(user2Step1.getState().stagingCard).toBeNull();
      expect(user1Step1.getState().deckPosition).toBe(1);
      expect(user2Step1.getState().deckPosition).toBe(0);

      // Verify different deck contents
      expect(user1Step1.getState().deck[0].id).toBe(mockCards[0].id);
      expect(user2Step1.getState().deck[0].id).toBe(mockCards[5].id);
    });

    it('maintains isolation across different step stores for same participant', () => {
      const user1Step1 = manager.getStep1Store('ABC123', 'user1');
      const user1Step2 = manager.getStep2Store('ABC123', 'user1');
      const user1Step3 = manager.getStep3Store('ABC123', 'user1');

      // Set different states in each step
      user1Step1.setState({ 
        deck: mockCards.slice(0, 5), 
        isDragging: true 
      });
      
      user1Step2.setState({ 
        deck: mockCards.slice(5, 10), 
        isTransitioning: true 
      });
      
      user1Step3.setState({ 
        deck: mockCards.slice(10, 15), 
        showOverflowWarning: true 
      });

      // Verify complete isolation between steps
      expect(user1Step1.getState().deck).toHaveLength(5);
      expect(user1Step2.getState().deck).toHaveLength(5);
      expect(user1Step3.getState().deck).toHaveLength(5);

      expect(user1Step1.getState().isDragging).toBe(true);
      expect(user1Step2.getState().isDragging).toBe(false);
      expect(user1Step3.getState().isDragging).toBe(false);

      expect(user1Step1.getState().showOverflowWarning).toBe(false);
      expect(user1Step2.getState().showOverflowWarning).toBe(false);
      expect(user1Step3.getState().showOverflowWarning).toBe(true);
    });
  });

  describe('Real Store Functionality', () => {
    it('supports full Step1 card sorting workflow', () => {
      const store = manager.getStep1Store('ABC123', 'user1');
      
      // Set up deck
      store.setState({ 
        deck: mockCards.slice(0, 5).map(card => ({ ...card, pile: 'deck' as const })),
        deckPosition: 0 
      });

      // Flip first card
      store.getState().flipNextCard();
      expect(store.getState().stagingCard).not.toBeNull();
      expect(store.getState().deckPosition).toBe(1);
      
      // Move to pile
      const cardId = store.getState().stagingCard!.id;
      store.getState().moveCardToPile(cardId, 'more');
      
      expect(store.getState().stagingCard).toBeNull();
      expect(store.getState().moreImportantPile).toHaveLength(1);
      expect(store.getState().moreImportantPile[0].id).toBe(cardId);
    });

    it('supports full Step2 transition workflow', async () => {
      const store = manager.getStep2Store('ABC123', 'user1');
      
      const moreImportant = mockCards.slice(0, 10);
      const lessImportant = mockCards.slice(10, 20);
      
      // Start transition
      await store.getState().startTransition(moreImportant, lessImportant);
      
      // Verify state after transition
      expect(store.getState().isTransitioning).toBe(false);
      expect(store.getState().deck).toHaveLength(10);
      expect(store.getState().discardedPile).toHaveLength(10);
      
      // Verify discarded pile has correct cards with updated pile property
      expect(store.getState().discardedPile[0].id).toBe(lessImportant[0].id);
      expect(store.getState().discardedPile[0].pile).toBe('discard');
    });

    it('supports full Step3 Top 3 limit enforcement', () => {
      const store = manager.getStep3Store('ABC123', 'user1');
      
      // Initialize with cards
      const top8Cards = mockCards.slice(0, 8);
      store.getState().initializeFromStep2(top8Cards, [], []);
      
      // Fill Top 3 pile
      store.getState().flipNextCard();
      let stagingCard = store.getState().stagingCard!;
      store.getState().moveCardToPile(stagingCard.id, 'top3');
      
      store.getState().flipNextCard();
      stagingCard = store.getState().stagingCard!;
      store.getState().moveCardToPile(stagingCard.id, 'top3');
      
      store.getState().flipNextCard();
      stagingCard = store.getState().stagingCard!;
      store.getState().moveCardToPile(stagingCard.id, 'top3');
      
      expect(store.getState().top3Pile).toHaveLength(3);
      
      // Try to add 4th card (should fail)
      store.getState().flipNextCard();
      const fourthCard = store.getState().stagingCard!;
      store.getState().moveCardToPile(fourthCard.id, 'top3');
      
      // Should still have only 3 cards
      expect(store.getState().top3Pile).toHaveLength(3);
      expect(store.getState().stagingCard).toBeTruthy(); // Card remains in staging
    });
  });

  describe('Cross-Session Isolation with Real Stores', () => {
    it('prevents state bleeding between different sessions', () => {
      // Create stores for different sessions
      const sessionAUser1 = manager.getStep1Store('ABC123', 'user1');
      const sessionBUser1 = manager.getStep1Store('XYZ789', 'user1');
      
      // Set up different states
      sessionAUser1.setState({ 
        deck: mockCards.slice(0, 5),
        isDragging: true 
      });
      
      sessionBUser1.setState({ 
        deck: mockCards.slice(10, 15),
        isDragging: false 
      });
      
      // Perform actions in session A
      sessionAUser1.getState().flipNextCard();
      sessionAUser1.getState().setDragging(false);
      
      // Verify session B is unaffected
      expect(sessionBUser1.getState().stagingCard).toBeNull();
      expect(sessionBUser1.getState().isDragging).toBe(false);
      expect(sessionBUser1.getState().deck[0].id).toBe(mockCards[10].id);
      
      // Verify session A has its own state
      expect(sessionAUser1.getState().stagingCard).not.toBeNull();
      expect(sessionAUser1.getState().deck[0].id).toBe(mockCards[0].id);
    });
  });

  describe('Store Consistency', () => {
    it('returns same store instance for same session/participant combination', () => {
      const store1 = manager.getStep1Store('ABC123', 'user1');
      const store2 = manager.getStep1Store('ABC123', 'user1');
      
      expect(store1).toBe(store2);
    });

    it('returns different store instances for different participants', () => {
      const user1Store = manager.getStep1Store('ABC123', 'user1');
      const user2Store = manager.getStep1Store('ABC123', 'user2');
      
      expect(user1Store).not.toBe(user2Store);
    });

    it('returns different store instances for different sessions', () => {
      const sessionAStore = manager.getStep1Store('ABC123', 'user1');
      const sessionBStore = manager.getStep1Store('XYZ789', 'user1');
      
      expect(sessionAStore).not.toBe(sessionBStore);
    });
  });

  describe('Memory Management with Real Stores', () => {
    it('properly cleans up real stores when participant is removed', () => {
      // Create some stores
      const step1Store = manager.getStep1Store('ABC123', 'user1');
      const step2Store = manager.getStep2Store('ABC123', 'user1');
      const step3Store = manager.getStep3Store('ABC123', 'user1');
      
      // Set some state
      step1Store.setState({ isDragging: true });
      step2Store.setState({ isTransitioning: true });
      step3Store.setState({ showOverflowWarning: true });
      
      expect(manager.getParticipantCount('ABC123')).toBe(1);
      
      // Clean up participant
      manager.cleanupParticipant('ABC123', 'user1');
      
      expect(manager.getParticipantCount('ABC123')).toBe(0);
      
      // Getting stores again should create new instances
      const newStep1Store = manager.getStep1Store('ABC123', 'user1');
      expect(newStep1Store).not.toBe(step1Store);
      expect(newStep1Store.getState().isDragging).toBe(false); // Reset to initial state
    });
  });
});