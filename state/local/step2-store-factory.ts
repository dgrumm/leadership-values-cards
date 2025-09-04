/**
 * Step2 Store Factory - Creates isolated Step2 store instances
 * Converted from global singleton to factory function for participant isolation
 */

import { create } from 'zustand';
import { Card } from '@/lib/types/card';
import { Step2State } from './store-types';
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
 * Creates a new Step2 store instance
 * Each call returns a completely independent store instance
 * 
 * CRITICAL: This factory function enables participant isolation,
 * fixing the production-blocking state bleeding bug
 */
export function createStep2Store(
  sessionCode: string,
  participantId: string,
  participantName: string,
  viewerSync: ViewerSync | null = null
) {
  return create<Step2State>((set, get) => ({
    // Initial state
    deck: [],
    deckPosition: 0,
    stagingCard: null,
    top8Pile: [],
    lessImportantPile: [],
    discardedPile: [],
    isDragging: false,
    draggedCardId: null,
    showOverflowWarning: false,
    isTransitioning: false,
    transitionPhase: null,
    isRevealed: false,
    
    // Initialize Step 2 with cards from Step 1 (used for direct initialization without transition)
    initializeFromStep1: (moreImportantCards: Card[], lessImportantCards: Card[]) => {
      // Shuffle the "More Important" cards to become the new deck
      const shuffledDeck = shuffleArray([...moreImportantCards]).map(card => ({
        ...card,
        pile: 'deck' as const
      }));
      
      // Move "Less Important" cards to discard pile
      const discarded = lessImportantCards.map(card => ({
        ...card,
        pile: 'discard' as const
      }));
      
      set({
        deck: shuffledDeck,
        deckPosition: 0,
        stagingCard: null,
        top8Pile: [],
        lessImportantPile: [],
        discardedPile: discarded,
        isDragging: false,
        draggedCardId: null,
        showOverflowWarning: false,
        isTransitioning: false,
        transitionPhase: null,
      });
    },
    
    // Start transition from Step 1 with clearing animation
    startTransition: async (moreImportantCards: Card[], lessImportantCards: Card[]) => {
      // Start the transition phase
      set({
        isTransitioning: true,
        transitionPhase: 'clearing',
      });
      
      // Wait for clearing animation to complete (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Initialize the actual game state
      const shuffledDeck = shuffleArray([...moreImportantCards]).map(card => ({
        ...card,
        pile: 'deck' as const
      }));
      
      const discarded = lessImportantCards.map(card => ({
        ...card,
        pile: 'discard' as const
      }));
      
      // Complete the transition
      set({
        deck: shuffledDeck,
        deckPosition: 0,
        stagingCard: null,
        top8Pile: [],
        lessImportantPile: [],
        discardedPile: discarded,
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
    
    // Move card from staging to a pile (with Top 8 limit enforcement)
    moveCardToPile: (cardId: string, pile: 'top8' | 'less') => {
      const { stagingCard, top8Pile, lessImportantPile } = get();
      
      if (!stagingCard || stagingCard.id !== cardId) {
        return;
      }
      
      // Enforce 8-card limit for Top 8 pile
      if (pile === 'top8' && top8Pile.length >= 8) {
        // Trigger bounce animation and warning
        get().showOverflowWarningMessage();
        return;
      }
      
      const updatedCard = { 
        ...stagingCard, 
        pile: pile === 'top8' ? 'top8' as const : 'less' as const 
      };
      
      set({
        stagingCard: null,
        top8Pile: pile === 'top8' 
          ? [...top8Pile, updatedCard]
          : top8Pile,
        lessImportantPile: pile === 'less' 
          ? [...lessImportantPile, updatedCard]
          : lessImportantPile,
      });
      
      // Auto-flip next card if deck has more cards
      setTimeout(() => {
        get().flipNextCard();
      }, 300);
    },
    
    // Move card between piles (with Top 8 limit enforcement)
    moveCardBetweenPiles: (cardId: string, fromPile: 'top8' | 'less', toPile: 'top8' | 'less') => {
      const { top8Pile, lessImportantPile } = get();
      
      if (fromPile === toPile) return;
      
      // Check Top 8 limit when moving TO Top 8 pile
      if (toPile === 'top8' && top8Pile.length >= 8) {
        get().showOverflowWarningMessage();
        return;
      }
      
      const sourcePile = fromPile === 'top8' ? top8Pile : lessImportantPile;
      const cardIndex = sourcePile.findIndex(card => card.id === cardId);
      
      if (cardIndex === -1) return;
      
      const card = sourcePile[cardIndex];
      const updatedCard = { 
        ...card, 
        pile: toPile === 'top8' ? 'top8' as const : 'less' as const 
      };
      
      set({
        top8Pile: fromPile === 'top8' 
          ? top8Pile.filter(c => c.id !== cardId)
          : toPile === 'top8' 
            ? [...top8Pile, updatedCard]
            : top8Pile,
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
    
    // Show overflow warning message
    showOverflowWarningMessage: () => {
      set({ showOverflowWarning: true });
      // Auto-hide after 3 seconds
      setTimeout(() => {
        set({ showOverflowWarning: false });
      }, 3000);
    },
    
    // Hide overflow warning message
    hideOverflowWarningMessage: () => {
      set({ showOverflowWarning: false });
    },

    // Reveal Top 8 arrangement to other participants
    revealTop8: async () => {
      const state = get();
      if (state.top8Pile.length !== 8) {
        throw new Error('Must have exactly 8 cards in Top 8 pile to reveal');
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
          step: 'step2' as const,
          cards: state.top8Pile,
          isRevealed: true,
          lastUpdated: Date.now()
        };

        // Broadcast reveal
        await viewerSync.revealArrangement(arrangement);
        
        // Update local state
        set({ isRevealed: true });
        
        console.log(`🎉 [Step2Store] Top 8 revealed for participant ${participantId}`);
      } catch (error) {
        console.error('[Step2Store] Failed to reveal arrangement:', error);
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
        
        console.log(`👁️‍🗨️ [Step2Store] Arrangement hidden for participant ${participantId}`);
      } catch (error) {
        console.error('[Step2Store] Failed to hide arrangement:', error);
        throw new Error('Failed to hide arrangement');
      }
    },
    
    // Reset to initial state
    resetStep2: () => {
      set({
        deck: [],
        deckPosition: 0,
        stagingCard: null,
        top8Pile: [],
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
        top8Pile: [],
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
      console.log('Step 2 store cleaned up');
    },
  }));
}

// Export type for SessionStoreManager integration
export type Step2Store = ReturnType<typeof createStep2Store>;