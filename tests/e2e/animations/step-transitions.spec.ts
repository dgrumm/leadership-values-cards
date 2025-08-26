/**
 * E2E tests for step transition animations
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Step Transition Animations', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/canvas');
    await page.waitForLoadState('networkidle');
    
    // Setup initial state with cards in both piles for Step 1→2 transition
    await setupStep1CompleteState();
  });

  async function setupStep1CompleteState() {
    // Simulate Step 1 completion with cards in both piles
    await page.evaluate(() => {
      // Mock data to simulate cards in Less Important and More Important piles
      (window as any).__testState = {
        lessImportantCards: Array.from({length: 15}, (_, i) => `card-less-${i}`),
        moreImportantCards: Array.from({length: 17}, (_, i) => `card-more-${i}`),
        step: 1
      };
    });
    
    // Refresh to apply test state
    await page.reload();
    await page.waitForLoadState('networkidle');
  }

  test('should execute Step 1 to Step 2 transition sequence', async () => {
    // Verify Step 1 is active
    const stepIndicator = page.locator('[data-testid="current-step"]');
    await expect(stepIndicator).toContainText('1');
    
    // Verify both piles have cards
    const lessImportantPile = page.locator('[data-testid="less-important-pile"]');
    const moreImportantPile = page.locator('[data-testid="more-important-pile"]');
    
    await expect(lessImportantPile.locator('[data-testid="card"]')).toHaveCount(15);
    await expect(moreImportantPile.locator('[data-testid="card"]')).toHaveCount(17);
    
    // Click "Continue to Step 2" button
    const continueButton = page.locator('[data-testid="continue-step-2"]');
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    
    // Verify transition overlay appears
    const transitionOverlay = page.locator('[data-testid="transition-overlay"]');
    await expect(transitionOverlay).toBeVisible();
    
    // Check transition steps occur in sequence
    await expect(transitionOverlay).toContainText('Organizing cards...');
    
    // Wait for less important pile to move to discard
    await page.waitForTimeout(400);
    const discardPile = page.locator('[data-testid="discard-pile"]');
    await expect(discardPile.locator('[data-testid="card"]')).toHaveCount(15);
    
    // Wait for more important cards to become new deck
    await page.waitForTimeout(600);
    const newDeck = page.locator('[data-testid="deck"]');
    await expect(newDeck.locator('[data-testid="deck-card"]')).toHaveCount(17);
    
    // Verify Step 2 is now active
    await page.waitForTimeout(800);
    await expect(stepIndicator).toContainText('2');
    
    // Transition overlay should disappear
    await expect(transitionOverlay).not.toBeVisible();
  });

  test('should execute Step 2 to Review transition', async () => {
    // First complete Step 1→2 transition
    await completeStep1To2();
    
    // Setup Step 2 completion (8 cards in Top 8)
    await setupStep2CompleteState();
    
    // Click "Review Top 8" button
    const reviewButton = page.locator('[data-testid="review-top-8"]');
    await expect(reviewButton).toBeEnabled();
    await reviewButton.click();
    
    // Verify transition begins
    const transitionOverlay = page.locator('[data-testid="transition-overlay"]');
    await expect(transitionOverlay).toBeVisible();
    await expect(transitionOverlay).toContainText('Entering Review Mode...');
    
    // Wait for frame expansion animation
    await page.waitForTimeout(700);
    
    // Verify frame has expanded
    const reviewFrame = page.locator('[data-testid="review-frame"]');
    const frameBox = await reviewFrame.boundingBox();
    
    // Frame should be larger than initial size (roughly 80% width)
    const viewportSize = page.viewportSize();
    expect(frameBox!.width).toBeGreaterThan(viewportSize!.width * 0.7);
    
    // Verify review mode is active
    const reviewIndicator = page.locator('[data-testid="review-mode"]');
    await expect(reviewIndicator).toBeVisible();
  });

  test('should execute Review to Step 3 transition', async () => {
    // Setup review state
    await completeStep1To2();
    await completeStep2ToReview();
    
    // Click "Continue to Step 3" button
    const continueStep3Button = page.locator('[data-testid="continue-step-3"]');
    await expect(continueStep3Button).toBeEnabled();
    await continueStep3Button.click();
    
    // Verify transition begins
    const transitionOverlay = page.locator('[data-testid="transition-overlay"]');
    await expect(transitionOverlay).toBeVisible();
    await expect(transitionOverlay).toContainText('Preparing Step 3...');
    
    // Wait for frame to contract and cards to redistribute
    await page.waitForTimeout(600);
    
    // Verify Step 3 is active
    const stepIndicator = page.locator('[data-testid="current-step"]');
    await expect(stepIndicator).toContainText('3');
    
    // Verify final selection areas are visible
    const finalPile = page.locator('[data-testid="final-3-pile"]');
    await expect(finalPile).toBeVisible();
    
    const remainingPile = page.locator('[data-testid="remaining-5-pile"]');
    await expect(remainingPile).toBeVisible();
  });

  test('should maintain smooth frame rate during complex transitions', async () => {
    // Start performance monitoring
    await page.evaluate(() => {
      (window as any).transitionFrameRates = [];
      let lastTime = performance.now();
      
      function monitorTransitionFrameRate() {
        const now = performance.now();
        const frameTime = now - lastTime;
        const fps = 1000 / frameTime;
        (window as any).transitionFrameRates.push(fps);
        lastTime = now;
        
        if ((window as any).transitionFrameRates.length < 90) { // 1.5 seconds at 60fps
          requestAnimationFrame(monitorTransitionFrameRate);
        }
      }
      
      requestAnimationFrame(monitorTransitionFrameRate);
    });
    
    // Execute Step 1→2 transition
    const continueButton = page.locator('[data-testid="continue-step-2"]');
    await continueButton.click();
    
    // Wait for transition to complete and monitoring to finish
    await page.waitForTimeout(2000);
    
    // Analyze frame rate performance
    const frameRates = await page.evaluate(() => (window as any).transitionFrameRates);
    const avgFrameRate = frameRates.reduce((sum: number, fps: number) => sum + fps, 0) / frameRates.length;
    const poorFrameCount = frameRates.filter((fps: number) => fps < 45).length;
    
    // Should maintain good frame rate (allow some drops during heavy animation)
    expect(avgFrameRate).toBeGreaterThan(50);
    expect(poorFrameCount / frameRates.length).toBeLessThan(0.2); // Less than 20% poor frames
  });

  test('should handle transition cancellation gracefully', async () => {
    // Start Step 1→2 transition
    const continueButton = page.locator('[data-testid="continue-step-2"]');
    await continueButton.click();
    
    // Verify transition started
    const transitionOverlay = page.locator('[data-testid="transition-overlay"]');
    await expect(transitionOverlay).toBeVisible();
    
    // Try to cancel by navigating away
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Go back and verify application state
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    // Application should still be functional
    const stepIndicator = page.locator('[data-testid="current-step"]');
    await expect(stepIndicator).toBeVisible();
    
    // Should be able to retry transition
    const retryButton = page.locator('[data-testid="continue-step-2"]');
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await page.waitForTimeout(1500);
      await expect(stepIndicator).toContainText('2');
    }
  });

  test('should respect reduced motion during transitions', async () => {
    // Enable reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Execute Step 1→2 transition
    const continueButton = page.locator('[data-testid="continue-step-2"]');
    await continueButton.click();
    
    // With reduced motion, transition should be much faster
    await page.waitForTimeout(200); // Minimal wait
    
    // Step should already be complete
    const stepIndicator = page.locator('[data-testid="current-step"]');
    await expect(stepIndicator).toContainText('2');
    
    // Cards should be in final positions
    const discardPile = page.locator('[data-testid="discard-pile"]');
    await expect(discardPile.locator('[data-testid="card"]')).toHaveCount(15);
  });

  test('should show appropriate loading states during transitions', async () => {
    const continueButton = page.locator('[data-testid="continue-step-2"]');
    await continueButton.click();
    
    // Loading states should appear in sequence
    const transitionOverlay = page.locator('[data-testid="transition-overlay"]');
    
    await expect(transitionOverlay).toContainText('Organizing cards...');
    
    await page.waitForTimeout(400);
    await expect(transitionOverlay).toContainText('Preparing new deck...');
    
    await page.waitForTimeout(600);
    await expect(transitionOverlay).toContainText('Setting up Step 2...');
    
    // Final state - overlay disappears
    await page.waitForTimeout(400);
    await expect(transitionOverlay).not.toBeVisible();
  });

  test('should disable controls during active transition', async () => {
    const continueButton = page.locator('[data-testid="continue-step-2"]');
    
    // Button should be enabled initially
    await expect(continueButton).toBeEnabled();
    
    // Click to start transition
    await continueButton.click();
    
    // Button should become disabled during transition
    await expect(continueButton).toBeDisabled();
    
    // Other interactive elements should also be disabled
    const deckCards = page.locator('[data-testid="deck-card"]');
    const firstCard = deckCards.first();
    
    if (await firstCard.isVisible()) {
      // Card clicks should not work during transition
      await firstCard.click();
      
      // Card should not move or change state
      const stagingCards = page.locator('[data-testid="staging-area"] [data-testid="card"]');
      await expect(stagingCards).toHaveCount(0);
    }
  });

  // Helper functions
  async function completeStep1To2() {
    const continueButton = page.locator('[data-testid="continue-step-2"]');
    await continueButton.click();
    await page.waitForTimeout(1500);
  }

  async function setupStep2CompleteState() {
    await page.evaluate(() => {
      (window as any).__testState = {
        ...((window as any).__testState || {}),
        top8Cards: Array.from({length: 8}, (_, i) => `card-top8-${i}`),
        step: 2
      };
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  }

  async function completeStep2ToReview() {
    await setupStep2CompleteState();
    const reviewButton = page.locator('[data-testid="review-top-8"]');
    await reviewButton.click();
    await page.waitForTimeout(1000);
  }
});

test.describe('Step Transition Error Handling', () => {
  test('should recover from animation errors', async ({ page }) => {
    await page.goto('/canvas');
    
    // Inject error into animation system
    await page.evaluate(() => {
      // Mock animation failure
      const originalExecuteAnimation = (window as any).animationController?.executeAnimation;
      if (originalExecuteAnimation) {
        (window as any).animationController.executeAnimation = async function(id: string, animationFn: Function, fallbackFn?: Function) {
          if (id.includes('step-1-to-2')) {
            // Simulate failure and trigger fallback
            if (fallbackFn) fallbackFn();
            throw new Error('Simulated animation failure');
          }
          return originalExecuteAnimation.call(this, id, animationFn, fallbackFn);
        };
      }
    });
    
    // Setup and attempt transition
    await setupStep1CompleteState();
    
    const continueButton = page.locator('[data-testid="continue-step-2"]');
    await continueButton.click();
    
    // Even with error, fallback should ensure transition completes
    await page.waitForTimeout(1000);
    
    const stepIndicator = page.locator('[data-testid="current-step"]');
    await expect(stepIndicator).toContainText('2');
  });

  async function setupStep1CompleteState() {
    await page.evaluate(() => {
      (window as any).__testState = {
        lessImportantCards: Array.from({length: 15}, (_, i) => `card-less-${i}`),
        moreImportantCards: Array.from({length: 17}, (_, i) => `card-more-${i}`),
        step: 1
      };
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  }
});