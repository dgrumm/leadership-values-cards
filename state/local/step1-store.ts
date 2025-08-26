import { create } from 'zustand';
import { Card, CardDefinition } from '@/lib/types/card';
import { DEV_DECK } from '@/lib/generated/card-decks';

interface Step1State {
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
  
  // Actions
  initializeDeck: () => void;
  flipNextCard: () => void;
  moveCardToPile: (cardId: string, pile: 'more' | 'less') => void;
  moveCardBetweenPiles: (cardId: string, fromPile: 'more' | 'less', toPile: 'more' | 'less') => void;
  setDragging: (isDragging: boolean, cardId?: string) => void;
  resetStep1: () => void;
}

function createCardFromDefinition(definition: CardDefinition, index: number): Card {
  return {
    id: `card-${index}`,
    value_name: definition.value_name,
    description: definition.description,
    position: { x: 0, y: 0 },
    pile: 'deck',
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const useStep1Store = create<Step1State>((set, get) => ({
  // Initial state
  deck: [],
  deckPosition: 0,
  stagingCard: null,
  moreImportantPile: [],
  lessImportantPile: [],
  isDragging: false,
  draggedCardId: null,
  
  // Initialize deck with shuffled cards
  initializeDeck: () => {
    const shuffledDefinitions = shuffleArray(DEV_DECK);
    const initialDeck = shuffledDefinitions.map((def, index) => 
      createCardFromDefinition(def, index)
    );
    
    set({
      deck: initialDeck,
      deckPosition: 0,
      stagingCard: null,
      moreImportantPile: [],
      lessImportantPile: [],
      isDragging: false,
      draggedCardId: null,
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
  
  // Move card from staging to a pile
  moveCardToPile: (cardId: string, pile: 'more' | 'less') => {
    try {
      const { stagingCard, moreImportantPile, lessImportantPile } = get();
      
      if (!stagingCard || stagingCard.id !== cardId) {
        console.warn(`Cannot move card ${cardId}: not in staging area or card not found`);
        return;
      }
      
      // Validate pile parameter
      if (pile !== 'more' && pile !== 'less') {
        console.error(`Invalid pile type: ${pile}. Must be 'more' or 'less'`);
        return;
      }
    
      const updatedCard = { ...stagingCard, pile: pile === 'more' ? 'more' as const : 'less' as const };
      
      set({
        stagingCard: null,
        moreImportantPile: pile === 'more' 
          ? [...moreImportantPile, updatedCard]
          : moreImportantPile,
        lessImportantPile: pile === 'less' 
          ? [...lessImportantPile, updatedCard]
          : lessImportantPile,
      });
      
      // Auto-flip next card if deck has more cards
      setTimeout(() => {
        try {
          get().flipNextCard();
        } catch (error) {
          console.error('Error auto-flipping next card:', error);
        }
      }, 300); // Small delay for better UX
    } catch (error) {
      console.error('Error moving card to pile:', error);
    }
  },
  
  // Move card between piles
  moveCardBetweenPiles: (cardId: string, fromPile: 'more' | 'less', toPile: 'more' | 'less') => {
    try {
      const { moreImportantPile, lessImportantPile } = get();
      
      if (fromPile === toPile) {
        console.warn('Source and target piles are the same');
        return;
      }
      
      if (!cardId || typeof cardId !== 'string') {
        console.error('Invalid card ID provided');
        return;
      }
      
      const sourcePile = fromPile === 'more' ? moreImportantPile : lessImportantPile;
      const cardIndex = sourcePile.findIndex(card => card.id === cardId);
      
      if (cardIndex === -1) {
        console.warn(`Card ${cardId} not found in ${fromPile} pile`);
        return;
      }
      
      const card = sourcePile[cardIndex];
      const updatedCard = { ...card, pile: toPile === 'more' ? 'more' as const : 'less' as const };
      
      set({
        moreImportantPile: fromPile === 'more' 
          ? moreImportantPile.filter(c => c.id !== cardId)
          : toPile === 'more' 
            ? [...moreImportantPile, updatedCard]
            : moreImportantPile,
        lessImportantPile: fromPile === 'less' 
          ? lessImportantPile.filter(c => c.id !== cardId)
          : toPile === 'less' 
            ? [...lessImportantPile, updatedCard]
            : lessImportantPile,
      });
    } catch (error) {
      console.error('Error moving card between piles:', error);
    }
  },
  
  // Set dragging state
  setDragging: (isDragging: boolean, cardId?: string) => {
    set({
      isDragging,
      draggedCardId: isDragging ? cardId || null : null,
    });
  },
  
  // Reset to initial state
  resetStep1: () => {
    get().initializeDeck();
  },
}));