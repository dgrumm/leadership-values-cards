import { useStep3Store } from '@/state/local/step3-store';
import { Card } from '@/lib/types/card';

describe('Step3Store', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const mockTop8Cards: Card[] = Array.from({ length: 8 }, (_, i) => ({
    id: `top8-${i}`,
    value_name: `Top Value ${i}`,
    description: `Top Description ${i}`,
    position: { x: 0, y: 0 },
    pile: 'top8'
  }));

  const mockStep2Discarded: Card[] = [
    {
      id: 'step2-discard-1',
      value_name: 'Step2 Discard 1',
      description: 'Description',
      position: { x: 0, y: 0 },
      pile: 'less'
    }
  ];

  const mockStep1Discarded: Card[] = [
    {
      id: 'step1-discard-1',
      value_name: 'Step1 Discard 1',
      description: 'Description',
      position: { x: 0, y: 0 },
      pile: 'less'
    }
  ];

  beforeEach(() => {
    useStep3Store.getState().resetStep3();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useStep3Store.getState();
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
  });

  describe('initializeFromStep2', () => {
    it('should initialize with top8 cards as deck and combine discarded cards', () => {
      useStep3Store.getState().initializeFromStep2(
        mockTop8Cards,
        mockStep2Discarded,
        mockStep1Discarded
      );
      
      const state = useStep3Store.getState();
      expect(state.deck).toHaveLength(8);
      expect(state.deck.every(card => card.pile === 'deck')).toBe(true);
      expect(state.discardedPile).toHaveLength(2); // Combined from both steps
      expect(state.discardedPile.every(card => card.pile === 'discard')).toBe(true);
      expect(state.deckPosition).toBe(0);
      expect(state.stagingCard).toBeNull();
      expect(state.top3Pile).toEqual([]);
      expect(state.lessImportantPile).toEqual([]);
    });

    it('should shuffle the deck cards', () => {
      useStep3Store.getState().initializeFromStep2(mockTop8Cards, [], []);
      
      const state = useStep3Store.getState();
      const deckOrder = state.deck.map(card => card.id);
      const originalOrder = mockTop8Cards.map(card => card.id);
      
      // Should be shuffled (unlikely to be same order)
      const isSameOrder = originalOrder.every((id, index) => id === deckOrder[index]);
      expect(isSameOrder).toBe(false);
    });

    it('should handle empty discarded arrays', () => {
      useStep3Store.getState().initializeFromStep2(mockTop8Cards.slice(0, 3), [], []);
      
      const state = useStep3Store.getState();
      expect(state.deck).toHaveLength(3);
      expect(state.discardedPile).toEqual([]);
    });
  });

  describe('startTransition', () => {
    it('should handle transition from clearing to complete', async () => {
      jest.useFakeTimers();
      
      const transitionPromise = useStep3Store.getState().startTransition(
        mockTop8Cards.slice(0, 3),
        mockStep2Discarded,
        mockStep1Discarded
      );
      
      // Should start in clearing phase
      expect(useStep3Store.getState().isTransitioning).toBe(true);
      expect(useStep3Store.getState().transitionPhase).toBe('clearing');
      
      // Fast-forward clearing animation
      jest.advanceTimersByTime(500);
      await Promise.resolve();
      
      const midState = useStep3Store.getState();
      expect(midState.isTransitioning).toBe(false);
      expect(midState.transitionPhase).toBe('complete');
      expect(midState.deck).toHaveLength(3);
      expect(midState.discardedPile).toHaveLength(2);
      
      // Fast-forward to clear complete phase
      jest.advanceTimersByTime(100);
      
      await transitionPromise;
      
      const finalState = useStep3Store.getState();
      expect(finalState.transitionPhase).toBeNull();
      
      jest.useRealTimers();
    });
  });

  describe('flipNextCard', () => {
    beforeEach(() => {
      useStep3Store.getState().initializeFromStep2(mockTop8Cards.slice(0, 3), [], []);
    });

    it('should flip next card to staging area', () => {
      useStep3Store.getState().flipNextCard();
      
      const state = useStep3Store.getState();
      expect(state.stagingCard).toBeTruthy();
      expect(state.stagingCard?.pile).toBe('staging');
      expect(state.deckPosition).toBe(1);
    });

    it('should not flip when staging area is occupied', () => {
      useStep3Store.getState().flipNextCard(); // First flip
      const firstCard = useStep3Store.getState().stagingCard;
      
      useStep3Store.getState().flipNextCard(); // Second flip (should be ignored)
      
      const state = useStep3Store.getState();
      expect(state.stagingCard).toEqual(firstCard);
      expect(state.deckPosition).toBe(1);
    });

    it('should not flip when deck is empty', () => {
      useStep3Store.setState({ deckPosition: useStep3Store.getState().deck.length });
      
      useStep3Store.getState().flipNextCard();
      
      const state = useStep3Store.getState();
      expect(state.stagingCard).toBeNull();
    });
  });

  describe('moveCardToPile', () => {
    beforeEach(() => {
      useStep3Store.getState().initializeFromStep2(mockTop8Cards.slice(0, 3), [], []);
      useStep3Store.getState().flipNextCard();
    });

    it('should move staging card to top3 pile', () => {
      const stagingCard = useStep3Store.getState().stagingCard!;
      
      useStep3Store.getState().moveCardToPile(stagingCard.id, 'top3');
      
      const state = useStep3Store.getState();
      expect(state.stagingCard).toBeNull();
      expect(state.top3Pile).toHaveLength(1);
      expect(state.top3Pile[0].id).toBe(stagingCard.id);
      expect(state.top3Pile[0].pile).toBe('top3');
    });

    it('should move staging card to less important pile', () => {
      const stagingCard = useStep3Store.getState().stagingCard!;
      
      useStep3Store.getState().moveCardToPile(stagingCard.id, 'less');
      
      const state = useStep3Store.getState();
      expect(state.stagingCard).toBeNull();
      expect(state.lessImportantPile).toHaveLength(1);
      expect(state.lessImportantPile[0].id).toBe(stagingCard.id);
      expect(state.lessImportantPile[0].pile).toBe('less');
    });

    it('should enforce 3-card limit for top3 pile', () => {
      // Fill top3 pile to capacity
      const mockTop3Cards = Array.from({ length: 3 }, (_, i) => ({
        id: `top3-${i}`,
        value_name: `Value ${i}`,
        description: `Description ${i}`,
        position: { x: 0, y: 0 },
        pile: 'top3' as const
      }));
      
      useStep3Store.setState({ top3Pile: mockTop3Cards });
      
      const stagingCard = useStep3Store.getState().stagingCard!;
      
      useStep3Store.getState().moveCardToPile(stagingCard.id, 'top3');
      
      const state = useStep3Store.getState();
      expect(state.stagingCard).toBeTruthy(); // Should still be in staging
      expect(state.top3Pile).toHaveLength(3); // Should not exceed limit
      expect(state.showOverflowWarning).toBe(true);
    });

    it('should auto-flip next card after successful move', async () => {
      jest.useFakeTimers();
      const stagingCard = useStep3Store.getState().stagingCard!;
      
      useStep3Store.getState().moveCardToPile(stagingCard.id, 'top3');
      
      // Before timeout
      expect(useStep3Store.getState().stagingCard).toBeNull();
      
      // After timeout
      jest.advanceTimersByTime(300);
      
      const state = useStep3Store.getState();
      expect(state.stagingCard).toBeTruthy();
      expect(state.deckPosition).toBe(2);
      
      jest.useRealTimers();
    });
  });

  describe('moveCardBetweenPiles', () => {
    beforeEach(() => {
      useStep3Store.getState().initializeFromStep2(mockTop8Cards.slice(0, 3), [], []);
      useStep3Store.getState().flipNextCard();
      const stagingCard = useStep3Store.getState().stagingCard!;
      useStep3Store.getState().moveCardToPile(stagingCard.id, 'top3');
    });

    it('should move card from top3 to less pile', () => {
      const top3Card = useStep3Store.getState().top3Pile[0];
      
      useStep3Store.getState().moveCardBetweenPiles(top3Card.id, 'top3', 'less');
      
      const state = useStep3Store.getState();
      expect(state.top3Pile).toHaveLength(0);
      expect(state.lessImportantPile).toHaveLength(1);
      expect(state.lessImportantPile[0].id).toBe(top3Card.id);
      expect(state.lessImportantPile[0].pile).toBe('less');
    });

    it('should move card from less to top3 pile', () => {
      const top3Card = useStep3Store.getState().top3Pile[0];
      // First move to less pile
      useStep3Store.getState().moveCardBetweenPiles(top3Card.id, 'top3', 'less');
      
      const lessCard = useStep3Store.getState().lessImportantPile[0];
      useStep3Store.getState().moveCardBetweenPiles(lessCard.id, 'less', 'top3');
      
      const state = useStep3Store.getState();
      expect(state.lessImportantPile).toHaveLength(0);
      expect(state.top3Pile).toHaveLength(1);
      expect(state.top3Pile[0].id).toBe(lessCard.id);
      expect(state.top3Pile[0].pile).toBe('top3');
    });

    it('should not move when source and target piles are same', () => {
      const top3Card = useStep3Store.getState().top3Pile[0];
      const originalState = useStep3Store.getState();
      
      useStep3Store.getState().moveCardBetweenPiles(top3Card.id, 'top3', 'top3');
      
      const newState = useStep3Store.getState();
      expect(newState.top3Pile).toEqual(originalState.top3Pile);
    });

    it('should enforce 3-card limit when moving to top3', () => {
      // Fill top3 pile to capacity (remove the existing card first)
      const mockTop3Cards = Array.from({ length: 3 }, (_, i) => ({
        id: `top3-${i}`,
        value_name: `Value ${i}`,
        description: `Description ${i}`,
        position: { x: 0, y: 0 },
        pile: 'top3' as const
      }));
      
      // Add a card to less pile to move
      const lessCard = {
        id: 'less-card',
        value_name: 'Less Value',
        description: 'Less Description',
        position: { x: 0, y: 0 },
        pile: 'less' as const
      };
      
      useStep3Store.setState({ 
        top3Pile: mockTop3Cards,
        lessImportantPile: [lessCard]
      });
      
      useStep3Store.getState().moveCardBetweenPiles(lessCard.id, 'less', 'top3');
      
      const state = useStep3Store.getState();
      expect(state.top3Pile).toHaveLength(3); // Should not exceed limit
      expect(state.lessImportantPile).toHaveLength(1); // Card should remain
      expect(state.showOverflowWarning).toBe(true);
    });
  });

  describe('setDragging', () => {
    it('should set dragging state to true with card ID', () => {
      useStep3Store.getState().setDragging(true, 'card-123');
      
      const state = useStep3Store.getState();
      expect(state.isDragging).toBe(true);
      expect(state.draggedCardId).toBe('card-123');
    });

    it('should set dragging state to false and clear card ID', () => {
      useStep3Store.getState().setDragging(true, 'card-123');
      useStep3Store.getState().setDragging(false);
      
      const state = useStep3Store.getState();
      expect(state.isDragging).toBe(false);
      expect(state.draggedCardId).toBeNull();
    });
  });

  describe('overflow warning', () => {
    it('should show overflow warning and auto-hide after 5 seconds', () => {
      jest.useFakeTimers();
      
      useStep3Store.getState().showOverflowWarningMessage();
      
      expect(useStep3Store.getState().showOverflowWarning).toBe(true);
      
      // Should still be visible after 3 seconds (Step 3 has 5s timeout)
      jest.advanceTimersByTime(3000);
      expect(useStep3Store.getState().showOverflowWarning).toBe(true);
      
      // Should be hidden after 5 seconds
      jest.advanceTimersByTime(2000);
      expect(useStep3Store.getState().showOverflowWarning).toBe(false);
      
      jest.useRealTimers();
    });

    it('should hide overflow warning manually', () => {
      useStep3Store.setState({ showOverflowWarning: true });
      
      useStep3Store.getState().hideOverflowWarningMessage();
      
      expect(useStep3Store.getState().showOverflowWarning).toBe(false);
    });
  });

  describe('resetStep3', () => {
    it('should reset to initial state', () => {
      // Modify state
      useStep3Store.getState().initializeFromStep2(mockTop8Cards.slice(0, 3), [], []);
      useStep3Store.getState().setDragging(true, 'card-123');
      useStep3Store.setState({ showOverflowWarning: true });
      
      // Reset
      useStep3Store.getState().resetStep3();
      
      const state = useStep3Store.getState();
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
  });

  describe('cleanup', () => {
    it('should cleanup and log message', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Set some state
      useStep3Store.getState().initializeFromStep2(mockTop8Cards.slice(0, 3), [], []);
      
      useStep3Store.getState().cleanup();
      
      const state = useStep3Store.getState();
      expect(state.deck).toEqual([]);
      expect(state.deckPosition).toBe(0);
      expect(state.stagingCard).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('Step 3 store cleaned up');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty top8 cards array', () => {
      useStep3Store.getState().initializeFromStep2([], mockStep2Discarded, mockStep1Discarded);
      
      const state = useStep3Store.getState();
      expect(state.deck).toEqual([]);
      expect(state.discardedPile).toHaveLength(2);
    });

    it('should not move invalid card ID', () => {
      useStep3Store.getState().initializeFromStep2(mockTop8Cards.slice(0, 3), [], []);
      useStep3Store.getState().flipNextCard();
      const originalState = useStep3Store.getState();
      
      useStep3Store.getState().moveCardToPile('invalid-card-id', 'top3');
      
      const newState = useStep3Store.getState();
      expect(newState.stagingCard).toEqual(originalState.stagingCard);
      expect(newState.top3Pile).toEqual(originalState.top3Pile);
    });

    it('should not move card that does not exist in source pile', () => {
      const originalState = useStep3Store.getState();
      
      useStep3Store.getState().moveCardBetweenPiles('invalid-card-id', 'top3', 'less');
      
      const newState = useStep3Store.getState();
      expect(newState.top3Pile).toEqual(originalState.top3Pile);
      expect(newState.lessImportantPile).toEqual(originalState.lessImportantPile);
    });
  });
});