/**
 * Playwright test helpers for fast state injection
 * Eliminates slow manual progression through app steps
 */

import { Page } from '@playwright/test';
import { 
  STEP1_COMPLETE_STATE, 
  STEP2_START_STATE, 
  STEP2_COMPLETE_STATE, 
  STEP3_START_STATE,
  TEST_CARD_SUBSETS 
} from '../fixtures/state-fixtures';
import {
  injectStep1CompleteState,
  injectStep2StartState,
  injectStep3StartState,
  resetAllStores,
  exposeStoresToWindow
} from '../fixtures/browser-injection';

/**
 * Initialize session and navigate to canvas
 * Shared setup for all state injection helpers
 */
async function initializeSession(page: Page, sessionCode: string = 'TESTXX') {
  // Navigate to home and create session
  await page.goto('/');
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('input[name="sessionCode"]', sessionCode);
  await page.click('button[type="submit"]');
  
  await page.waitForLoadState('networkidle');
  await page.waitForURL(/\/canvas/, { timeout: 10000 });
  
  // Close any initial modals
  const modalCloseButton = page.locator('button:has-text("Got it!"), button:has-text("Start")');
  if (await modalCloseButton.isVisible({ timeout: 2000 })) {
    await modalCloseButton.click();
    await modalCloseButton.waitFor({ state: 'hidden', timeout: 3000 });
  }
}

/**
 * Setup Step 2 test with N-1 state injection (cleaner approach)
 * Injects 15 cards sorted, then completes final card via natural gameplay
 * This ensures proper React re-renders through normal game flow (8s → 1s)
 */
export async function setupStep2FastStart(page: Page, options: {
  sessionCode?: string;
  skipNavigation?: boolean;
  useFullInjection?: boolean; // Option to use full injection with hook
} = {}) {
  const sessionCode = options.sessionCode || 'FAST02';
  
  if (!options.skipNavigation) {
    await initializeSession(page, sessionCode);
  }
  
  // Wait for the app's test utilities to be loaded
  await page.waitForFunction(() => 
    typeof (window as any).StateInjectionUtils !== 'undefined', 
    { timeout: 10000 }
  );
  
  if (options.useFullInjection) {
    // Use full state injection + hook approach
    await page.evaluate(() => {
      const utils = (window as any).StateInjectionUtils;
      return utils.injectStep1Completion();
    });
    
    // Wait for custom hook to trigger re-render
    await page.waitForTimeout(300);
    
  } else {
    // Use N-1 approach (cleaner and more reliable) - DEFAULT
    console.log('🎯 Using N-1 state injection approach');
    
    await page.evaluate(() => {
      const utils = (window as any).StateInjectionUtils;
      return utils.injectStep1Near90Completion();
    });
    
    // Complete the last card naturally via Playwright
    // This triggers proper React re-renders through normal game flow
    
    // Step 1: Flip the final card
    await page.locator('[data-testid="deck"]').click();
    await page.waitForSelector('[data-testid="staging-area"] .card', { timeout: 3000 });
    
    // Step 2: Move it to more important pile (creating final 8/8 split)
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    const targetPile = page.locator('[data-testid="more-important-pile"]');
    await stagingCard.dragTo(targetPile);
    await page.waitForTimeout(200); // Wait for drag completion
    
    // Verify final state is correct (8 more, 8 less)
    const moreCount = await page.locator('[data-testid="more-important-pile"] .card').count();
    const lessCount = await page.locator('[data-testid="less-important-pile"] .card').count();
    
    console.log(`✅ N-1 completion: ${moreCount} more, ${lessCount} less important cards`);
    
    // Ensure no cards remain in staging
    await page.waitForSelector('[data-testid="staging-area"]:not(:has(.card))', { timeout: 2000 });
  }
  
  // Debug: Check button state using data-testid
  const buttonExists = await page.locator('[data-testid="continue-to-step2-button"]').count();
  const canProceedState = await page.evaluate(() => {
    const step1Store = (window as any)?.useStep1Store?.getState?.();
    if (step1Store) {
      const remainingCards = step1Store.deck.length - step1Store.deckPosition;
      const stagingCard = step1Store.stagingCard;
      const canProceed = remainingCards === 0 && !stagingCard;
      return {
        deckLength: step1Store.deck.length,
        deckPosition: step1Store.deckPosition,
        remainingCards,
        stagingCard: stagingCard ? 'exists' : 'null',
        canProceed,
        moreCount: step1Store.moreImportantPile.length,
        lessCount: step1Store.lessImportantPile.length
      };
    }
    return null;
  });
  
  console.log('🔍 Debug state:', { buttonExists, canProceedState });
  
  // Navigate to Step 2 (button should now be enabled) - use data-testid
  const continueButton = page.locator('[data-testid="continue-to-step2-button"]');
  await continueButton.waitFor({ state: 'visible', timeout: 5000 });
  await continueButton.click();
  
  // Wait for URL to change to step=2
  await page.waitForURL(/step=2/, { timeout: 5000 });
  await page.waitForLoadState('networkidle');
  
  // Wait for Step 2's natural transition to complete instead of forcing initialization
  // The Step2Page component calls startTransition() which has a 500ms delay
  console.log('⏳ Waiting for Step 2 transition to complete...');
  await page.waitForTimeout(800); // Wait for transition + buffer
  
  // Wait longer for Step 2 transition and modal to appear
  console.log('⏳ Waiting for Step 2 modal to appear...');
  const step2Modal = page.locator('[data-testid="step2-modal-got-it-button"]');
  
  try {
    // Wait for the modal to appear (it may take up to 2 seconds due to transition + 200ms delay)
    await step2Modal.waitFor({ state: 'visible', timeout: 3000 });
    console.log('🎯 Step 2 modal appeared - dismissing it');
    await step2Modal.click();
    await step2Modal.waitFor({ state: 'hidden', timeout: 3000 });
    console.log('✅ Step 2 modal dismissed');
  } catch (error) {
    console.log('⚠️ Step 2 modal did not appear within timeout, continuing...');
  }
  
  // Wait a bit more for any ongoing transitions to settle
  await page.waitForTimeout(500);
  
  // Verify Step 2 loaded - check for Step 2 specific elements (deck should be visible after modal closes)
  await page.waitForSelector('[data-testid="deck"]', { timeout: 5000 });
  
  console.log('Step 2 fast start setup complete');
  return true;
}

/**
 * Setup Step 3 test with pre-completed Step 1 & 2 state
 * Uses the app's built-in state injection system (12s → 0.5s)
 */
export async function setupStep3FastStart(page: Page, options: {
  sessionCode?: string;
  skipNavigation?: boolean;
} = {}) {
  const sessionCode = options.sessionCode || 'FAST03';
  
  if (!options.skipNavigation) {
    await initializeSession(page, sessionCode);
  }
  
  // Wait for the app's test utilities to be loaded
  await page.waitForFunction(() => 
    typeof (window as any).StateInjectionUtils !== 'undefined', 
    { timeout: 10000 }
  );
  
  // Use the app's built-in state injection system
  const result = await page.evaluate(() => {
    try {
      console.log('Using built-in StateInjectionUtils for Step 3 setup');
      const utils = (window as any).StateInjectionUtils;
      return utils.initializeStep3WithState();
    } catch (error) {
      console.error('State injection failed:', error);
      return null;
    }
  });
  
  if (!result) {
    console.warn('Built-in state injection failed, falling back to manual setup');
    return await setupStep3Manual(page);
  }
  
  // Navigate through steps (state should enable the buttons) - use data-testid
  const continueToStep2Button = page.locator('[data-testid="continue-to-step2-button"]');
  await continueToStep2Button.waitFor({ state: 'visible', timeout: 5000 });
  await continueToStep2Button.click();
  
  // Close Step 2 modal if present
  const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
  if (await step2Modal.isVisible({ timeout: 3000 })) {
    await step2Modal.click();
  }
  
  // Continue to Step 3 - use data-testid
  const continueToStep3Button = page.locator('[data-testid="continue-to-step3-button"]');
  await continueToStep3Button.waitFor({ state: 'visible', timeout: 5000 });
  await continueToStep3Button.click();
  
  // Close Step 3 modal if present
  const step3Modal = page.locator('button:has-text("Start Final Selection"), button:has-text("Got it")');
  if (await step3Modal.isVisible({ timeout: 3000 })) {
    await step3Modal.click();
  }
  
  // Verify Step 3 loaded
  await page.waitForSelector('[data-testid="deck"], .deck-container', { timeout: 5000 });
  
  console.log('Step 3 fast start setup complete using built-in state injection');
  return true;
}

/**
 * Reset all stores between tests
 * Uses the app's built-in reset functionality
 */
export async function resetAllTestStores(page: Page) {
  try {
    await page.evaluate(() => {
      const utils = (window as any).StateInjectionUtils;
      if (utils) {
        utils.resetAllStores();
        console.log('All stores reset using built-in utilities');
      }
    });
  } catch (error) {
    console.warn('Store reset failed, fresh page navigation will provide clean state');
  }
}

/**
 * Fallback: Manual Step 2 setup (faster than current tests but still slow)
 * Used when state injection fails
 */
async function setupStep2Manual(page: Page) {
  console.log('Running optimized manual Step 2 setup');
  
  // Verify we're on Step 1
  await page.waitForSelector('[data-testid="deck"]', { timeout: 5000 });
  
  // Quick Step 1 completion - need to sort ALL 16 cards to enable Step 2 button
  // Distribute 8/8 split to enable "Continue to Step 2" button
  for (let i = 0; i < 16; i++) {
    await page.locator('[data-testid="deck"]').click();
    await page.waitForSelector('[data-testid="staging-area"] .card', { timeout: 3000 });
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    // Distribute roughly 8/8 split like original test
    const targetPile = i < 8 ? 
      page.locator('[data-testid="more-important-pile"]') :
      page.locator('[data-testid="less-important-pile"]');
    
    await stagingCard.dragTo(targetPile);
    await page.waitForTimeout(50); // Minimal wait
  }
  
  // Verify all cards are sorted before continuing
  await page.waitForSelector('[data-testid="staging-area"]:not(:has(.card))', { timeout: 3000 });
  
  // Navigate to Step 2
  const continueButton = page.locator('[data-testid="continue-to-step2-button"]');
  await continueButton.waitFor({ state: 'visible', timeout: 5000 });
  await continueButton.click();
  
  // Close Step 2 modal if present
  const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
  if (await step2Modal.isVisible({ timeout: 3000 })) {
    await step2Modal.click();
  }
  
  // Verify Step 2 loaded
  await page.waitForSelector('[data-testid="deck"], .deck-container', { timeout: 5000 });
  
  return true;
}

/**
 * Fallback: Manual Step 3 setup (faster than current tests but still slow)
 * Used when state injection fails
 */
async function setupStep3Manual(page: Page) {
  console.log('Running optimized manual Step 3 setup');
  
  // Run manual Step 2 setup first
  await setupStep2Manual(page);
  
  // Quick Step 2 completion - add 8 cards to Top 8 pile
  for (let i = 0; i < 8; i++) {
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForSelector('[data-testid="staging-area"] .card', { timeout: 3000 });
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    const top8Pile = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    await stagingCard.dragTo(top8Pile);
    await page.waitForTimeout(50); // Minimal wait
  }
  
  // Navigate to Step 3
  const continueButton = page.locator('[data-testid="continue-to-step3-button"]');
  await continueButton.waitFor({ state: 'visible', timeout: 5000 });
  await continueButton.click();
  
  // Close Step 3 modal if present
  const step3Modal = page.locator('button:has-text("Start Final Selection"), button:has-text("Got it")');
  if (await step3Modal.isVisible({ timeout: 3000 })) {
    await step3Modal.click();
  }
  
  // Verify Step 3 loaded
  await page.waitForSelector('[data-testid="deck"], .deck-container', { timeout: 5000 });
  
  return true;
}

/**
 * Utility to verify state injection worked
 * Checks that expected elements are present
 */
export async function verifyStepState(page: Page, step: 1 | 2 | 3) {
  const checks = {
    1: async () => {
      await page.waitForSelector('[data-testid="more-important-pile"] .card', { timeout: 2000 });
      await page.waitForSelector('[data-testid="less-important-pile"] .card', { timeout: 2000 });
      const moreCount = await page.locator('[data-testid="more-important-pile"] .card').count();
      const lessCount = await page.locator('[data-testid="less-important-pile"] .card').count();
      return moreCount === 8 && lessCount === 8;
    },
    2: async () => {
      await page.waitForSelector('[data-testid="deck"], .deck-container', { timeout: 2000 });
      const deckVisible = await page.locator('[data-testid="deck"], .deck-container').isVisible();
      return deckVisible;
    },
    3: async () => {
      await page.waitForSelector('[data-testid="deck"], .deck-container', { timeout: 2000 });
      const deckVisible = await page.locator('[data-testid="deck"], .deck-container').isVisible();
      await page.waitForSelector('[data-testid="top3-pile"]', { timeout: 2000 });
      const top3Visible = await page.locator('[data-testid="top3-pile"]').isVisible();
      return deckVisible && top3Visible;
    }
  };
  
  return await checks[step]();
}