/**
 * Browser-side injection functions for Playwright
 * These functions are executed in the browser context to populate Zustand stores
 */

import { Card } from '@/lib/types/card';

/**
 * Browser-side function to inject Step 1 complete state
 * This bypasses the slow manual card sorting process
 */
export function injectStep1CompleteState(moreImportantCards: Card[], lessImportantCards: Card[]) {
  return `
    (() => {
      // Access the Zustand store from window (assuming it's exposed or accessible)
      const store = window.__ZUSTAND_STORES__?.step1 || window.useStep1Store?.getState();
      
      if (store) {
        // Set the completed Step 1 state directly
        store.setState({
          deck: [...${JSON.stringify(moreImportantCards)}, ...${JSON.stringify(lessImportantCards)}],
          deckPosition: 16,
          stagingCard: null,
          moreImportantPile: ${JSON.stringify(moreImportantCards)},
          lessImportantPile: ${JSON.stringify(lessImportantCards)},
          isDragging: false,
          draggedCardId: null,
          showOverflowWarning: false,
        });
        
        console.log('Step 1 complete state injected');
        return true;
      }
      
      console.warn('Step 1 store not found for injection');
      return false;
    })();
  `;
}

/**
 * Browser-side function to inject Step 2 start state
 * Sets up Step 2 with cards from Step 1 without transition animations
 */
export function injectStep2StartState(moreImportantCards: Card[], lessImportantCards: Card[]) {
  return `
    (() => {
      // Access Step 2 store
      const step2Store = window.__ZUSTAND_STORES__?.step2 || window.useStep2Store?.getState();
      
      if (step2Store) {
        // Use the direct initialization method
        const deckCards = ${JSON.stringify(moreImportantCards)}.map(card => ({ ...card, pile: 'deck' }));
        const discardedCards = ${JSON.stringify(lessImportantCards)}.map(card => ({ ...card, pile: 'discard' }));
        
        step2Store.initializeFromStep1?.(deckCards, discardedCards) || step2Store.setState({
          deck: deckCards,
          deckPosition: 0,
          stagingCard: null,
          top8Pile: [],
          lessImportantPile: [],
          discardedPile: discardedCards,
          isDragging: false,
          draggedCardId: null,
          showOverflowWarning: false,
          isTransitioning: false,
          transitionPhase: null,
        });
        
        console.log('Step 2 start state injected');
        return true;
      }
      
      console.warn('Step 2 store not found for injection');
      return false;
    })();
  `;
}

/**
 * Browser-side function to inject Step 3 start state
 * Sets up Step 3 with cards from Step 2 without transition animations
 */
export function injectStep3StartState(top8Cards: Card[], step2DiscardedCards: Card[], step1DiscardedCards: Card[]) {
  return `
    (() => {
      // Access Step 3 store
      const step3Store = window.__ZUSTAND_STORES__?.step3 || window.useStep3Store?.getState();
      
      if (step3Store) {
        // Use the direct initialization method
        const deckCards = ${JSON.stringify(top8Cards)}.map(card => ({ ...card, pile: 'deck' }));
        const allDiscarded = [
          ...${JSON.stringify(step1DiscardedCards)}.map(card => ({ ...card, pile: 'discard' })),
          ...${JSON.stringify(step2DiscardedCards)}.map(card => ({ ...card, pile: 'discard' }))
        ];
        
        step3Store.initializeFromStep2?.(deckCards, ${JSON.stringify(step2DiscardedCards)}, ${JSON.stringify(step1DiscardedCards)}) || step3Store.setState({
          deck: deckCards,
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
        
        console.log('Step 3 start state injected');
        return true;
      }
      
      console.warn('Step 3 store not found for injection');
      return false;
    })();
  `;
}

/**
 * Browser-side function to reset all stores to initial state
 * Useful for cleaning up between tests
 */
export function resetAllStores() {
  return `
    (() => {
      let resetCount = 0;
      
      // Reset Step 1 store
      const step1Store = window.__ZUSTAND_STORES__?.step1 || window.useStep1Store?.getState();
      if (step1Store) {
        step1Store.resetStep1?.() || step1Store.setState({
          deck: [],
          deckPosition: 0,
          stagingCard: null,
          moreImportantPile: [],
          lessImportantPile: [],
          isDragging: false,
          draggedCardId: null,
          showOverflowWarning: false,
        });
        resetCount++;
      }
      
      // Reset Step 2 store
      const step2Store = window.__ZUSTAND_STORES__?.step2 || window.useStep2Store?.getState();
      if (step2Store) {
        step2Store.resetStep2?.() || step2Store.setState({
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
        });
        resetCount++;
      }
      
      // Reset Step 3 store
      const step3Store = window.__ZUSTAND_STORES__?.step3 || window.useStep3Store?.getState();
      if (step3Store) {
        step3Store.resetStep3?.() || step3Store.setState({
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
        });
        resetCount++;
      }
      
      console.log(\`Reset \${resetCount} stores\`);
      return resetCount;
    })();
  `;
}

/**
 * Browser-side function to expose Zustand stores to window for easier access
 * This should be called early in the application lifecycle
 */
export function exposeStoresToWindow() {
  return `
    (() => {
      // Try to access stores and expose them to window
      try {
        if (typeof window !== 'undefined') {
          window.__ZUSTAND_STORES__ = window.__ZUSTAND_STORES__ || {};
          
          // Try to import and expose stores
          import('/state/local/step1-store').then(module => {
            window.__ZUSTAND_STORES__.step1 = module.useStep1Store;
          }).catch(() => {});
          
          import('/state/local/step2-store').then(module => {
            window.__ZUSTAND_STORES__.step2 = module.useStep2Store;
          }).catch(() => {});
          
          import('/state/local/step3-store').then(module => {
            window.__ZUSTAND_STORES__.step3 = module.useStep3Store;
          }).catch(() => {});
          
          console.log('Zustand stores exposed to window.__ZUSTAND_STORES__');
        }
      } catch (error) {
        console.warn('Could not expose Zustand stores to window:', error);
      }
    })();
  `;
}

/**
 * Fallback browser-side injection using more direct DOM manipulation
 * This approach tries to trigger the stores through the React component tree
 */
export function directStoreAccess() {
  return `
    (() => {
      // Try to access React DevTools or React Fiber to get store instances
      const findReactProps = (element) => {
        for (let key in element) {
          if (key.startsWith('__reactInternalInstance') || key.startsWith('_reactInternalFiber')) {
            return element[key];
          }
        }
        return null;
      };
      
      // Look for components that might have store access
      const components = document.querySelectorAll('[data-testid*="step"], [class*="step"]');
      
      console.log('Found components for store access:', components.length);
      
      // This is a fallback - the main approach should be through proper store exposure
      return components.length > 0;
    })();
  `;
}