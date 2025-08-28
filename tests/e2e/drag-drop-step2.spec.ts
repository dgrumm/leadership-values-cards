import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for drag-and-drop functionality in Step 2 (Top 8 Selection)
 * Tests pile limit enforcement and constraint validation
 */

test.describe('Step 2 - Drag and Drop with Pile Constraints', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to home and create session
    await page.goto('/');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="sessionCode"]', 'TEST02');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/canvas/);
    
    // Close Step 1 modal if present
    const modalCloseButton = page.locator('button:has-text("Got it!")');
    if (await modalCloseButton.isVisible()) {
      await modalCloseButton.click();
      await expect(modalCloseButton).not.toBeVisible();
    }
    
    // Verify we're in Step 1 and the deck exists before proceeding
    await expect(page.locator('[data-testid="deck"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="staging-area"]')).toBeVisible();
    
    // Complete Step 1 by sorting ALL cards (optimized for speed)
    const sortCards = async (count: number) => {
      for (let i = 0; i < count; i++) {
        // Click deck to flip card
        const deck = page.locator('[data-testid="deck"]');
        await deck.click();
        
        // Wait for card to appear in staging and flip animation to complete
        await expect(page.locator('[data-testid="staging-area"] .card')).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(100); // Minimal wait for flip animation
        
        // Drag card to pile (distribute roughly 8/8 split)
        const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
        const targetPile = i < 8 ? 
          page.locator('[data-testid="more-important-pile"]') :
          page.locator('[data-testid="less-important-pile"]');
        
        await stagingCard.dragTo(targetPile);
        
        // Brief wait for drag to complete
        await page.waitForTimeout(100);
      }
    };
    
    // Sort ALL cards (12 for DEVELOPMENT_DECK) to enable Step 2 button
    await sortCards(12);
    
    // Verify staging area is completely empty and all cards are in piles
    await expect(page.locator('[data-testid="staging-area"] .card')).not.toBeVisible();
    await expect(page.locator('[data-testid="more-important-pile"] .card')).toHaveCount(8);
    await expect(page.locator('[data-testid="less-important-pile"] .card')).toHaveCount(8);
    
    // Navigate to Step 2
    const continueButton = page.locator('button:has-text("Continue to Step 2")');
    await continueButton.waitFor({ state: 'visible', timeout: 5000 });
    await continueButton.click();
    
    // Close Step 2 modal if present
    const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
    if (await step2Modal.isVisible({ timeout: 3000 })) {
      await step2Modal.click();
    }
    
    // Verify Step 2 loaded
    await expect(page.locator('[data-testid="step2-page"], .step-2-container, h1:has-text("Step 2")')).toBeVisible({ timeout: 5000 });
  });

  test('should display Step 2 interface with Top 8 and less important piles', async () => {
    // Verify Top 8 pile is present and empty initially
    await expect(page.locator('[data-pile="top8"], [data-testid="top8-pile"]')).toBeVisible();
    
    // Verify less important pile is present
    await expect(page.locator('[data-pile="less"], [data-testid="less-important-pile"]')).toBeVisible();
    
    // Verify staging area is present
    await expect(page.locator('[data-testid="staging-area"], .staging-area')).toBeVisible();
  });

  test('should enforce Top 8 pile limit (max 8 cards)', async () => {
    // Add 8 cards to Top 8 pile
    for (let i = 0; i < 8; i++) {
      // Flip a card from deck
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(300);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
      
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(200);
    }
    
    // Verify Top 8 pile has exactly 8 cards
    await expect(page.locator('[data-pile="top8"] .card, [data-testid="top8-pile"] .card')).toHaveCount(8);
    
    // Try to add a 9th card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    // Attempt to drag 9th card
    await stagingCard.dragTo(top8Zone);
    await page.waitForTimeout(500); // Wait for bounce animation
    
    // Verify pile still has only 8 cards
    await expect(page.locator('[data-pile="top8"] .card, [data-testid="top8-pile"] .card')).toHaveCount(8);
    
    // Verify 9th card is still in staging or bounced back
    await expect(page.locator('[data-testid="staging-area"] .card, .staging-area .card')).toHaveCount(1);
  });

  test('should show visual feedback when pile is full', async () => {
    // Fill Top 8 pile to capacity
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(150);
    }
    
    // Flip another card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
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
  });

  test('should allow moving cards from Top 8 back to less important', async () => {
    // Add a card to Top 8 pile
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    const lessZone = page.locator('[data-pile="less"], [data-testid="less-important-pile"]');
    
    await stagingCard.dragTo(top8Zone);
    await page.waitForTimeout(300);
    
    // Verify card is in Top 8
    await expect(top8Zone.locator('.card')).toHaveCount(1);
    
    // Move card from Top 8 to less important
    const cardInTop8 = top8Zone.locator('.card').first();
    await cardInTop8.dragTo(lessZone);
    await page.waitForTimeout(300);
    
    // Verify card moved
    await expect(top8Zone.locator('.card')).toHaveCount(0);
    await expect(lessZone.locator('.card')).toHaveCount(1, { timeout: 1000 });
  });

  test('should maintain card positioning and stacking in Top 8 pile', async () => {
    // Add 5 cards to Top 8 pile
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(300);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(200);
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
      await page.waitForTimeout(300);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(200);
      
      // Check that pile count is displayed correctly
      await expect(page.locator(`text="${i} card${i !== 1 ? 's' : ''}"`)).toBeVisible();
    }
  });

  test('should handle rapid drag operations without breaking', async () => {
    // Perform rapid drag operations
    for (let i = 0; i < 6; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(100); // Reduced wait time for rapid testing
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const targetZone = i < 4 ? 
        page.locator('[data-pile="top8"], [data-testid="top8-pile"]') :
        page.locator('[data-pile="less"], [data-testid="less-important-pile"]');
      
      await stagingCard.dragTo(targetZone);
      await page.waitForTimeout(100);
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
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    await stagingCard.dragTo(top8Zone);
    await page.waitForTimeout(300);
    
    const cardInPile = top8Zone.locator('.card').first();
    
    // Try dragging to an invalid area (outside drop zones)
    await cardInPile.hover();
    await page.mouse.down();
    await page.mouse.move(50, 50); // Move to empty area
    await page.mouse.up();
    await page.waitForTimeout(300);
    
    // Card should remain in original pile
    await expect(top8Zone.locator('.card')).toHaveCount(1);
  });
});