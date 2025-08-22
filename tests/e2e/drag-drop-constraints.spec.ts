import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for drag-and-drop constraint enforcement
 * Tests pile limits, validation rules, and error recovery
 */

test.describe('Drag and Drop Constraint Enforcement', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to home and create session
    await page.goto('/');
    await page.fill('input[name="name"]', 'Constraint User');
    await page.fill('input[name="sessionCode"]', 'CONST1');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/canvas/);
    
    // Close initial modal
    const modalCloseButton = page.locator('button:has-text("Start Sorting")');
    if (await modalCloseButton.isVisible()) {
      await modalCloseButton.click();
    }
  });

  test('should enforce staging area limit (max 1 card)', async () => {
    const stagingArea = page.locator('[data-testid="staging-area"], .staging-area');
    
    // Flip first card
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    await expect(stagingArea.locator('.card')).toHaveCount(1);
    
    // Try to flip another card while one is in staging
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    // Should still have only 1 card in staging
    await expect(stagingArea.locator('.card')).toHaveCount(1);
    
    // Deck button should be disabled or show warning
    const deckButton = page.locator('[data-testid="deck"], button:has-text("Flip Next")');
    const isDisabled = await deckButton.isDisabled();
    expect(isDisabled).toBe(true);
  });

  test('should prevent invalid pile assignments', async () => {
    // Navigate to Step 2
    await test.step('Complete Step 1', async () => {
      for (let i = 0; i < 8; i++) {
        await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
        await page.waitForTimeout(200);
        
        const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
        const targetZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
        await stagingCard.dragTo(targetZone);
        await page.waitForTimeout(100);
      }
      
      await page.locator('button:has-text("Continue to Step 2")').click();
      await page.waitForTimeout(500);
    });
    
    const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
    if (await step2Modal.isVisible()) {
      await step2Modal.click();
    }
    
    // Try to drag card to non-existent pile
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    
    // Try dragging to an invalid area (empty space)
    await stagingCard.hover();
    await page.mouse.down();
    await page.mouse.move(50, 50); // Move to empty area
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Card should return to staging area
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
  });

  test('should enforce Top 8 pile maximum (8 cards)', async () => {
    await test.step('Navigate to Step 2', async () => {
      for (let i = 0; i < 8; i++) {
        await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
        await page.waitForTimeout(200);
        
        const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
        const targetZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
        await stagingCard.dragTo(targetZone);
        await page.waitForTimeout(100);
      }
      
      await page.locator('button:has-text("Continue to Step 2")').click();
      await page.waitForTimeout(500);
      
      const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
      if (await step2Modal.isVisible()) {
        await step2Modal.click();
      }
    });
    
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    // Add exactly 8 cards
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(150);
    }
    
    // Verify exactly 8 cards
    await expect(top8Zone.locator('.card')).toHaveCount(8);
    
    // Try to add 9th card
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    await stagingCard.dragTo(top8Zone);
    await page.waitForTimeout(500);
    
    // Should reject 9th card
    await expect(top8Zone.locator('.card')).toHaveCount(8);
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
  });

  test('should enforce Top 3 pile maximum (3 cards)', async () => {
    await test.step('Navigate to Step 3', async () => {
      // Complete Step 1
      for (let i = 0; i < 8; i++) {
        await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
        await page.waitForTimeout(150);
        
        const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
        const targetZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
        await stagingCard.dragTo(targetZone);
        await page.waitForTimeout(100);
      }
      
      await page.locator('button:has-text("Continue to Step 2")').click();
      await page.waitForTimeout(300);
      
      const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
      if (await step2Modal.isVisible()) {
        await step2Modal.click();
      }
      
      // Complete Step 2
      const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
      for (let i = 0; i < 8; i++) {
        await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
        await page.waitForTimeout(150);
        
        const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
        await stagingCard.dragTo(top8Zone);
        await page.waitForTimeout(100);
      }
      
      await page.locator('button:has-text("Continue to Step 3")').click();
      await page.waitForTimeout(300);
      
      const step3Modal = page.locator('button:has-text("Start Final Selection"), button:has-text("Got it")');
      if (await step3Modal.isVisible()) {
        await step3Modal.click();
      }
    });
    
    const top3Zone = page.locator('[data-pile="top3"], [data-testid="top3-pile"]');
    
    // Add exactly 3 cards
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(250);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(top3Zone);
      await page.waitForTimeout(200);
    }
    
    // Verify exactly 3 cards
    await expect(top3Zone.locator('.card')).toHaveCount(3);
    
    // Try to add 4th card
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    await stagingCard.dragTo(top3Zone);
    await page.waitForTimeout(500);
    
    // Should reject 4th card
    await expect(top3Zone.locator('.card')).toHaveCount(3);
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
  });

  test('should handle constraint violations gracefully', async () => {
    // Test multiple constraint violations in sequence
    
    // Fill staging and try to add another card
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    // Staging should have 1 card
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
    
    // Try to flip another (should be prevented)
    const deckButton = page.locator('[data-testid="deck"], button:has-text("Flip Next")');
    await expect(deckButton).toBeDisabled();
    
    // Clear staging
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    const moreZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
    await stagingCard.dragTo(moreZone);
    await page.waitForTimeout(300);
    
    // Deck should be enabled again
    await expect(deckButton).not.toBeDisabled();
  });

  test('should validate card movements between piles', async () => {
    // Add cards to different piles
    const moreZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
    const lessZone = page.locator('[data-pile="less"], [data-testid="less-important-pile"]');
    
    // Add 3 cards to more important pile
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(moreZone);
      await page.waitForTimeout(150);
    }
    
    // Add 2 cards to less important pile
    for (let i = 0; i < 2; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(lessZone);
      await page.waitForTimeout(150);
    }
    
    // Verify pile counts
    await expect(moreZone.locator('.card')).toHaveCount(3);
    await expect(lessZone.locator('.card')).toHaveCount(2);
    
    // Move card from more important to less important
    const cardToMove = moreZone.locator('.card').first();
    await cardToMove.dragTo(lessZone);
    await page.waitForTimeout(300);
    
    // Verify counts updated
    await expect(moreZone.locator('.card')).toHaveCount(2);
    await expect(lessZone.locator('.card')).toHaveCount(3);
  });

  test('should prevent dragging cards outside valid drop zones', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    
    // Try to drag to various invalid locations
    const invalidLocations = [
      { x: 10, y: 10 },      // Top left corner
      { x: 50, y: 300 },     // Arbitrary middle point
      { x: 400, y: 100 },    // Right side
    ];
    
    for (const location of invalidLocations) {
      // Start drag
      await stagingCard.hover();
      await page.mouse.down();
      
      // Move to invalid location
      await page.mouse.move(location.x, location.y);
      await page.waitForTimeout(100);
      
      // Drop
      await page.mouse.up();
      await page.waitForTimeout(300);
      
      // Card should return to staging
      await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
    }
  });

  test('should handle rapid constraint violations', async () => {
    // Navigate to Step 2
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(100);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      const targetZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
      await stagingCard.dragTo(targetZone);
      await page.waitForTimeout(80);
    }
    
    await page.locator('button:has-text("Continue to Step 2")').click();
    await page.waitForTimeout(300);
    
    const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
    if (await step2Modal.isVisible()) {
      await step2Modal.click();
    }
    
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    // Fill Top 8 pile rapidly
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(100);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(80);
    }
    
    // Rapidly try to add more cards (should all be rejected)
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(100);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(50); // Very fast attempts
    }
    
    // Should maintain correct counts despite rapid violations
    await expect(top8Zone.locator('.card')).toHaveCount(8);
    
    // Last card should be in staging
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
  });

  test('should recover from interrupted constraint violations', async () => {
    // Navigate to Step 2 and fill Top 8 pile
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(150);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      const targetZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
      await stagingCard.dragTo(targetZone);
      await page.waitForTimeout(100);
    }
    
    await page.locator('button:has-text("Continue to Step 2")').click();
    await page.waitForTimeout(300);
    
    const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
    if (await step2Modal.isVisible()) {
      await step2Modal.click();
    }
    
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(150);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(100);
    }
    
    // Try to add 9th card but interrupt the operation
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    
    // Start drag but interrupt it
    await stagingCard.hover();
    await page.mouse.down();
    await top8Zone.hover();
    
    // Simulate interruption (blur event)
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });
    
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // System should recover gracefully
    await expect(top8Zone.locator('.card')).toHaveCount(8);
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
    
    // Should be able to continue normally
    const lessZone = page.locator('[data-pile="less"], [data-testid="less-important-pile"]');
    await stagingCard.dragTo(lessZone);
    await page.waitForTimeout(300);
    
    await expect(lessZone.locator('.card')).toHaveCount(1, { timeout: 1000 });
  });
});