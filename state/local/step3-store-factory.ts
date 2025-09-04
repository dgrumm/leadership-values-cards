/**
 * Step3 Store Factory - Creates isolated Step3 store instances
 * Converted from global singleton to factory function for participant isolation
 */

import { create } from 'zustand';
import { Card } from '@/lib/types/card';
import { Step3State } from './store-types';
import type { ViewerSync, ViewerArrangement } from '@/lib/collaboration/viewer-sync';

// Helper function (copied from original store)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Creates a new Step3 store instance
 * Each call returns a completely independent store instance
 * 
 * CRITICAL: This factory function enables participant isolation,
 * fixing the production-blocking state bleeding bug
 */
export function createStep3Store(
  sessionCode: string,
  participantId: string,
  participantName: string,
  viewerSync: ViewerSync | null = null
) {
  return create<Step3State>((set, get) => ({
    // Initial state
    deck: [],
    deckPosition: 0,
    stagingCard: null,
    top3Pile: [],
    lessImportantPile: [],
    discardedPile: [],
    isDragging: false,
    draggedCardId: null,
    showOverflowWarning: false,
    isTransitioning: false,
    transitionPhase: null,
    isRevealed: false,
    
    // Initialize Step 3 with cards from Step 2 (direct initialization)
    initializeFromStep2: (top8Cards: Card[], step2DiscardedCards: Card[], step1DiscardedCards: Card[]) => {
      // Shuffle the Top 8 cards to become the new deck
      const shuffledDeck = shuffleArray([...top8Cards]).map(card => ({
        ...card,
        pile: 'deck' as const
      }));
      
      // Combine all discarded cards from previous steps
      const allDiscarded = [...step2DiscardedCards, ...step1DiscardedCards].map(card => ({
        ...card,
        pile: 'discard' as const
      }));
      
      set({
        deck: shuffledDeck,
        deckPosition: 0,
        stagingCard: null,
        top3Pile: [],
        lessImportantPile: [],
        discardedPile: allDiscarded,
        isDragging: false,
        draggedCardId: null,
        showOverflowWarning: false,
        isTransitioning: false,
        transitionPhase: null,
      });
    },
    
    // Start transition from Step 2 with clearing animation
    startTransition: async (top8Cards: Card[], step2DiscardedCards: Card[], step1DiscardedCards: Card[]) => {
      // Start the transition phase
      set({
        isTransitioning: true,
        transitionPhase: 'clearing',
      });
      
      // Wait for clearing animation to complete (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Initialize the actual game state
      const shuffledDeck = shuffleArray([...top8Cards]).map(card => ({
        ...card,
        pile: 'deck' as const
      }));
      
      const allDiscarded = [...step2DiscardedCards, ...step1DiscardedCards].map(card => ({
        ...card,
        pile: 'discard' as const
      }));
      
      // Complete the transition
      set({
        deck: shuffledDeck,
        deckPosition: 0,
        stagingCard: null,
        top3Pile: [],
        lessImportantPile: [],
        discardedPile: allDiscarded,
        isDragging: false,
        draggedCardId: null,
        showOverflowWarning: false,
        isTransitioning: false,
        transitionPhase: 'complete',
      });
      
      // Clear the completed phase after a short delay
      setTimeout(() => {
        set({ transitionPhase: null });
      }, 100);
    },
    
    // Flip the next card from deck to staging
    flipNextCard: () => {
      const { deck, deckPosition, stagingCard } = get();
      
      // Can't flip if staging area is occupied or deck is empty
      if (stagingCard || deckPosition >= deck.length) {
        return;
      }
      
      const nextCard = deck[deckPosition];
      const updatedCard = { ...nextCard, pile: 'staging' as const };
      
      set({
        stagingCard: updatedCard,
        deckPosition: deckPosition + 1,
      });
    },
    
    // Move card from staging to a pile (with Top 3 limit enforcement)
    moveCardToPile: (cardId: string, pile: 'top3' | 'less') => {
      const { stagingCard, top3Pile, lessImportantPile } = get();
      
      if (!stagingCard || stagingCard.id !== cardId) {
        return;
      }
      
      // Enforce 3-card limit for Top 3 pile
      if (pile === 'top3' && top3Pile.length >= 3) {
        // Trigger bounce animation and warning
        get().showOverflowWarningMessage();
        return;
      }
      
      const updatedCard = { 
        ...stagingCard, 
        pile: pile === 'top3' ? 'top3' as const : 'less' as const 
      };
      
      set({
        stagingCard: null,
        top3Pile: pile === 'top3' 
          ? [...top3Pile, updatedCard]
          : top3Pile,
        lessImportantPile: pile === 'less' 
          ? [...lessImportantPile, updatedCard]
          : lessImportantPile,
      });
      
      // Auto-flip next card if deck has more cards
      setTimeout(() => {
        get().flipNextCard();
      }, 300);
    },
    
    // Move card between piles (with Top 3 limit enforcement)
    moveCardBetweenPiles: (cardId: string, fromPile: 'top3' | 'less', toPile: 'top3' | 'less') => {
      const { top3Pile, lessImportantPile } = get();
      
      if (fromPile === toPile) return;
      
      // Check Top 3 limit when moving TO Top 3 pile
      if (toPile === 'top3' && top3Pile.length >= 3) {
        get().showOverflowWarningMessage();
        return;
      }
      
      const sourcePile = fromPile === 'top3' ? top3Pile : lessImportantPile;
      const cardIndex = sourcePile.findIndex(card => card.id === cardId);
      
      if (cardIndex === -1) return;
      
      const card = sourcePile[cardIndex];
      const updatedCard = { 
        ...card, 
        pile: toPile === 'top3' ? 'top3' as const : 'less' as const 
      };
      
      set({
        top3Pile: fromPile === 'top3' 
          ? top3Pile.filter(c => c.id !== cardId)
          : toPile === 'top3' 
            ? [...top3Pile, updatedCard]
            : top3Pile,
        lessImportantPile: fromPile === 'less' 
          ? lessImportantPile.filter(c => c.id !== cardId)
          : toPile === 'less' 
            ? [...lessImportantPile, updatedCard]
            : lessImportantPile,
      });
    },
    
    // Set dragging state
    setDragging: (isDragging: boolean, cardId?: string) => {
      set({
        isDragging,
        draggedCardId: isDragging ? cardId || null : null,
      });
    },
    
    // Show overflow warning message (extended time for final step)
    showOverflowWarningMessage: () => {
      set({ showOverflowWarning: true });
      // Auto-hide after 5 seconds (longer for Step 3 importance)
      setTimeout(() => {
        set({ showOverflowWarning: false });
      }, 5000);
    },
    
    // Hide overflow warning message
    hideOverflowWarningMessage: () => {
      set({ showOverflowWarning: false });
    },

    // Reveal Top 3 arrangement to other participants
    revealTop3: async () => {
      const state = get();
      if (state.top3Pile.length !== 3) {
        throw new Error('Must have exactly 3 cards in Top 3 pile to reveal');
      }

      if (!viewerSync) {
        console.warn('ViewerSync not available - reveal functionality disabled');
        return;
      }

      try {
        // Create arrangement data
        const arrangement: ViewerArrangement = {
          participantId,
          participantName,
          step: 'step3' as const,
          cards: state.top3Pile,
          isRevealed: true,
          lastUpdated: Date.now()
        };

        // Broadcast reveal
        await viewerSync.revealArrangement(arrangement);
        
        // Update local state
        set({ isRevealed: true });
        
        console.log(`🎉 [Step3Store] Top 3 revealed for participant ${participantId}`);
      } catch (error) {
        console.error('[Step3Store] Failed to reveal arrangement:', error);
        throw new Error('Failed to reveal arrangement');
      }
    },

    // Hide revealed arrangement
    hideReveal: async () => {
      if (!viewerSync) {
        console.warn('ViewerSync not available - hide functionality disabled');
        return;
      }

      try {
        await viewerSync.hideArrangement(participantId);
        set({ isRevealed: false });
        
        console.log(`👁️‍🗨️ [Step3Store] Arrangement hidden for participant ${participantId}`);
      } catch (error) {
        console.error('[Step3Store] Failed to hide arrangement:', error);
        throw new Error('Failed to hide arrangement');
      }
    },
    
    // Reset to initial state
    resetStep3: () => {
      set({
        deck: [],
        deckPosition: 0,
        stagingCard: null,
        top3Pile: [],
        lessImportantPile: [],
        discardedPile: [],
        isDragging: false,
        draggedCardId: null,
        showOverflowWarning: false,
        isTransitioning: false,
        transitionPhase: null,
        isRevealed: false,
      });
    },
    
    // Cleanup method to prevent memory leaks
    cleanup: () => {
      // Clear any pending timeouts
      const state = get();
      
      // Reset all state to initial values
      set({
        deck: [],
        deckPosition: 0,
        stagingCard: null,
        top3Pile: [],
        lessImportantPile: [],
        discardedPile: [],
        isDragging: false,
        draggedCardId: null,
        showOverflowWarning: false,
        isTransitioning: false,
        transitionPhase: null,
        isRevealed: false,
      });
      
      // Clean up any event listeners or subscriptions would go here
      console.log('Step 3 store cleaned up');
    },
  }));
}

// Export type for SessionStoreManager integration
export type Step3Store = ReturnType<typeof createStep3Store>;