import { test, expect, type Page } from '@playwright/test';
import { setupStep2FastStart, resetAllTestStores, verifyStepState } from '../helpers/state-injection-helpers';

/**
 * FAST E2E tests for drag-and-drop functionality in Step 2 (Top 8 Selection)
 * Uses state injection to bypass slow Step 1 progression (8s → 0.5s setup)
 * Tests pile limit enforcement and constraint validation
 */

test.describe('Step 2 - Drag and Drop with Pile Constraints (Fast)', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Fast setup: N-1 state injection + natural completion
    // Injects 15/16 cards, completes 1 naturally for proper React updates
    // Speed: 8s → 1.5s (81% faster, maintains authenticity)
    await setupStep2FastStart(page, { sessionCode: 'FAST02' });
    
    // Verify state injection worked
    const stateValid = await verifyStepState(page, 2);
    if (!stateValid) {
      throw new Error('State injection failed - Step 2 not properly initialized');
    }
  });

  test.afterEach(async () => {
    // Clean up state between tests
    await resetAllTestStores(page);
  });

  test('should display Step 2 interface with Top 8 and less important piles', async () => {
    // Verify Top 8 pile is present and empty initially
    await expect(page.locator('[data-pile="top8"], [data-testid="top8-pile"]')).toBeVisible();
    
    // Verify less important pile is present
    await expect(page.locator('[data-pile="less"], [data-testid="less-important-pile"]')).toBeVisible();
    
    // Verify staging area is present
    await expect(page.locator('[data-testid="staging-area"], .staging-area')).toBeVisible();
    
    // Verify deck is available (from Step 1 "more important" cards)
    await expect(page.locator('[data-testid="deck"], .deck-container')).toBeVisible();
  });

  test('should enforce Top 8 pile limit (max 8 cards)', async () => {
    // Add 8 cards to Top 8 pile
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(200); // Reduced from 300ms
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
      
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(150); // Reduced from 200ms
    }
    
    // Verify Top 8 pile has exactly 8 cards
    await expect(page.locator('[data-pile="top8"] .card, [data-testid="top8-pile"] .card')).toHaveCount(8);
    
    // Try to add a 9th card (should be rejected)
    const remainingCards = await page.locator('[data-testid="deck"], .deck-container').isVisible();
    if (remainingCards) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
      
      // Attempt to drag 9th card
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(300); // Wait for bounce animation
      
      // Verify pile still has only 8 cards
      await expect(page.locator('[data-pile="top8"] .card, [data-testid="top8-pile"] .card')).toHaveCount(8);
      
      // Verify 9th card is still in staging or bounced back
      await expect(page.locator('[data-testid="staging-area"] .card, .staging-area .card')).toHaveCount(1);
    }
  });

  test('should show visual feedback when pile is full', async () => {
    // Fill Top 8 pile to capacity (same as above test but focused on UI feedback)
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(150); // Reduced wait
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(100); // Reduced wait
    }
    
    // Try to add another card and check visual feedback
    const remainingCards = await page.locator('[data-testid="deck"], .deck-container').isVisible();
    if (remainingCards) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
      
      // Start drag over full pile
      await stagingCard.hover();
      await page.mouse.down();
      await top8Zone.hover();
      await page.waitForTimeout(100);
      
      // Check for invalid drop styling
      const zoneClasses = await top8Zone.getAttribute('class');
      expect(zoneClasses).toMatch(/pile-highlight-invalid|border-red|bg-red/);
      
      await page.mouse.up();
    }
  });

  test('should allow moving cards from Top 8 back to less important', async () => {
    // Add a card to Top 8 pile
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(200);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    const lessZone = page.locator('[data-pile="less"], [data-testid="less-important-pile"]');
    
    await stagingCard.dragTo(top8Zone);
    await page.waitForTimeout(200);
    
    // Verify card is in Top 8
    await expect(top8Zone.locator('.card')).toHaveCount(1);
    
    // Move card from Top 8 to less important
    const cardInTop8 = top8Zone.locator('.card').first();
    await cardInTop8.dragTo(lessZone);
    await page.waitForTimeout(200);
    
    // Verify card moved
    await expect(top8Zone.locator('.card')).toHaveCount(0);
    await expect(lessZone.locator('.card')).toHaveCount(1, { timeout: 1000 });
  });

  test('should maintain card positioning and stacking in Top 8 pile', async () => {
    // Add 5 cards to Top 8 pile
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(150);
    }
    
    // Verify all 5 cards are visible
    await expect(page.locator('[data-pile="top8"] .card, [data-testid="top8-pile"] .card')).toHaveCount(5);
    
    // Check that cards have proper stacking (different positions)
    const cards = page.locator('[data-pile="top8"] .card, [data-testid="top8-pile"] .card');
    const firstCard = cards.nth(0);
    const lastCard = cards.nth(4);
    
    const firstBox = await firstCard.boundingBox();
    const lastBox = await lastCard.boundingBox();
    
    // Cards should be positioned differently (stacked with offset)
    expect(firstBox?.x !== lastBox?.x || firstBox?.y !== lastBox?.y).toBeTruthy();
    
    // All cards should be clickable (not completely hidden)
    await expect(firstCard).toBeVisible();
    await expect(lastCard).toBeVisible();
  });

  test('should show pile count in UI', async () => {
    // Add cards to Top 8 pile and check count display
    for (let i = 1; i <= 3; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(150);
      
      // Check that pile count is displayed correctly
      await expect(page.locator(`text="${i} card${i !== 1 ? 's' : ''}"`)).toBeVisible();
    }
  });

  test('should handle rapid drag operations without breaking', async () => {
    // Perform rapid drag operations (reduced waits for faster testing)
    for (let i = 0; i < 6; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(75); // Reduced from 100ms
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const targetZone = i < 4 ? 
        page.locator('[data-pile="top8"], [data-testid="top8-pile"]') :
        page.locator('[data-pile="less"], [data-testid="less-important-pile"]');
      
      await stagingCard.dragTo(targetZone);
      await page.waitForTimeout(75); // Reduced from 100ms
    }
    
    // Verify final state is correct
    await expect(page.locator('[data-pile="top8"] .card, [data-testid="top8-pile"] .card')).toHaveCount(4);
    await expect(page.locator('[data-pile="less"] .card, [data-testid="less-important-pile"] .card')).toHaveCount(2, { timeout: 1000 });
    
    // Verify no cards are stuck in staging
    await expect(page.locator('[data-testid="staging-area"] .card, .staging-area .card')).toHaveCount(0);
  });

  test('should prevent dragging cards to invalid zones', async () => {
    // Add a card to Top 8
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(200);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    await stagingCard.dragTo(top8Zone);
    await page.waitForTimeout(200);
    
    const cardInPile = top8Zone.locator('.card').first();
    
    // Try dragging to an invalid area (outside drop zones)
    await cardInPile.hover();
    await page.mouse.down();
    await page.mouse.move(50, 50); // Move to empty area
    await page.mouse.up();
    await page.waitForTimeout(200); // Reduced wait
    
    // Card should remain in original pile
    await expect(top8Zone.locator('.card')).toHaveCount(1);
  });

  test('performance: should complete full Step 2 workflow under time limit', async () => {
    const startTime = Date.now();
    
    // Complete a full Step 2 workflow: fill Top 8 pile
    for (let i = 0; i < 8; i++) {
      // Click deck to flip next card
      await page.locator('[data-testid="deck"]').click();
      await page.waitForTimeout(200); // Wait for card to appear in staging
      
      // Wait for staging card to appear and be ready for drag
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.waitFor({ state: 'visible', timeout: 3000 });
      
      const top8Zone = page.locator('[data-testid="top8-pile"]');
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(100); // Wait for drag completion
    }
    
    // Verify completion
    await expect(page.locator('[data-pile="top8"] .card, [data-testid="top8-pile"] .card')).toHaveCount(8);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete Step 2 workflow in under 20 seconds (vs 30+ seconds in original)
    // N-1 approach achieved ~14s vs original 30+s = 50%+ improvement  
    expect(duration).toBeLessThan(20000);
    console.log(`Step 2 workflow completed in ${duration}ms`);
  });
});