/**
 * State Isolation Tests - CRITICAL BUG FIX VALIDATION
 * 
 * This test demonstrates that the SessionStoreManager completely fixes the
 * production-blocking state bleeding bug where User1 actions affected User2 UI.
 * 
 * BEFORE: useStep1Store() was a global singleton shared by all users
 * AFTER: SessionStoreManager creates isolated instances per participant
 * 
 * UPDATED: Now uses real store factories instead of mock stores (Phase 04.5.2 complete)
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

describe('State Isolation - CRITICAL BUG FIX', () => {
  let manager: SessionStoreManager;

  beforeEach(() => {
    manager = new SessionStoreManager({
      enableDebugLogging: false // Clean test output
    });
  });

  describe('🚨 CRITICAL: Step completion state isolation', () => {
    it('should prevent User1 Step2 completion from affecting User2 UI state', async () => {
      // SCENARIO: The original bug that made collaborative sessions unusable
      // User1 completing Step 2 would show "Continue to Step 3" button for User2
      
      // Get stores for two different participants in same session
      const user1Step2Store = manager.getStep2Store('ABC123', 'user1');
      const user2Step2Store = manager.getStep2Store('ABC123', 'user2');
      
      // CRITICAL ASSERTION: Different participants get different store instances
      expect(user1Step2Store).not.toBe(user2Step2Store);
      expect(user1Step2Store.getState).not.toBe(user2Step2Store.getState);
      
      // REAL STORE VALIDATION: Initialize different states
      const user1Cards = mockCards.slice(0, 10);
      const user2Cards = mockCards.slice(10, 20);
      
      await user1Step2Store.getState().startTransition(user1Cards, []);
      await user2Step2Store.getState().startTransition(user2Cards, []);
      
      // CRITICAL: User1 completing step should not affect User2's state
      user1Step2Store.setState({ isTransitioning: false });
      
      // User2 should still be in their own independent state
      // Note: Decks are shuffled during transition, so we check different aspects
      expect(user1Step2Store.getState().deck).toHaveLength(10);
      expect(user2Step2Store.getState().deck).toHaveLength(10);
      expect(user1Step2Store.getState().deck).not.toEqual(user2Step2Store.getState().deck);
      expect(user1Step2Store.getState().isTransitioning).toBe(false);
      expect(user2Step2Store.getState().isTransitioning).toBe(false);
      
      // VERIFICATION: Complete state isolation
      expect(user1Step2Store.getState()).not.toBe(user2Step2Store.getState());
    });

    it('should isolate Step1 deck state between participants', () => {
      // SCENARIO: User1 flipping cards should not affect User2's deck
      
      const user1Step1Store = manager.getStep1Store('ABC123', 'user1');
      const user2Step1Store = manager.getStep1Store('ABC123', 'user2');
      
      // CRITICAL ASSERTION: Completely separate store instances
      expect(user1Step1Store).not.toBe(user2Step1Store);
      expect(user1Step1Store.getState).not.toBe(user2Step1Store.getState);
      
      // REAL STORE VALIDATION: Set up different decks
      const user1Cards = mockCards.slice(0, 5);
      const user2Cards = mockCards.slice(5, 10);
      
      user1Step1Store.setState({ deck: user1Cards, deckPosition: 0 });
      user2Step1Store.setState({ deck: user2Cards, deckPosition: 0 });
      
      // User1 flips card
      user1Step1Store.getState().flipNextCard();
      
      // CRITICAL: User2 should be unaffected
      expect(user1Step1Store.getState().stagingCard).not.toBeNull();
      expect(user2Step1Store.getState().stagingCard).toBeNull();
      expect(user1Step1Store.getState().deckPosition).toBe(1);
      expect(user2Step1Store.getState().deckPosition).toBe(0);
      
      // VERIFICATION: Different deck contents
      expect(user1Step1Store.getState().deck[0].id).toBe(user1Cards[0].id);
      expect(user2Step1Store.getState().deck[0].id).toBe(user2Cards[0].id);
    });

    it('should isolate Step3 final selection state between participants', () => {
      // SCENARIO: User1's final 3-card selection should not affect User2
      
      const user1Step3Store = manager.getStep3Store('ABC123', 'user1');
      const user2Step3Store = manager.getStep3Store('ABC123', 'user2');
      
      // CRITICAL ASSERTION: Independent final selection stores
      expect(user1Step3Store).not.toBe(user2Step3Store);
      expect(user1Step3Store.getState).not.toBe(user2Step3Store.getState);
      
      // VERIFICATION: Each user has isolated final step state with real functionality
      expect(typeof user1Step3Store.getState().flipNextCard).toBe('function');
      expect(typeof user2Step3Store.getState().flipNextCard).toBe('function');
      expect(user1Step3Store.getState().top3Pile).toEqual([]);
      expect(user2Step3Store.getState().top3Pile).toEqual([]);
    });
  });

  describe('🔒 Session isolation', () => {
    it('should completely isolate different sessions', () => {
      // SCENARIO: Users in different sessions should have zero shared state
      
      const session1User1 = manager.getStep1Store('ABC123', 'user1');
      const session2User1 = manager.getStep1Store('XYZ999', 'user1');
      
      // CRITICAL ASSERTION: Same participant ID, different sessions = different stores
      expect(session1User1).not.toBe(session2User1);
      expect(session1User1.getState()).not.toBe(session2User1.getState());
      
      // Verify they have independent state
      session1User1.setState({ isDragging: true });
      session2User1.setState({ isDragging: false });
      expect(session1User1.getState().isDragging).toBe(true);
      expect(session2User1.getState().isDragging).toBe(false);
    });

    it('should maintain session boundaries across all step types', () => {
      // Create stores for same participant in different sessions
      const session1Stores = {
        step1: manager.getStep1Store('ABC123', 'participant1'),
        step2: manager.getStep2Store('ABC123', 'participant1'),
        step3: manager.getStep3Store('ABC123', 'participant1')
      };
      
      const session2Stores = {
        step1: manager.getStep1Store('XYZ999', 'participant1'),
        step2: manager.getStep2Store('XYZ999', 'participant1'),
        step3: manager.getStep3Store('XYZ999', 'participant1')
      };
      
      // CRITICAL ASSERTION: All stores are different between sessions
      expect(session1Stores.step1).not.toBe(session2Stores.step1);
      expect(session1Stores.step2).not.toBe(session2Stores.step2);
      expect(session1Stores.step3).not.toBe(session2Stores.step3);
      
      // Verify each store has real functionality
      expect(typeof session1Stores.step1.getState().flipNextCard).toBe('function');
      expect(typeof session2Stores.step1.getState().flipNextCard).toBe('function');
      expect(typeof session1Stores.step2.getState().startTransition).toBe('function');
      expect(typeof session2Stores.step2.getState().startTransition).toBe('function');
      expect(typeof session1Stores.step3.getState().initializeFromStep2).toBe('function');
      expect(typeof session2Stores.step3.getState().initializeFromStep2).toBe('function');
    });
  });

  describe('🧪 Multi-user simulation', () => {
    it('should support multiple participants in same session with complete isolation', () => {
      const sessionCode = 'ABC123';
      const participantIds = ['user1', 'user2', 'user3', 'user4', 'user5'];
      
      // Create stores for all participants
      const allStores = participantIds.map(participantId => ({
        participantId,
        step1: manager.getStep1Store(sessionCode, participantId),
        step2: manager.getStep2Store(sessionCode, participantId),
        step3: manager.getStep3Store(sessionCode, participantId)
      }));
      
      // CRITICAL ASSERTION: Every store is unique (check instance references)
      const allStep1Stores = allStores.map(p => p.step1);
      const allStep2Stores = allStores.map(p => p.step2);  
      const allStep3Stores = allStores.map(p => p.step3);
      
      // No two participants should share the same store instance
      for (let i = 0; i < allStep1Stores.length; i++) {
        for (let j = i + 1; j < allStep1Stores.length; j++) {
          expect(allStep1Stores[i]).not.toBe(allStep1Stores[j]);
          expect(allStep2Stores[i]).not.toBe(allStep2Stores[j]);
          expect(allStep3Stores[i]).not.toBe(allStep3Stores[j]);
        }
      }
      
      // VERIFICATION: Session tracking works correctly
      expect(manager.getSessionCount()).toBe(1);
      expect(manager.getParticipantCount(sessionCode)).toBe(5);
    });

    it('should handle concurrent access patterns', () => {
      // SCENARIO: Multiple users accessing stores simultaneously
      
      const sessionCode = 'ABC123';
      const promises = [];
      
      // Simulate concurrent store access
      for (let i = 0; i < 10; i++) {
        promises.push(
          Promise.resolve().then(() => {
            const store1 = manager.getStep1Store(sessionCode, `user${i}`);
            const store2 = manager.getStep2Store(sessionCode, `user${i}`);
            const store3 = manager.getStep3Store(sessionCode, `user${i}`);
            
            return { user: `user${i}`, stores: { store1, store2, store3 } };
          })
        );
      }
      
      return Promise.all(promises).then(results => {
        // CRITICAL ASSERTION: All stores are unique despite concurrent access
        const allStep1Stores = results.map(r => r.stores.store1);
        const allStep2Stores = results.map(r => r.stores.store2);
        const allStep3Stores = results.map(r => r.stores.store3);
        
        // Verify all Step1 stores are unique
        for (let i = 0; i < allStep1Stores.length; i++) {
          for (let j = i + 1; j < allStep1Stores.length; j++) {
            expect(allStep1Stores[i]).not.toBe(allStep1Stores[j]);
            expect(allStep2Stores[i]).not.toBe(allStep2Stores[j]);
            expect(allStep3Stores[i]).not.toBe(allStep3Stores[j]);
          }
        }
        
        // VERIFICATION: Correct participant count
        expect(manager.getParticipantCount(sessionCode)).toBe(10);
      });
    });
  });

  describe('🔍 Store persistence and consistency', () => {
    it('should return same store instance for repeated access', () => {
      // SCENARIO: Same participant should get same store on repeated access
      
      const store1 = manager.getStep1Store('ABC123', 'user1');
      const store2 = manager.getStep1Store('ABC123', 'user1'); // Same call
      
      // CRITICAL ASSERTION: Same participant gets same store instance
      expect(store1).toBe(store2);
      expect(store1.getState()).toBe(store2.getState());
    });

    it('should maintain store consistency across different step types', () => {
      // SCENARIO: All step stores for participant should be in same bundle
      
      const step1Store = manager.getStep1Store('ABC123', 'user1');
      const step2Store = manager.getStep2Store('ABC123', 'user1');
      const step3Store = manager.getStep3Store('ABC123', 'user1');
      
      // Different store types but same participant - verify real functionality
      expect(typeof step1Store.getState().flipNextCard).toBe('function');
      expect(typeof step2Store.getState().startTransition).toBe('function');
      expect(typeof step3Store.getState().initializeFromStep2).toBe('function');
      
      // Each store has distinct functionality
      expect(step1Store.getState().moreImportantPile).toBeDefined();
      expect(step2Store.getState().top8Pile).toBeDefined();
      expect(step3Store.getState().top3Pile).toBeDefined();
      
      // All should be different store instances
      expect(step1Store).not.toBe(step2Store);
      expect(step2Store).not.toBe(step3Store);
      expect(step1Store).not.toBe(step3Store);
      
      // But repeated access should return same instances
      expect(manager.getStep1Store('ABC123', 'user1')).toBe(step1Store);
      expect(manager.getStep2Store('ABC123', 'user1')).toBe(step2Store);
      expect(manager.getStep3Store('ABC123', 'user1')).toBe(step3Store);
    });
  });

  describe('🧹 Cleanup and isolation maintenance', () => {
    it('should maintain isolation after participant cleanup', () => {
      // Create stores for multiple participants
      const user1Store = manager.getStep1Store('ABC123', 'user1');
      const user2Store = manager.getStep1Store('ABC123', 'user2');
      const user3Store = manager.getStep1Store('ABC123', 'user3');
      
      expect(manager.getParticipantCount('ABC123')).toBe(3);
      
      // Clean up one participant
      manager.cleanupParticipant('ABC123', 'user2');
      
      expect(manager.getParticipantCount('ABC123')).toBe(2);
      
      // CRITICAL ASSERTION: Other participants unaffected
      expect(manager.getStep1Store('ABC123', 'user1')).toBe(user1Store);
      expect(manager.getStep1Store('ABC123', 'user3')).toBe(user3Store);
      
      // New store created for cleaned up participant
      const newUser2Store = manager.getStep1Store('ABC123', 'user2');
      expect(newUser2Store).not.toBe(user2Store);
      expect(newUser2Store.getState()).not.toBe(user2Store.getState());
    });

    it('should maintain isolation after session cleanup', () => {
      // Create stores in multiple sessions
      manager.getStep1Store('ABC123', 'user1');
      manager.getStep1Store('ABC123', 'user2');
      manager.getStep1Store('XYZ999', 'user1');
      
      expect(manager.getSessionCount()).toBe(2);
      expect(manager.getParticipantCount('ABC123')).toBe(2);
      expect(manager.getParticipantCount('XYZ999')).toBe(1);
      
      // Clean up entire session
      manager.cleanupSession('ABC123');
      
      expect(manager.getSessionCount()).toBe(1);
      expect(manager.getParticipantCount('ABC123')).toBe(0);
      expect(manager.getParticipantCount('XYZ999')).toBe(1); // Unaffected
      
      // CRITICAL ASSERTION: Other sessions completely unaffected
      const remainingStore = manager.getStep1Store('XYZ999', 'user1');
      expect(remainingStore).toBeDefined();
      expect(typeof remainingStore.getState().flipNextCard).toBe('function');
      expect(remainingStore.getState().deck).toEqual([]);
    });
  });
});