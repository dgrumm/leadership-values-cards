import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for touch-based drag-and-drop functionality
 * Tests mobile interactions and touch-specific behaviors
 */

test.describe('Touch Drag and Drop Interactions', () => {
  let page: Page;

  // Run these tests on mobile devices
  test.use({ 
    viewport: { width: 375, height: 667 }, // iPhone SE size
    hasTouch: true,
    isMobile: true
  });

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to home and create session
    await page.goto('/');
    await page.fill('input[name="name"]', 'Touch User');
    await page.fill('input[name="sessionCode"]', 'TOUCH1');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/canvas/);
    
    // Close Step 1 modal
    const modalCloseButton = page.locator('button:has-text("Got it!")');
    if (await modalCloseButton.isVisible()) {
      await modalCloseButton.click();
      await expect(modalCloseButton).not.toBeVisible();
      await page.waitForTimeout(300);
    }
    
    await expect(page.locator('[data-testid="step1-page"], .step-1-container, h1:has-text("Step 1")')).toBeVisible();
  });

  test('should handle touch drag operations', async () => {
    // Flip a card to staging
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    const moreZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
    
    // Perform touch drag
    await stagingCard.tap();
    await page.waitForTimeout(100);
    
    // Long press to initiate drag (200ms as per spec)
    await stagingCard.hover();
    await page.mouse.down();
    await page.waitForTimeout(250); // Longer than 200ms long press threshold
    
    // Move to target zone
    await moreZone.hover();
    await page.mouse.up();
    await page.waitForTimeout(300);
    
    // Verify card moved
    await expect(moreZone.locator('.card')).toHaveCount(1);
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(0);
  });

  test('should require long press to initiate drag on touch devices', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    const moreZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
    
    // Try short tap (should not initiate drag)
    await stagingCard.tap();
    await page.waitForTimeout(50); // Less than 200ms
    
    await moreZone.hover();
    await page.waitForTimeout(200);
    
    // Card should still be in staging (short tap doesn't drag)
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
    await expect(moreZone.locator('.card')).toHaveCount(0);
  });

  test('should show touch affordances on mobile', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    
    // Check for touch-specific CSS classes
    const cardClasses = await stagingCard.getAttribute('class');
    expect(cardClasses).toMatch(/touch-drag-handle/);
    
    // Check for touch-action CSS property
    const touchAction = await stagingCard.evaluate((el) => {
      return window.getComputedStyle(el).touchAction;
    });
    expect(touchAction).toBe('none');
  });

  test('should handle rapid touch interactions without errors', async () => {
    // Perform rapid touch interactions
    const deck = page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")');
    const moreZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
    
    for (let i = 0; i < 5; i++) {
      await deck.tap();
      await page.waitForTimeout(300);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      
      // Quick long press and drag
      await stagingCard.hover();
      await page.mouse.down();
      await page.waitForTimeout(250);
      await moreZone.hover();
      await page.mouse.up();
      await page.waitForTimeout(100);
    }
    
    // Verify all cards moved successfully
    await expect(moreZone.locator('.card')).toHaveCount(5);
  });

  test('should prevent scrolling during drag operations', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    
    // Start drag operation
    await stagingCard.hover();
    await page.mouse.down();
    await page.waitForTimeout(250);
    
    // Check that page scroll is prevented during drag
    const bodyStyle = await page.evaluate(() => {
      return window.getComputedStyle(document.body).overflow;
    });
    
    // During drag, scrolling should be restricted
    await page.mouse.move(0, 100); // Try to scroll
    
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0); // Page should not have scrolled
    
    await page.mouse.up();
  });

  test('should work on different mobile viewport sizes', async () => {
    // Test on smaller mobile viewport
    await page.setViewportSize({ width: 320, height: 568 });
    await page.waitForTimeout(300);
    
    // Flip a card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    const lessZone = page.locator('[data-pile="less"], [data-testid="less-important-pile"]');
    
    // Verify elements are still interactive on small screen
    await expect(stagingCard).toBeVisible();
    await expect(lessZone).toBeVisible();
    
    // Perform drag operation
    await stagingCard.hover();
    await page.mouse.down();
    await page.waitForTimeout(250);
    await lessZone.hover();
    await page.mouse.up();
    await page.waitForTimeout(300);
    
    // Verify drag worked
    await expect(lessZone.locator('.card')).toHaveCount(1);
  });

  test('should handle interrupted touch gestures gracefully', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    
    // Start drag but interrupt it
    await stagingCard.hover();
    await page.mouse.down();
    await page.waitForTimeout(250);
    
    // Simulate interruption (e.g., notification, phone call)
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
    });
    
    await page.waitForTimeout(200);
    
    // Card should return to original position
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
    
    // Should be able to drag normally after interruption
    await stagingCard.hover();
    await page.mouse.down();
    await page.waitForTimeout(250);
    const moreZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
    await moreZone.hover();
    await page.mouse.up();
    await page.waitForTimeout(300);
    
    await expect(moreZone.locator('.card')).toHaveCount(1);
  });

  test('should provide visual feedback for touch interactions', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    const moreZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
    
    // Start long press
    await stagingCard.hover();
    await page.mouse.down();
    await page.waitForTimeout(250);
    
    // Check for drag start visual feedback
    const cardClasses = await stagingCard.getAttribute('class');
    expect(cardClasses).toMatch(/card-drag-start|scale-105|shadow/);
    
    // Move over drop zone
    await moreZone.hover();
    await page.waitForTimeout(100);
    
    // Check for drop zone highlighting
    const zoneClasses = await moreZone.getAttribute('class');
    expect(zoneClasses).toMatch(/pile-highlight|bg-blue|border-blue/);
    
    await page.mouse.up();
  });

  test('should handle touch gestures in pile constraint scenarios', async () => {
    // Navigate to Step 2 where pile limits exist
    // Complete Step 1 first
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      const targetZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
      await stagingCard.hover();
      await page.mouse.down();
      await page.waitForTimeout(250);
      await targetZone.hover();
      await page.mouse.up();
      await page.waitForTimeout(150);
    }
    
    // Navigate to Step 2
    await page.locator('button:has-text("Continue to Step 2")').click();
    await page.waitForTimeout(500);
    
    const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
    if (await step2Modal.isVisible()) {
      await step2Modal.click();
    }
    
    // Fill Top 8 pile to capacity (8 cards)
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.hover();
      await page.mouse.down();
      await page.waitForTimeout(250);
      await top8Zone.hover();
      await page.mouse.up();
      await page.waitForTimeout(150);
    }
    
    // Try to add 9th card with touch
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    await stagingCard.hover();
    await page.mouse.down();
    await page.waitForTimeout(250);
    await top8Zone.hover();
    await page.waitForTimeout(100);
    
    // Should show invalid drop feedback
    const zoneClasses = await top8Zone.getAttribute('class');
    expect(zoneClasses).toMatch(/pile-highlight-invalid|border-red/);
    
    await page.mouse.up();
    
    // Card should bounce back to staging
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
    await expect(top8Zone.locator('.card')).toHaveCount(8);
  });
});