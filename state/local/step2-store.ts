import { create } from 'zustand';
import { Card } from '@/lib/types/card';

interface Step2State {
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
  
  // Actions
  initializeFromStep1: (moreImportantCards: Card[], lessImportantCards: Card[]) => void;
  flipNextCard: () => void;
  moveCardToPile: (cardId: string, pile: 'top8' | 'less') => void;
  moveCardBetweenPiles: (cardId: string, fromPile: 'top8' | 'less', toPile: 'top8' | 'less') => void;
  setDragging: (isDragging: boolean, cardId?: string) => void;
  showOverflowWarningMessage: () => void;
  hideOverflowWarningMessage: () => void;
  resetStep2: () => void;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const useStep2Store = create<Step2State>((set, get) => ({
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
  
  // Initialize Step 2 with cards from Step 1
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
    });
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
    });
  },
}));