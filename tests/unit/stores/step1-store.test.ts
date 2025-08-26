import { useStep1Store } from '@/state/local/step1-store';
import { DEVELOPMENT_DECK } from '@/lib/generated/card-decks';

describe('Step1Store', () => {
  beforeEach(() => {
    // Reset to completely clean state
    useStep1Store.setState({
      deck: [],
      deckPosition: 0,
      stagingCard: null,
      moreImportantPile: [],
      lessImportantPile: [],
      isDragging: false,
      draggedCardId: null,
    });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useStep1Store.getState();
      expect(state.deck).toEqual([]);
      expect(state.deckPosition).toBe(0);
      expect(state.stagingCard).toBeNull();
      expect(state.moreImportantPile).toEqual([]);
      expect(state.lessImportantPile).toEqual([]);
      expect(state.isDragging).toBe(false);
      expect(state.draggedCardId).toBeNull();
    });
  });

  describe('initializeDeck', () => {
    it('should initialize deck with shuffled cards', () => {
      const state = useStep1Store.getState();
      state.initializeDeck();
      
      const newState = useStep1Store.getState();
      expect(newState.deck).toHaveLength(DEVELOPMENT_DECK.length);
      expect(newState.deckPosition).toBe(0);
      expect(newState.stagingCard).toBeNull();
      expect(newState.moreImportantPile).toEqual([]);
      expect(newState.lessImportantPile).toEqual([]);
    });

    it('should create cards with correct structure', () => {
      const state = useStep1Store.getState();
      state.initializeDeck();
      
      const newState = useStep1Store.getState();
      const firstCard = newState.deck[0];
      
      expect(firstCard).toHaveProperty('id');
      expect(firstCard).toHaveProperty('value_name');
      expect(firstCard).toHaveProperty('description');
      expect(firstCard).toHaveProperty('position');
      expect(firstCard.pile).toBe('deck');
      expect(firstCard.id).toMatch(/^card-\d+$/);
    });

    it('should shuffle cards from original order', () => {
      const state = useStep1Store.getState();
      const originalOrder = DEVELOPMENT_DECK.map(def => def.value_name);
      
      state.initializeDeck();
      const shuffledOrder = useStep1Store.getState().deck.map(card => card.value_name);
      
      // Test that it's unlikely to be the same order (could fail rarely)
      const isSameOrder = originalOrder.every((name, index) => name === shuffledOrder[index]);
      expect(isSameOrder).toBe(false);
    });
  });

  describe('flipNextCard', () => {
    beforeEach(() => {
      useStep1Store.getState().initializeDeck();
    });

    it('should flip next card to staging area', () => {
      const state = useStep1Store.getState();
      state.flipNextCard();
      
      const newState = useStep1Store.getState();
      expect(newState.stagingCard).toBeTruthy();
      expect(newState.stagingCard?.pile).toBe('staging');
      expect(newState.deckPosition).toBe(1);
    });

    it('should not flip card when staging area is occupied', () => {
      const state = useStep1Store.getState();
      state.flipNextCard(); // First flip
      const firstCard = useStep1Store.getState().stagingCard;
      
      state.flipNextCard(); // Second flip (should be ignored)
      const newState = useStep1Store.getState();
      
      expect(newState.stagingCard).toEqual(firstCard);
      expect(newState.deckPosition).toBe(1);
    });

    it('should not flip card when deck is empty', () => {
      // Set deck position to end of deck
      useStep1Store.setState({ deckPosition: useStep1Store.getState().deck.length });
      
      const state = useStep1Store.getState();
      state.flipNextCard();
      
      const newState = useStep1Store.getState();
      expect(newState.stagingCard).toBeNull();
    });
  });

  describe('moveCardToPile', () => {
    beforeEach(() => {
      useStep1Store.getState().initializeDeck();
      useStep1Store.getState().flipNextCard();
    });

    it('should move staging card to more important pile', () => {
      const stagingCard = useStep1Store.getState().stagingCard!;
      const state = useStep1Store.getState();
      
      state.moveCardToPile(stagingCard.id, 'more');
      
      const newState = useStep1Store.getState();
      expect(newState.stagingCard).toBeNull();
      expect(newState.moreImportantPile).toHaveLength(1);
      expect(newState.moreImportantPile[0].id).toBe(stagingCard.id);
      expect(newState.moreImportantPile[0].pile).toBe('more');
    });

    it('should move staging card to less important pile', () => {
      const stagingCard = useStep1Store.getState().stagingCard!;
      const state = useStep1Store.getState();
      
      state.moveCardToPile(stagingCard.id, 'less');
      
      const newState = useStep1Store.getState();
      expect(newState.stagingCard).toBeNull();
      expect(newState.lessImportantPile).toHaveLength(1);
      expect(newState.lessImportantPile[0].id).toBe(stagingCard.id);
      expect(newState.lessImportantPile[0].pile).toBe('less');
    });

    it('should not move card if not in staging area', () => {
      const originalState = useStep1Store.getState();
      originalState.moveCardToPile('invalid-card-id', 'more');
      
      const newState = useStep1Store.getState();
      expect(newState.stagingCard).toEqual(originalState.stagingCard);
      expect(newState.moreImportantPile).toHaveLength(0);
    });

    it('should auto-flip next card after move with delay', async () => {
      jest.useFakeTimers();
      const stagingCard = useStep1Store.getState().stagingCard!;
      const state = useStep1Store.getState();
      
      state.moveCardToPile(stagingCard.id, 'more');
      
      // Before timeout
      expect(useStep1Store.getState().stagingCard).toBeNull();
      
      // After timeout
      jest.advanceTimersByTime(300);
      
      const finalState = useStep1Store.getState();
      expect(finalState.stagingCard).toBeTruthy();
      expect(finalState.deckPosition).toBe(2);
      
      jest.useRealTimers();
    });
  });

  describe('moveCardBetweenPiles', () => {
    beforeEach(() => {
      useStep1Store.getState().initializeDeck();
      useStep1Store.getState().flipNextCard();
      const stagingCard = useStep1Store.getState().stagingCard!;
      useStep1Store.getState().moveCardToPile(stagingCard.id, 'more');
    });

    it('should move card from more to less pile', () => {
      const moreCard = useStep1Store.getState().moreImportantPile[0];
      const state = useStep1Store.getState();
      
      state.moveCardBetweenPiles(moreCard.id, 'more', 'less');
      
      const newState = useStep1Store.getState();
      expect(newState.moreImportantPile).toHaveLength(0);
      expect(newState.lessImportantPile).toHaveLength(1);
      expect(newState.lessImportantPile[0].id).toBe(moreCard.id);
      expect(newState.lessImportantPile[0].pile).toBe('less');
    });

    it('should move card from less to more pile', () => {
      const moreCard = useStep1Store.getState().moreImportantPile[0];
      // First move to less pile
      useStep1Store.getState().moveCardBetweenPiles(moreCard.id, 'more', 'less');
      
      const lessCard = useStep1Store.getState().lessImportantPile[0];
      const state = useStep1Store.getState();
      
      state.moveCardBetweenPiles(lessCard.id, 'less', 'more');
      
      const newState = useStep1Store.getState();
      expect(newState.lessImportantPile).toHaveLength(0);
      expect(newState.moreImportantPile).toHaveLength(1);
      expect(newState.moreImportantPile[0].id).toBe(lessCard.id);
      expect(newState.moreImportantPile[0].pile).toBe('more');
    });

    it('should not move card when source and target piles are the same', () => {
      const moreCard = useStep1Store.getState().moreImportantPile[0];
      const originalState = useStep1Store.getState();
      
      originalState.moveCardBetweenPiles(moreCard.id, 'more', 'more');
      
      const newState = useStep1Store.getState();
      expect(newState.moreImportantPile).toEqual(originalState.moreImportantPile);
    });

    it('should not move card that does not exist in source pile', () => {
      const originalState = useStep1Store.getState();
      
      originalState.moveCardBetweenPiles('invalid-card-id', 'more', 'less');
      
      const newState = useStep1Store.getState();
      expect(newState.moreImportantPile).toEqual(originalState.moreImportantPile);
      expect(newState.lessImportantPile).toEqual(originalState.lessImportantPile);
    });
  });

  describe('setDragging', () => {
    it('should set dragging state to true with card ID', () => {
      const state = useStep1Store.getState();
      state.setDragging(true, 'card-123');
      
      const newState = useStep1Store.getState();
      expect(newState.isDragging).toBe(true);
      expect(newState.draggedCardId).toBe('card-123');
    });

    it('should set dragging state to false and clear card ID', () => {
      // First set to dragging
      useStep1Store.getState().setDragging(true, 'card-123');
      
      const state = useStep1Store.getState();
      state.setDragging(false);
      
      const newState = useStep1Store.getState();
      expect(newState.isDragging).toBe(false);
      expect(newState.draggedCardId).toBeNull();
    });

    it('should handle dragging true without card ID', () => {
      const state = useStep1Store.getState();
      state.setDragging(true);
      
      const newState = useStep1Store.getState();
      expect(newState.isDragging).toBe(true);
      expect(newState.draggedCardId).toBeNull();
    });
  });

  describe('resetStep1', () => {
    it('should reset to initial state', () => {
      // Modify state
      const state = useStep1Store.getState();
      state.initializeDeck();
      state.flipNextCard();
      state.setDragging(true, 'card-123');
      
      // Reset
      state.resetStep1();
      
      const newState = useStep1Store.getState();
      expect(newState.deck).toHaveLength(DEVELOPMENT_DECK.length);
      expect(newState.deckPosition).toBe(0);
      expect(newState.stagingCard).toBeNull();
      expect(newState.moreImportantPile).toEqual([]);
      expect(newState.lessImportantPile).toEqual([]);
      expect(newState.isDragging).toBe(false);
      expect(newState.draggedCardId).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully in moveCardToPile', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Try to move non-existent card
      useStep1Store.getState().moveCardToPile('invalid-id', 'more');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Cannot move card invalid-id: not in staging area or card not found'
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle invalid pile types in moveCardToPile', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      useStep1Store.getState().initializeDeck();
      useStep1Store.getState().flipNextCard();
      const stagingCard = useStep1Store.getState().stagingCard!;
      
      // @ts-expect-error Testing invalid pile type
      useStep1Store.getState().moveCardToPile(stagingCard.id, 'invalid');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid pile type: invalid. Must be \'more\' or \'less\''
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle invalid card IDs in moveCardBetweenPiles', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      useStep1Store.getState().moveCardBetweenPiles('', 'more', 'less');
      
      expect(consoleSpy).toHaveBeenCalledWith('Invalid card ID provided');
      
      consoleSpy.mockRestore();
    });
  });
});