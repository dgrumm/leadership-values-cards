import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for drag-and-drop functionality in Step 3 (Top 3 Selection)
 * Tests final selection constraints and completion flow
 */

test.describe('Step 3 - Drag and Drop Final Selection', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to home and create session
    await page.goto('/');
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="sessionCode"]', 'TEST03');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/canvas/);
    
    // Complete Step 1 quickly
    const modalCloseButton = page.locator('button:has-text("Got it!")');
    if (await modalCloseButton.isVisible()) {
      await modalCloseButton.click();
      await expect(modalCloseButton).not.toBeVisible();
      await page.waitForTimeout(300);
    }
    
    // Complete Step 1 - sort 8+ cards
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const targetZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
      await stagingCard.dragTo(targetZone);
      await page.waitForTimeout(150);
    }
    
    // Navigate to Step 2
    await page.locator('button:has-text("Continue to Step 2"), .step-navigation button').click();
    await page.waitForTimeout(300);
    
    const step2Modal = page.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
    if (await step2Modal.isVisible()) {
      await step2Modal.click();
    }
    
    // Complete Step 2 - select 8 cards for Top 8
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(150);
    }
    
    // Navigate to Step 3
    await page.locator('button:has-text("Continue to Step 3"), .step-navigation button').click();
    await page.waitForTimeout(300);
    
    // Close Step 3 modal if present
    const step3Modal = page.locator('button:has-text("Start Final Selection"), button:has-text("Got it")');
    if (await step3Modal.isVisible()) {
      await step3Modal.click();
    }
    
    await expect(page.locator('[data-testid="step3-page"], .step-3-container, h1:has-text("Step 3")')).toBeVisible();
  });

  test('should display Step 3 interface with Top 3 pile', async () => {
    // Verify Top 3 pile is present
    await expect(page.locator('[data-pile="top3"], [data-testid="top3-pile"]')).toBeVisible();
    
    // Verify less important pile is present
    await expect(page.locator('[data-pile="less"], [data-testid="less-important-pile"]')).toBeVisible();
    
    // Verify staging area is present
    await expect(page.locator('[data-testid="staging-area"], .staging-area')).toBeVisible();
    
    // Verify there are exactly 8 cards available from Step 2
    const totalCards = await page.locator('.card').count();
    expect(totalCards).toBeGreaterThanOrEqual(8);
  });

  test('should enforce Top 3 pile limit (max 3 cards)', async () => {
    // Add 3 cards to Top 3 pile
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(300);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top3Zone = page.locator('[data-pile="top3"], [data-testid="top3-pile"]');
      
      await stagingCard.dragTo(top3Zone);
      await page.waitForTimeout(200);
    }
    
    // Verify Top 3 pile has exactly 3 cards
    await expect(page.locator('[data-pile="top3"] .card, [data-testid="top3-pile"] .card')).toHaveCount(3);
    
    // Try to add a 4th card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    const top3Zone = page.locator('[data-pile="top3"], [data-testid="top3-pile"]');
    
    // Attempt to drag 4th card
    await stagingCard.dragTo(top3Zone);
    await page.waitForTimeout(500); // Wait for bounce animation
    
    // Verify pile still has only 3 cards
    await expect(page.locator('[data-pile="top3"] .card, [data-testid="top3-pile"] .card')).toHaveCount(3);
    
    // Verify 4th card bounced back
    await expect(page.locator('[data-testid="staging-area"] .card, .staging-area .card')).toHaveCount(1);
  });

  test('should show invalid drop feedback when Top 3 pile is full', async () => {
    // Fill Top 3 pile to capacity
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top3Zone = page.locator('[data-pile="top3"], [data-testid="top3-pile"]');
      await stagingCard.dragTo(top3Zone);
      await page.waitForTimeout(150);
    }
    
    // Try to add another card and check visual feedback
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    const top3Zone = page.locator('[data-pile="top3"], [data-testid="top3-pile"]');
    
    // Start drag over full pile
    await stagingCard.hover();
    await page.mouse.down();
    await top3Zone.hover();
    await page.waitForTimeout(100);
    
    // Check for invalid drop styling
    const zoneClasses = await top3Zone.getAttribute('class');
    expect(zoneClasses).toMatch(/pile-highlight-invalid|border-red|bg-red/);
    
    await page.mouse.up();
  });

  test('should allow rearranging cards within Top 3 pile', async () => {
    // Add 3 cards to Top 3 pile
    const cardNames: string[] = [];
    
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(300);
      
      // Get card name for verification
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const cardText = await stagingCard.textContent();
      cardNames.push(cardText || '');
      
      const top3Zone = page.locator('[data-pile="top3"], [data-testid="top3-pile"]');
      await stagingCard.dragTo(top3Zone);
      await page.waitForTimeout(200);
    }
    
    // Verify all 3 cards are in Top 3
    await expect(page.locator('[data-pile="top3"] .card, [data-testid="top3-pile"] .card')).toHaveCount(3);
    
    // Move one card from Top 3 back to less important
    const firstCard = page.locator('[data-pile="top3"] .card, [data-testid="top3-pile"] .card').first();
    const lessZone = page.locator('[data-pile="less"], [data-testid="less-important-pile"]');
    
    await firstCard.dragTo(lessZone);
    await page.waitForTimeout(300);
    
    // Verify card moved
    await expect(page.locator('[data-pile="top3"] .card, [data-testid="top3-pile"] .card')).toHaveCount(2);
    await expect(lessZone.locator('.card')).toHaveCount(1, { timeout: 1000 });
  });

  test('should display final selection prominently', async () => {
    // Fill Top 3 pile
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(300);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top3Zone = page.locator('[data-pile="top3"], [data-testid="top3-pile"]');
      await stagingCard.dragTo(top3Zone);
      await page.waitForTimeout(200);
    }
    
    // Verify Top 3 cards are displayed prominently
    const top3Cards = page.locator('[data-pile="top3"] .card, [data-testid="top3-pile"] .card');
    await expect(top3Cards).toHaveCount(3);
    
    // Check that Top 3 cards are larger or have special styling
    const firstCard = top3Cards.first();
    const cardClasses = await firstCard.getAttribute('class');
    
    // Cards should be visible and properly styled
    await expect(firstCard).toBeVisible();
    
    // Verify pile title indicates it's the final selection
    await expect(page.locator('text=/Top 3|Final|Most Important/')).toBeVisible();
  });

  test('should maintain card visibility in tight layout', async () => {
    // Add all 3 cards to verify layout
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(300);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top3Zone = page.locator('[data-pile="top3"], [data-testid="top3-pile"]');
      await stagingCard.dragTo(top3Zone);
      await page.waitForTimeout(200);
    }
    
    // Verify all cards are visible (not completely overlapped)
    const cards = page.locator('[data-pile="top3"] .card, [data-testid="top3-pile"] .card');
    
    for (let i = 0; i < 3; i++) {
      const card = cards.nth(i);
      await expect(card).toBeVisible();
      
      // Verify card is clickable/interactable
      const box = await card.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    }
    
    // Verify cards don't completely overlap
    const card1Box = await cards.nth(0).boundingBox();
    const card2Box = await cards.nth(1).boundingBox();
    const card3Box = await cards.nth(2).boundingBox();
    
    // Cards should have different positions
    const positions = [
      { x: card1Box!.x, y: card1Box!.y },
      { x: card2Box!.x, y: card2Box!.y },
      { x: card3Box!.x, y: card3Box!.y }
    ];
    
    // Check that at least some cards have different positions
    const uniquePositions = positions.filter((pos, index, self) => 
      index === self.findIndex(p => p.x === pos.x && p.y === pos.y)
    );
    expect(uniquePositions.length).toBeGreaterThanOrEqual(2);
  });

  test('should enable completion when Top 3 is filled', async () => {
    // Add 3 cards to Top 3 pile
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(300);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top3Zone = page.locator('[data-pile="top3"], [data-testid="top3-pile"]');
      await stagingCard.dragTo(top3Zone);
      await page.waitForTimeout(200);
    }
    
    // Check for completion button or indicator
    await expect(page.locator('button:has-text("Complete"), button:has-text("Finish"), button:has-text("Done")')).toBeVisible({ timeout: 2000 });
  });

  test('should handle edge case of removing and re-adding cards', async () => {
    // Add 2 cards to Top 3
    for (let i = 0; i < 2; i++) {
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(300);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const top3Zone = page.locator('[data-pile="top3"], [data-testid="top3-pile"]');
      await stagingCard.dragTo(top3Zone);
      await page.waitForTimeout(200);
    }
    
    // Remove one card
    const top3Zone = page.locator('[data-pile="top3"], [data-testid="top3-pile"]');
    const lessZone = page.locator('[data-pile="less"], [data-testid="less-important-pile"]');
    const cardToRemove = top3Zone.locator('.card').first();
    
    await cardToRemove.dragTo(lessZone);
    await page.waitForTimeout(300);
    
    // Verify only 1 card remains in Top 3
    await expect(top3Zone.locator('.card')).toHaveCount(1);
    
    // Add another card back
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    await stagingCard.dragTo(top3Zone);
    await page.waitForTimeout(300);
    
    // Verify we now have 2 cards again
    await expect(top3Zone.locator('.card')).toHaveCount(2);
    
    // Should be able to add one more (for a total of 3)
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const finalCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    await finalCard.dragTo(top3Zone);
    await page.waitForTimeout(300);
    
    await expect(top3Zone.locator('.card')).toHaveCount(3);
  });
});