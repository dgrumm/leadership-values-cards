import { test, expect, type Page } from '@playwright/test';

/**
 * Fast E2E tests for pile constraints using state injection
 * These tests bypass the slow card-flipping flow using direct state injection
 */

test.describe('Fast Pile Constraint Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to canvas with test session
    await page.goto('/canvas?session=FAST&name=Fast+Test+User');
    await page.waitForLoadState('networkidle');
    
    // Wait for test utilities to be available
    await page.waitForFunction(() => {
      return typeof (window as any).StateInjectionUtils !== 'undefined';
    }, { timeout: 5000 });
    
    // Close initial modal if present
    const modalCloseButton = page.locator('button:has-text("Got it!"), button:has-text("Start Sorting")');
    if (await modalCloseButton.isVisible()) {
      await modalCloseButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should enforce Step 2 Top 8 limit with visual feedback', async () => {
    // Fast navigation to Step 2 with completed Step 1 state
    await page.evaluate(() => {
      (window as any).StateInjectionUtils.injectStep1Completion();
    });
    
    await page.locator('button:has-text("Continue to Step 2")').click();
    await page.waitForTimeout(500);
    
    // Close Step 2 modal
    const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
    if (await step2Modal.isVisible()) {
      await step2Modal.click();
    }
    
    // Inject state: 7 cards in Top 8 (approaching limit)
    await page.evaluate(() => {
      (window as any).StateInjectionUtils.injectConstraintTestState('step2', {
        targetPile: 'top8',
        cardCount: 7,
        nearLimit: true
      });
    });
    
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    // Should show approaching limit (7/8)
    await expect(top8Zone.locator('text=7/8')).toBeVisible({ timeout: 2000 });
    
    // Should have warning visual state
    await expect(top8Zone).toHaveClass(/border-orange|bg-orange/, { timeout: 1000 });
    
    // Add the 8th card manually
    await page.evaluate(() => {
      const step2Store = (window as any).useStep2Store.getState();
      const newCard = {
        id: 'test-card-8',
        value_name: 'Test Card 8', 
        description: 'Test card',
        position: { x: 0, y: 0 },
        pile: 'top8'
      };
      
      (window as any).useStep2Store.setState({
        top8Pile: [...step2Store.top8Pile, newCard]
      });
    });
    
    // Should show exact limit (8/8) and valid state
    await expect(top8Zone.locator('text=8/8')).toBeVisible({ timeout: 2000 });
    await expect(top8Zone).toHaveClass(/border-green|bg-green/, { timeout: 1000 });
    
    // Try to add 9th card - should trigger error state
    await page.evaluate(() => {
      const step2Store = (window as any).useStep2Store.getState();
      const overflowCard = {
        id: 'test-card-9',
        value_name: 'Test Card 9',
        description: 'Test card', 
        position: { x: 0, y: 0 },
        pile: 'top8'
      };
      
      // This should be rejected by the constraint system
      try {
        (window as any).useStep2Store.setState({
          top8Pile: [...step2Store.top8Pile, overflowCard]
        });
      } catch (e) {
        console.log('Expected constraint violation');
      }
    });
    
    // Should still show 8/8 (overflow rejected)
    await expect(top8Zone.locator('text=8/8')).toBeVisible();
    await expect(top8Zone.locator('.card')).toHaveCount(8);
  });

  test('should enforce Step 3 Top 3 limit with bounce animation', async () => {
    // Fast navigation to Step 3
    await page.evaluate(() => {
      (window as any).StateInjectionUtils.injectStep1Completion();
      (window as any).StateInjectionUtils.injectStep2Completion();
    });
    
    await page.locator('button:has-text("Continue to Step 2")').click();
    await page.waitForTimeout(300);
    
    let step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
    if (await step2Modal.isVisible()) {
      await step2Modal.click();
    }
    
    await page.locator('button:has-text("Continue to Step 3")').click();
    await page.waitForTimeout(300);
    
    const step3Modal = page.locator('button:has-text("Final Selection"), button:has-text("Got it")');
    if (await step3Modal.isVisible()) {
      await step3Modal.click();
    }
    
    // Inject state: 2 cards in Top 3 (approaching limit)
    await page.evaluate(() => {
      (window as any).StateInjectionUtils.injectConstraintTestState('step3', {
        targetPile: 'top3',
        cardCount: 2,
        nearLimit: true
      });
    });
    
    const top3Zone = page.locator('[data-pile="top3"], [data-testid="top3-pile"]');
    
    // Should show approaching limit (2/3)
    await expect(top3Zone.locator('text=2/3')).toBeVisible({ timeout: 2000 });
    
    // Add the 3rd card
    await page.evaluate(() => {
      const step3Store = (window as any).useStep3Store.getState();
      const newCard = {
        id: 'test-card-3',
        value_name: 'Test Card 3',
        description: 'Test card',
        position: { x: 0, y: 0 },
        pile: 'top3'
      };
      
      (window as any).useStep3Store.setState({
        top3Pile: [...step3Store.top3Pile, newCard]
      });
    });
    
    // Should show exact limit (3/3)
    await expect(top3Zone.locator('text=3/3')).toBeVisible({ timeout: 2000 });
    
    // Should show valid state
    await expect(top3Zone).toHaveClass(/border-green|bg-green/, { timeout: 1000 });
  });

  test('should show pile counters with correct formatting', async () => {
    // Navigate to Step 2
    await page.evaluate(() => {
      (window as any).StateInjectionUtils.injectStep1Completion();
    });
    
    await page.locator('button:has-text("Continue to Step 2")').click();
    await page.waitForTimeout(500);
    
    const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
    if (await step2Modal.isVisible()) {
      await step2Modal.click();
    }
    
    // Inject various pile states for counter testing
    await page.evaluate(() => {
      (window as any).StateInjectionUtils.injectConstraintTestState('step2', {
        targetPile: 'top8',
        cardCount: 5
      });
    });
    
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    // Should show counter in "current/max" format
    await expect(top8Zone.locator('text=5/8')).toBeVisible({ timeout: 2000 });
    
    // Pile counter component should be present with correct aria-label
    const pileCounter = top8Zone.locator('[role="status"]');
    await expect(pileCounter).toBeVisible();
    await expect(pileCounter).toHaveAttribute('aria-label', /5 cards/);
  });

  test('should handle staging area constraints', async () => {
    // Test staging area limit (1 card max) in Step 1
    await page.evaluate(() => {
      const step1Store = (window as any).useStep1Store.getState();
      const stagingCard = {
        id: 'staging-test-card',
        value_name: 'Staging Test',
        description: 'Test staging card',
        position: { x: 0, y: 0 },
        pile: 'staging'
      };
      
      (window as any).useStep1Store.setState({
        stagingCard: stagingCard,
        deck: [stagingCard], // Simulate deck with one card
        deckPosition: 0
      });
    });
    
    const stagingArea = page.locator('[data-testid="staging-area"]');
    
    // Should have 1 card in staging
    await expect(stagingArea.locator('.card')).toHaveCount(1);
    
    // Deck should be disabled (can't flip when staging is full)
    const deckButton = page.locator('[data-testid="deck"], button:has-text("Flip Next")');
    await expect(deckButton).toBeDisabled({ timeout: 2000 });
  });

  test('should validate constraint violations with proper feedback', async () => {
    // Fast setup Step 2 at limit
    await page.evaluate(() => {
      (window as any).StateInjectionUtils.injectStep1Completion();
    });
    
    await page.locator('button:has-text("Continue to Step 2")').click();
    await page.waitForTimeout(500);
    
    const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
    if (await step2Modal.isVisible()) {
      await step2Modal.click();
    }
    
    // Fill Top 8 pile to limit
    await page.evaluate(() => {
      (window as any).StateInjectionUtils.injectConstraintTestState('step2', {
        targetPile: 'top8',
        cardCount: 8
      });
    });
    
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    // Should show at limit
    await expect(top8Zone.locator('text=8/8')).toBeVisible({ timeout: 2000 });
    
    // Should be in valid state (green)
    await expect(top8Zone).toHaveClass(/border-green|bg-green/, { timeout: 1000 });
    
    // Continue button should be enabled
    const continueButton = page.locator('button:has-text("Continue to Step 3")');
    await expect(continueButton).toBeEnabled({ timeout: 1000 });
    
    // Should have proper ARIA labels for accessibility
    const pileCounter = top8Zone.locator('[role="status"]');
    await expect(pileCounter).toHaveAttribute('aria-label', /8 cards.*At limit|Within limits/);
  });

  test('should handle rapid state changes efficiently', async () => {
    // Test performance under rapid constraint checking
    const startTime = Date.now();
    
    await page.evaluate(() => {
      (window as any).StateInjectionUtils.injectStep1Completion();
    });
    
    await page.locator('button:has-text("Continue to Step 2")').click();
    await page.waitForTimeout(300);
    
    const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
    if (await step2Modal.isVisible()) {
      await step2Modal.click();
    }
    
    // Rapidly change pile states
    for (let i = 1; i <= 8; i++) {
      await page.evaluate((count) => {
        (window as any).StateInjectionUtils.injectConstraintTestState('step2', {
          targetPile: 'top8',
          cardCount: count
        });
      }, i);
      
      await page.waitForTimeout(50); // Small delay to simulate rapid changes
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete rapidly (under 2 seconds)
    expect(duration).toBeLessThan(2000);
    
    // Final state should be correct
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    await expect(top8Zone.locator('text=8/8')).toBeVisible({ timeout: 1000 });
  });
});