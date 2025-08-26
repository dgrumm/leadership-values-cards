import { useStep2Store } from '@/state/local/step2-store';
import { Card } from '@/lib/types/card';

describe('Step2Store', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const mockCards: Card[] = [
    {
      id: 'card-1',
      value_name: 'Leadership',
      description: 'Leading by example',
      position: { x: 0, y: 0 },
      pile: 'more'
    },
    {
      id: 'card-2',
      value_name: 'Innovation',
      description: 'Thinking creatively',
      position: { x: 0, y: 0 },
      pile: 'more'
    },
    {
      id: 'card-3',
      value_name: 'Integrity',
      description: 'Acting with honesty',
      position: { x: 0, y: 0 },
      pile: 'less'
    }
  ];

  beforeEach(() => {
    useStep2Store.getState().resetStep2();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useStep2Store.getState();
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
  });

  describe('initializeFromStep1', () => {
    it('should initialize with more important cards as deck and less important as discarded', () => {
      const moreCards = mockCards.slice(0, 2);
      const lessCards = mockCards.slice(2);
      
      useStep2Store.getState().initializeFromStep1(moreCards, lessCards);
      
      const state = useStep2Store.getState();
      expect(state.deck).toHaveLength(2);
      expect(state.deck.every(card => card.pile === 'deck')).toBe(true);
      expect(state.discardedPile).toHaveLength(1);
      expect(state.discardedPile.every(card => card.pile === 'discard')).toBe(true);
      expect(state.deckPosition).toBe(0);
      expect(state.stagingCard).toBeNull();
      expect(state.top8Pile).toEqual([]);
      expect(state.lessImportantPile).toEqual([]);
    });

    it('should shuffle the deck cards', () => {
      const moreCards = Array.from({ length: 10 }, (_, i) => ({
        id: `card-${i}`,
        value_name: `Value ${i}`,
        description: `Description ${i}`,
        position: { x: 0, y: 0 },
        pile: 'more' as const
      }));
      
      useStep2Store.getState().initializeFromStep1(moreCards, []);
      
      const state = useStep2Store.getState();
      const deckOrder = state.deck.map(card => card.id);
      const originalOrder = moreCards.map(card => card.id);
      
      // Should be shuffled (unlikely to be same order)
      const isSameOrder = originalOrder.every((id, index) => id === deckOrder[index]);
      expect(isSameOrder).toBe(false);
    });
  });

  describe('startTransition', () => {
    it('should handle transition from clearing to complete', async () => {
      jest.useFakeTimers();
      const moreCards = mockCards.slice(0, 2);
      const lessCards = mockCards.slice(2);
      
      const transitionPromise = useStep2Store.getState().startTransition(moreCards, lessCards);
      
      // Should start in clearing phase
      expect(useStep2Store.getState().isTransitioning).toBe(true);
      expect(useStep2Store.getState().transitionPhase).toBe('clearing');
      
      // Fast-forward clearing animation
      jest.advanceTimersByTime(500);
      await Promise.resolve();
      
      const midState = useStep2Store.getState();
      expect(midState.isTransitioning).toBe(false);
      expect(midState.transitionPhase).toBe('complete');
      expect(midState.deck).toHaveLength(2);
      expect(midState.discardedPile).toHaveLength(1);
      
      // Fast-forward to clear complete phase
      jest.advanceTimersByTime(100);
      
      await transitionPromise;
      
      const finalState = useStep2Store.getState();
      expect(finalState.transitionPhase).toBeNull();
      
      jest.useRealTimers();
    });
  });

  describe('flipNextCard', () => {
    beforeEach(() => {
      useStep2Store.getState().initializeFromStep1(mockCards.slice(0, 2), []);
    });

    it('should flip next card to staging area', () => {
      useStep2Store.getState().flipNextCard();
      
      const state = useStep2Store.getState();
      expect(state.stagingCard).toBeTruthy();
      expect(state.stagingCard?.pile).toBe('staging');
      expect(state.deckPosition).toBe(1);
    });

    it('should not flip when staging area is occupied', () => {
      useStep2Store.getState().flipNextCard(); // First flip
      const firstCard = useStep2Store.getState().stagingCard;
      
      useStep2Store.getState().flipNextCard(); // Second flip (should be ignored)
      
      const state = useStep2Store.getState();
      expect(state.stagingCard).toEqual(firstCard);
      expect(state.deckPosition).toBe(1);
    });

    it('should not flip when deck is empty', () => {
      useStep2Store.setState({ deckPosition: useStep2Store.getState().deck.length });
      
      useStep2Store.getState().flipNextCard();
      
      const state = useStep2Store.getState();
      expect(state.stagingCard).toBeNull();
    });
  });

  describe('moveCardToPile', () => {
    beforeEach(() => {
      useStep2Store.getState().initializeFromStep1(mockCards.slice(0, 2), []);
      useStep2Store.getState().flipNextCard();
    });

    it('should move staging card to top8 pile', () => {
      const stagingCard = useStep2Store.getState().stagingCard!;
      
      useStep2Store.getState().moveCardToPile(stagingCard.id, 'top8');
      
      const state = useStep2Store.getState();
      expect(state.stagingCard).toBeNull();
      expect(state.top8Pile).toHaveLength(1);
      expect(state.top8Pile[0].id).toBe(stagingCard.id);
      expect(state.top8Pile[0].pile).toBe('top8');
    });

    it('should move staging card to less important pile', () => {
      const stagingCard = useStep2Store.getState().stagingCard!;
      
      useStep2Store.getState().moveCardToPile(stagingCard.id, 'less');
      
      const state = useStep2Store.getState();
      expect(state.stagingCard).toBeNull();
      expect(state.lessImportantPile).toHaveLength(1);
      expect(state.lessImportantPile[0].id).toBe(stagingCard.id);
      expect(state.lessImportantPile[0].pile).toBe('less');
    });

    it('should enforce 8-card limit for top8 pile', () => {
      // Fill top8 pile to capacity
      const mockTop8Cards = Array.from({ length: 8 }, (_, i) => ({
        id: `top8-${i}`,
        value_name: `Value ${i}`,
        description: `Description ${i}`,
        position: { x: 0, y: 0 },
        pile: 'top8' as const
      }));
      
      useStep2Store.setState({ top8Pile: mockTop8Cards });
      
      const stagingCard = useStep2Store.getState().stagingCard!;
      
      useStep2Store.getState().moveCardToPile(stagingCard.id, 'top8');
      
      const state = useStep2Store.getState();
      expect(state.stagingCard).toBeTruthy(); // Should still be in staging
      expect(state.top8Pile).toHaveLength(8); // Should not exceed limit
      expect(state.showOverflowWarning).toBe(true);
    });

    it('should auto-flip next card after successful move', async () => {
      jest.useFakeTimers();
      const stagingCard = useStep2Store.getState().stagingCard!;
      
      useStep2Store.getState().moveCardToPile(stagingCard.id, 'top8');
      
      // Before timeout
      expect(useStep2Store.getState().stagingCard).toBeNull();
      
      // After timeout
      jest.advanceTimersByTime(300);
      
      const state = useStep2Store.getState();
      expect(state.stagingCard).toBeTruthy();
      expect(state.deckPosition).toBe(2);
      
      jest.useRealTimers();
    });
  });

  describe('moveCardBetweenPiles', () => {
    beforeEach(() => {
      useStep2Store.getState().initializeFromStep1(mockCards.slice(0, 2), []);
      useStep2Store.getState().flipNextCard();
      const stagingCard = useStep2Store.getState().stagingCard!;
      useStep2Store.getState().moveCardToPile(stagingCard.id, 'top8');
    });

    it('should move card from top8 to less pile', () => {
      const top8Card = useStep2Store.getState().top8Pile[0];
      
      useStep2Store.getState().moveCardBetweenPiles(top8Card.id, 'top8', 'less');
      
      const state = useStep2Store.getState();
      expect(state.top8Pile).toHaveLength(0);
      expect(state.lessImportantPile).toHaveLength(1);
      expect(state.lessImportantPile[0].id).toBe(top8Card.id);
      expect(state.lessImportantPile[0].pile).toBe('less');
    });

    it('should move card from less to top8 pile', () => {
      const top8Card = useStep2Store.getState().top8Pile[0];
      // First move to less pile
      useStep2Store.getState().moveCardBetweenPiles(top8Card.id, 'top8', 'less');
      
      const lessCard = useStep2Store.getState().lessImportantPile[0];
      useStep2Store.getState().moveCardBetweenPiles(lessCard.id, 'less', 'top8');
      
      const state = useStep2Store.getState();
      expect(state.lessImportantPile).toHaveLength(0);
      expect(state.top8Pile).toHaveLength(1);
      expect(state.top8Pile[0].id).toBe(lessCard.id);
      expect(state.top8Pile[0].pile).toBe('top8');
    });

    it('should not move when source and target piles are same', () => {
      const top8Card = useStep2Store.getState().top8Pile[0];
      const originalState = useStep2Store.getState();
      
      useStep2Store.getState().moveCardBetweenPiles(top8Card.id, 'top8', 'top8');
      
      const newState = useStep2Store.getState();
      expect(newState.top8Pile).toEqual(originalState.top8Pile);
    });

    it('should enforce 8-card limit when moving to top8', () => {
      // Fill top8 pile to capacity (remove the existing card first)
      const mockTop8Cards = Array.from({ length: 8 }, (_, i) => ({
        id: `top8-${i}`,
        value_name: `Value ${i}`,
        description: `Description ${i}`,
        position: { x: 0, y: 0 },
        pile: 'top8' as const
      }));
      
      // Add a card to less pile to move
      const lessCard = {
        id: 'less-card',
        value_name: 'Less Value',
        description: 'Less Description',
        position: { x: 0, y: 0 },
        pile: 'less' as const
      };
      
      useStep2Store.setState({ 
        top8Pile: mockTop8Cards,
        lessImportantPile: [lessCard]
      });
      
      useStep2Store.getState().moveCardBetweenPiles(lessCard.id, 'less', 'top8');
      
      const state = useStep2Store.getState();
      expect(state.top8Pile).toHaveLength(8); // Should not exceed limit
      expect(state.lessImportantPile).toHaveLength(1); // Card should remain
      expect(state.showOverflowWarning).toBe(true);
    });
  });

  describe('setDragging', () => {
    it('should set dragging state to true with card ID', () => {
      useStep2Store.getState().setDragging(true, 'card-123');
      
      const state = useStep2Store.getState();
      expect(state.isDragging).toBe(true);
      expect(state.draggedCardId).toBe('card-123');
    });

    it('should set dragging state to false and clear card ID', () => {
      useStep2Store.getState().setDragging(true, 'card-123');
      useStep2Store.getState().setDragging(false);
      
      const state = useStep2Store.getState();
      expect(state.isDragging).toBe(false);
      expect(state.draggedCardId).toBeNull();
    });
  });

  describe('overflow warning', () => {
    it('should show overflow warning and auto-hide', () => {
      jest.useFakeTimers();
      
      useStep2Store.getState().showOverflowWarningMessage();
      
      expect(useStep2Store.getState().showOverflowWarning).toBe(true);
      
      // Fast-forward auto-hide
      jest.advanceTimersByTime(3000);
      
      expect(useStep2Store.getState().showOverflowWarning).toBe(false);
      
      jest.useRealTimers();
    });

    it('should hide overflow warning manually', () => {
      useStep2Store.setState({ showOverflowWarning: true });
      
      useStep2Store.getState().hideOverflowWarningMessage();
      
      expect(useStep2Store.getState().showOverflowWarning).toBe(false);
    });
  });

  describe('resetStep2', () => {
    it('should reset to initial state', () => {
      // Modify state
      useStep2Store.getState().initializeFromStep1(mockCards.slice(0, 2), []);
      useStep2Store.getState().setDragging(true, 'card-123');
      useStep2Store.setState({ showOverflowWarning: true });
      
      // Reset
      useStep2Store.getState().resetStep2();
      
      const state = useStep2Store.getState();
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
  });

  describe('cleanup', () => {
    it('should cleanup and log message', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Set some state
      useStep2Store.getState().initializeFromStep1(mockCards.slice(0, 2), []);
      
      useStep2Store.getState().cleanup();
      
      const state = useStep2Store.getState();
      expect(state.deck).toEqual([]);
      expect(state.deckPosition).toBe(0);
      expect(state.stagingCard).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Step 2 store cleaned up');
      
      consoleSpy.mockRestore();
    });
  });
});