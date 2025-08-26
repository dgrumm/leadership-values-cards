/**
 * Test utilities for injecting game state directly into stores
 * Enables fast E2E test setup by bypassing card-flipping flows
 */

import { Card } from '@/lib/types/card';
import { DEV_DECK } from '@/lib/generated/card-decks';

/**
 * Create test cards from the development deck
 */
export function createTestCards(count: number, startIndex = 0): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    const deckIndex = (startIndex + i) % DEV_DECK.length;
    const definition = DEV_DECK[deckIndex];
    cards.push({
      id: `test-card-${startIndex + i}`,
      value_name: definition.value_name,
      description: definition.description,
      position: { x: 0, y: 0 },
      pile: 'deck'
    });
  }
  return cards;
}

/**
 * Client-side state injection utilities
 * These run in the browser context during E2E tests
 */
export const StateInjectionUtils = {
  /**
   * Inject Step 1 completion state (8 more important, 8 less important)
   * Uses 16 cards total to match DEV_DECK and enable Step 2 button
   */
  injectStep1Completion: () => {
    const cards = createTestCards(16); // Use 16 cards to match DEV_DECK
    
    const moreImportantCards = cards.slice(0, 8).map(card => ({
      ...card,
      pile: 'more' as const
    }));
    
    const lessImportantCards = cards.slice(8, 16).map(card => ({
      ...card,
      pile: 'less' as const
    }));

    // Create the full deck for proper state
    const fullDeck = [...moreImportantCards, ...lessImportantCards];

    // Access the store directly and use proper Zustand pattern
    const step1Store = (window as any)?.useStep1Store;
    if (step1Store && step1Store.setState) {
      // Use setState to properly update Zustand store
      // CRITICAL: For canProceed = remainingCards === 0 && !stagingCard
      // We need: deck.length - deckPosition === 0, so deckPosition === deck.length
      step1Store.setState({
        deck: fullDeck, // Full deck (16 cards)
        deckPosition: fullDeck.length, // ALL cards processed (16)
        stagingCard: null, // No card in staging (CRITICAL for canProceed)
        moreImportantPile: moreImportantCards,
        lessImportantPile: lessImportantCards,
        isDragging: false,
        draggedCardId: null,
        showOverflowWarning: false,
      });
      
      console.log('✅ Step 1 completion state injected:', {
        moreImportant: moreImportantCards.length,
        lessImportant: lessImportantCards.length,
        deckLength: fullDeck.length,
        deckPosition: fullDeck.length,
        remainingCards: fullDeck.length - fullDeck.length, // Should be 0
        stagingCard: null, // Should be null
        canProceed: true // Both conditions met
      });
      
      // Trigger test-only re-render hook
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('state-injection-complete'));
      }, 10);
    } else {
      console.error('❌ Step1Store not found or setState not available');
    }
    
    return { moreImportantCards, lessImportantCards, fullDeck };
  },

  /**
   * Inject N-1 Step 1 state (cleaner approach)
   * Injects 15 cards sorted, leaves 1 card for natural Playwright completion
   * This triggers proper React re-renders through normal game flow
   */
  injectStep1Near90Completion: () => {
    const cards = createTestCards(16);
    
    // Sort 15 cards with 7 more important, 8 less important
    // Leave 1 card to be sorted naturally to "more" pile to get final 8/8 split
    const moreImportantCards = cards.slice(0, 7).map(card => ({
      ...card,
      pile: 'more' as const
    }));
    
    const lessImportantCards = cards.slice(7, 15).map(card => ({
      ...card,
      pile: 'less' as const
    }));
    
    const remainingCard = cards[15]; // Last card stays in deck - will go to more pile
    const fullDeck = [...moreImportantCards, ...lessImportantCards, remainingCard];

    const step1Store = (window as any)?.useStep1Store;
    if (step1Store && step1Store.setState) {
      step1Store.setState({
        deck: fullDeck,
        deckPosition: 15, // 15 of 16 cards processed
        stagingCard: null, // No card in staging
        moreImportantPile: moreImportantCards, // 7 cards (will become 8 after natural completion)
        lessImportantPile: lessImportantCards, // 8 cards (stays 8)
        isDragging: false,
        draggedCardId: null,
        showOverflowWarning: false,
      });
      
      console.log('✅ Step 1 N-1 state injected:', {
        moreImportant: moreImportantCards.length, // 7, will become 8
        lessImportant: lessImportantCards.length, // 8, stays 8
        remainingCards: 1,
        deckPosition: 15,
        strategy: 'N-1 for natural completion'
      });
    }
    
    return { 
      moreImportantCards, 
      lessImportantCards, 
      remainingCard,
      finalMoreCount: 8, // After natural completion
      finalLessCount: 8  // After natural completion
    };
  },

  /**
   * Inject Step 2 completion state (8 top cards, remaining less important)
   */
  injectStep2Completion: () => {
    const cards = createTestCards(8);
    
    const top8Cards = cards.map(card => ({
      ...card,
      pile: 'top8' as const
    }));

    // Access the store directly
    const step2Store = (window as any)?.useStep2Store?.getState?.();
    if (step2Store) {
      step2Store.top8Pile = top8Cards;
      step2Store.lessImportantPile = [];
      step2Store.deck = [];
      step2Store.deckPosition = 8;
      step2Store.stagingCard = null;
      
      // Notify React about the state change
      (window as any)?.useStep2Store?.setState?.({
        top8Pile: top8Cards,
        lessImportantPile: [],
        deck: [],
        deckPosition: 8,
        stagingCard: null
      });
    }
    
    return { top8Cards };
  },

  /**
   * Inject Step 3 completion state (3 top cards, remaining less important)  
   */
  injectStep3Completion: () => {
    const cards = createTestCards(3);
    
    const top3Cards = cards.map(card => ({
      ...card,
      pile: 'top3' as const
    }));

    // Access the store directly
    const step3Store = (window as any)?.useStep3Store?.getState?.();
    if (step3Store) {
      step3Store.top3Pile = top3Cards;
      step3Store.lessImportantPile = [];
      step3Store.deck = [];
      step3Store.deckPosition = 3;
      step3Store.stagingCard = null;
      
      // Notify React about the state change
      (window as any)?.useStep3Store?.setState?.({
        top3Pile: top3Cards,
        lessImportantPile: [],
        deck: [],
        deckPosition: 3,
        stagingCard: null
      });
    }
    
    return { top3Cards };
  },

  /**
   * Initialize Step 2 with pre-filled state
   */
  initializeStep2WithState: () => {
    const step1Data = StateInjectionUtils.injectStep1Completion();
    
    const step2Store = (window as any)?.useStep2Store?.getState?.();
    if (step2Store && step2Store.initializeFromStep1) {
      step2Store.initializeFromStep1(
        step1Data.moreImportantCards,
        step1Data.lessImportantCards
      );
    }
    
    return step1Data;
  },

  /**
   * Initialize Step 3 with pre-filled state
   */
  initializeStep3WithState: () => {
    const step1Data = StateInjectionUtils.injectStep1Completion();
    const step2Data = StateInjectionUtils.injectStep2Completion();
    
    const step3Store = (window as any)?.useStep3Store?.getState?.();
    if (step3Store && step3Store.initializeFromStep2) {
      step3Store.initializeFromStep2(
        step2Data.top8Cards,
        [], // step2 discarded
        step1Data.lessImportantCards // step1 discarded
      );
    }
    
    return { step1Data, step2Data };
  },

  /**
   * Inject partial state for constraint testing
   */
  injectConstraintTestState: (step: 'step1' | 'step2' | 'step3', pileConfig: {
    targetPile: string;
    cardCount: number;
    nearLimit?: boolean;
  }) => {
    const { targetPile, cardCount, nearLimit } = pileConfig;
    const cards = createTestCards(cardCount);

    if (step === 'step2' && targetPile === 'top8') {
      const top8Cards = cards.map(card => ({ ...card, pile: 'top8' as const }));
      
      const step2Store = (window as any)?.useStep2Store?.getState?.();
      if (step2Store) {
        (window as any)?.useStep2Store?.setState?.({
          top8Pile: top8Cards,
          deck: nearLimit ? createTestCards(1, cardCount) : [],
          deckPosition: 0,
          stagingCard: null
        });
      }
    }

    if (step === 'step3' && targetPile === 'top3') {
      const top3Cards = cards.map(card => ({ ...card, pile: 'top3' as const }));
      
      const step3Store = (window as any)?.useStep3Store?.getState?.();
      if (step3Store) {
        (window as any)?.useStep3Store?.setState?.({
          top3Pile: top3Cards,
          deck: nearLimit ? createTestCards(1, cardCount) : [],
          deckPosition: 0,
          stagingCard: null
        });
      }
    }
  },

  /**
   * Reset all stores to initial state
   */
  resetAllStores: () => {
    const step1Store = (window as any)?.useStep1Store?.getState?.();
    if (step1Store && step1Store.resetStep1) {
      step1Store.resetStep1();
    }

    const step2Store = (window as any)?.useStep2Store?.getState?.();
    if (step2Store && step2Store.resetStep2) {
      step2Store.resetStep2();
    }

    const step3Store = (window as any)?.useStep3Store?.getState?.();
    if (step3Store && step3Store.resetStep3) {
      step3Store.resetStep3();
    }
  }
};

/**
 * Playwright helper functions for E2E tests
 */
export const PlaywrightStateHelpers = {
  /**
   * Navigate directly to Step 2 with completed Step 1 state
   */
  navigateToStep2: async (page: any) => {
    // Go to canvas
    await page.goto('/canvas?session=TEST&name=Test+User');
    await page.waitForLoadState('networkidle');
    
    // Close initial modal if present
    const modalCloseButton = page.locator('button:has-text("Got it!"), button:has-text("Start Sorting")');
    if (await modalCloseButton.isVisible()) {
      await modalCloseButton.click();
      await page.waitForTimeout(300);
    }

    // Inject Step 1 completion state
    await page.evaluate(() => {
      (window as any).StateInjectionUtils.injectStep1Completion();
    });
    
    // Navigate to Step 2
    await page.locator('button:has-text("Continue to Step 2")').click();
    await page.waitForTimeout(500);
    
    // Close Step 2 modal if present
    const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
    if (await step2Modal.isVisible()) {
      await step2Modal.click();
    }
    
    await page.waitForTimeout(300);
  },

  /**
   * Navigate directly to Step 3 with completed Step 1 & 2 state
   */
  navigateToStep3: async (page: any) => {
    // Go to canvas
    await page.goto('/canvas?session=TEST&name=Test+User');
    await page.waitForLoadState('networkidle');
    
    // Close initial modal if present
    const modalCloseButton = page.locator('button:has-text("Got it!"), button:has-text("Start Sorting")');
    if (await modalCloseButton.isVisible()) {
      await modalCloseButton.click();
      await page.waitForTimeout(300);
    }

    // Inject Step 1 & 2 completion state
    await page.evaluate(() => {
      (window as any).StateInjectionUtils.injectStep1Completion();
      (window as any).StateInjectionUtils.injectStep2Completion();
    });
    
    // Navigate through steps
    await page.locator('button:has-text("Continue to Step 2")').click();
    await page.waitForTimeout(300);
    
    const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
    if (await step2Modal.isVisible()) {
      await step2Modal.click();
    }
    
    await page.locator('button:has-text("Continue to Step 3")').click();
    await page.waitForTimeout(300);
    
    const step3Modal = page.locator('button:has-text("Final Selection"), button:has-text("Got it")');
    if (await step3Modal.isVisible()) {
      await step3Modal.click();
    }
    
    await page.waitForTimeout(300);
  },

  /**
   * Setup constraint testing state
   */
  setupConstraintTest: async (page: any, config: {
    step: 'step2' | 'step3';
    pileCount: number;
    nearLimit?: boolean;
  }) => {
    const { step, pileCount, nearLimit } = config;
    
    if (step === 'step2') {
      await PlaywrightStateHelpers.navigateToStep2(page);
      
      // Inject specific pile state for testing
      await page.evaluate((config) => {
        (window as any).StateInjectionUtils.injectConstraintTestState('step2', {
          targetPile: 'top8',
          cardCount: config.pileCount,
          nearLimit: config.nearLimit
        });
      }, { pileCount, nearLimit });
      
    } else if (step === 'step3') {
      await PlaywrightStateHelpers.navigateToStep3(page);
      
      // Inject specific pile state for testing
      await page.evaluate((config) => {
        (window as any).StateInjectionUtils.injectConstraintTestState('step3', {
          targetPile: 'top3', 
          cardCount: config.pileCount,
          nearLimit: config.nearLimit
        });
      }, { pileCount, nearLimit });
    }
  }
};