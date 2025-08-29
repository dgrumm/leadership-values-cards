/**
 * State Isolation Tests - CRITICAL BUG FIX VALIDATION (Phase 04.5.2 Complete)
 * 
 * This test demonstrates that the SessionStoreManager completely fixes the
 * production-blocking state bleeding bug where User1 actions affected User2 UI.
 * 
 * BEFORE: useStep1Store() was a global singleton shared by all users
 * AFTER: SessionStoreManager creates isolated instances per participant
 * 
 * NOW: Real store factories ensure complete participant isolation
 */

import { SessionStoreManager } from '../../../lib/stores/session-store-manager';
import type { Card } from '@/lib/types/card';

// Mock card data for testing real store functionality
const mockCards: Card[] = Array.from({ length: 40 }, (_, i) => ({
  id: `card-${i + 1}`,
  title: `Test Card ${i + 1}`,
  description: `Description for test card ${i + 1}`,
  category: 'test',
  pile: 'deck' as const
}));

describe('State Isolation - CRITICAL BUG FIX (Real Stores)', () => {
  let manager: SessionStoreManager;

  beforeEach(() => {
    manager = new SessionStoreManager({
      enableDebugLogging: false,
      enableMemoryTracking: false
    });
  });

  describe('🚨 CRITICAL: Real Store State Isolation', () => {
    it('fixes production bug: User1 Step2 completion does not affect User2', async () => {
      // THE ORIGINAL BUG: User1 completing Step 2 showed "Continue to Step 3" for User2
      
      const user1Step2 = manager.getStep2Store('ABC123', 'user1');
      const user2Step2 = manager.getStep2Store('ABC123', 'user2');
      
      // CRITICAL: Different store instances
      expect(user1Step2).not.toBe(user2Step2);
      expect(user1Step2.getState()).not.toBe(user2Step2.getState());
      
      // Set up different states with real store functionality
      const user1Cards = mockCards.slice(0, 10);
      const user2Cards = mockCards.slice(10, 20);
      
      await user1Step2.getState().startTransition(user1Cards, []);
      await user2Step2.getState().startTransition(user2Cards, []);
      
      // User1 "completes" step 2
      user1Step2.setState({ 
        top8Pile: user1Cards.slice(0, 8),
        isTransitioning: false 
      });
      
      // CRITICAL FIX VERIFICATION: User2 remains unaffected
      expect(user1Step2.getState().top8Pile).toHaveLength(8);
      expect(user2Step2.getState().top8Pile).toHaveLength(0);
      
      // Decks contain different cards (shuffled from different input sets)
      expect(user1Step2.getState().deck).toHaveLength(10);
      expect(user2Step2.getState().deck).toHaveLength(10);
      expect(user1Step2.getState().deck).not.toEqual(user2Step2.getState().deck);
      
      // State bleeding is completely prevented
      expect(user1Step2.getState()).not.toBe(user2Step2.getState());
    });

    it('prevents Step1 deck state bleeding between participants', () => {
      const user1Step1 = manager.getStep1Store('ABC123', 'user1');
      const user2Step1 = manager.getStep1Store('ABC123', 'user2');
      
      // Set up different decks
      user1Step1.setState({ 
        deck: mockCards.slice(0, 5), 
        deckPosition: 0 
      });
      user2Step1.setState({ 
        deck: mockCards.slice(5, 10), 
        deckPosition: 0 
      });
      
      // User1 flips card
      user1Step1.getState().flipNextCard();
      
      // CRITICAL: User2 completely unaffected
      expect(user1Step1.getState().stagingCard?.id).toBe(mockCards[0].id);
      expect(user2Step1.getState().stagingCard).toBeNull();
      expect(user1Step1.getState().deckPosition).toBe(1);
      expect(user2Step1.getState().deckPosition).toBe(0);
    });

    it('prevents Step3 Top 3 pile interference between users', () => {
      const user1Step3 = manager.getStep3Store('ABC123', 'user1');
      const user2Step3 = manager.getStep3Store('ABC123', 'user2');
      
      // Initialize different decks
      user1Step3.getState().initializeFromStep2(mockCards.slice(0, 8), [], []);
      user2Step3.getState().initializeFromStep2(mockCards.slice(8, 16), [], []);
      
      // User1 builds Top 3 pile
      user1Step3.getState().flipNextCard();
      user1Step3.getState().moveCardToPile(user1Step3.getState().stagingCard!.id, 'top3');
      
      user1Step3.getState().flipNextCard();
      user1Step3.getState().moveCardToPile(user1Step3.getState().stagingCard!.id, 'top3');
      
      user1Step3.getState().flipNextCard();
      user1Step3.getState().moveCardToPile(user1Step3.getState().stagingCard!.id, 'top3');
      
      // CRITICAL: User2 unaffected by User1's Top 3 pile
      expect(user1Step3.getState().top3Pile).toHaveLength(3);
      expect(user2Step3.getState().top3Pile).toHaveLength(0);
      
      // Each user has their own shuffled deck from different input cards
      expect(user1Step3.getState().deck).toHaveLength(8);
      expect(user2Step3.getState().deck).toHaveLength(8);
      expect(user1Step3.getState().deck).not.toEqual(user2Step3.getState().deck);
    });
  });

  describe('🔒 Session Isolation', () => {
    it('completely isolates different sessions', () => {
      const sessionAUser1 = manager.getStep1Store('ABC123', 'user1');
      const sessionBUser1 = manager.getStep1Store('XYZ789', 'user1');
      
      // Same participant ID, different sessions = different stores
      expect(sessionAUser1).not.toBe(sessionBUser1);
      
      // Set different states
      sessionAUser1.setState({ isDragging: true });
      sessionBUser1.setState({ isDragging: false });
      
      // Verify complete isolation
      expect(sessionAUser1.getState().isDragging).toBe(true);
      expect(sessionBUser1.getState().isDragging).toBe(false);
    });
  });

  describe('🧹 Store Consistency', () => {
    it('returns same store instance for repeated access', () => {
      const store1 = manager.getStep1Store('ABC123', 'user1');
      const store2 = manager.getStep1Store('ABC123', 'user1');
      
      // Same session + participant = same store instance
      expect(store1).toBe(store2);
    });

    it('creates different stores for different participants', () => {
      const user1Store = manager.getStep1Store('ABC123', 'user1');
      const user2Store = manager.getStep1Store('ABC123', 'user2');
      
      // Different participants = different stores
      expect(user1Store).not.toBe(user2Store);
    });

    it('maintains isolation after cleanup', () => {
      const originalStore = manager.getStep1Store('ABC123', 'user1');
      originalStore.setState({ isDragging: true });
      
      // Clean up participant
      manager.cleanupParticipant('ABC123', 'user1');
      
      // Getting store again creates new instance with fresh state
      const newStore = manager.getStep1Store('ABC123', 'user1');
      expect(newStore).not.toBe(originalStore);
      expect(newStore.getState().isDragging).toBe(false); // Fresh state
    });
  });

  describe('🎯 Real Store Functionality Validation', () => {
    it('validates Step2 transition workflow works with isolation', async () => {
      const user1Store = manager.getStep2Store('ABC123', 'user1');
      const user2Store = manager.getStep2Store('ABC123', 'user2');
      
      // Different transition data
      const user1MoreImportant = mockCards.slice(0, 10);
      const user2MoreImportant = mockCards.slice(10, 20);
      
      // Concurrent transitions
      await Promise.all([
        user1Store.getState().startTransition(user1MoreImportant, []),
        user2Store.getState().startTransition(user2MoreImportant, [])
      ]);
      
      // Verify different shuffled decks
      expect(user1Store.getState().deck).not.toEqual(user2Store.getState().deck);
      expect(user1Store.getState().deck).toHaveLength(10);
      expect(user2Store.getState().deck).toHaveLength(10);
      
      // Both transitions completed independently
      expect(user1Store.getState().isTransitioning).toBe(false);
      expect(user2Store.getState().isTransitioning).toBe(false);
    });
  });
});