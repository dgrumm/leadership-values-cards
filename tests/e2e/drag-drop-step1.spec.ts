import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for drag-and-drop functionality in Step 1 (Initial Sort)
 * Tests prevent regressions in drag-drop mechanics
 */

test.describe('Step 1 - Drag and Drop Functionality', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to home and create a new session
    await page.goto('/');
    await page.getByLabel('Your Name:').fill('Test User');
    await page.getByLabel('Session Code:').fill('TEST01');
    await page.click('button[type="submit"]');
    
    // Wait for canvas page to load
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/canvas/);
    
    // Close the Step 1 modal if present
    const modalCloseButton = page.locator('button:has-text("Got it!")');
    if (await modalCloseButton.isVisible()) {
      await modalCloseButton.click();
      // Wait for modal close animation to complete and modal to be removed from DOM
      await expect(modalCloseButton).not.toBeVisible();
      await page.waitForTimeout(300); // Additional wait for any remaining animations
    }
    
    // Wait for the step to be ready
    await expect(page.locator('[data-testid="step1-page"], .step-1-container, h1:has-text("Step 1")')).toBeVisible();
  });

  test('should display initial deck and empty drop zones', async () => {
    // Verify deck is present
    await expect(page.locator('[data-testid="deck"]')).toBeVisible();
    
    // Verify drop zones are present and empty
    await expect(page.locator('[data-testid="more-important-pile"]')).toBeVisible();
    await expect(page.locator('[data-testid="less-important-pile"]')).toBeVisible();
    
    // Verify staging area is visible
    await expect(page.locator('[data-testid="staging-area"]')).toBeVisible();
  });

  test('should flip card from deck to staging area', async () => {
    // Find and click the deck to flip a card
    const deck = page.locator('[data-testid="deck"]');
    await deck.click();
    
    // Wait for card to appear in staging area with proper timeout for flip animation
    await expect(page.locator('[data-testid="staging-area"] .card')).toBeVisible({ timeout: 3000 });
    
    // Wait for flip animation to complete
    await page.waitForTimeout(700); // Flip animation is 0.5-0.7s according to component
    
    // Verify card is flipped (shows content, not back)
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    await expect(stagingCard).not.toContainText('?'); // Card back shows '?'
  });

  test('should drag card from staging to more important pile', async () => {
    // Flip a card first
    await page.locator('[data-testid="deck"]').click();
    // Wait for card to appear and flip animation to complete
    await expect(page.locator('[data-testid="staging-area"] .card')).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(700); // Wait for flip animation
    
    // Capture the original card text to verify it moved to the pile
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    const originalCardText = await stagingCard.textContent();
    await expect(stagingCard).toBeVisible();
    
    // Get the more important drop zone
    const moreImportantZone = page.locator('[data-testid="more-important-pile"]');
    await expect(moreImportantZone).toBeVisible();
    
    // Perform drag and drop
    await stagingCard.dragTo(moreImportantZone);
    
    // Wait for drop animation and auto-flip to complete
    await page.waitForTimeout(800); // Longer wait for auto-flip
    
    // Verify card moved to more important pile
    await expect(moreImportantZone.locator('.card')).toHaveCount(1);
    
    // Verify the moved card is in the pile (check text content)
    const pileCard = moreImportantZone.locator('.card').first();
    await expect(pileCard).toHaveText(originalCardText || '');
    
    // Verify staging area has a card (auto-flipped from deck), not empty
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
    
    // Optional: Verify the staging card might be different from the original (auto-flipped)
    // Note: In edge cases with small decks or shuffling, cards could repeat
    const newStagingCard = page.locator('[data-testid="staging-area"] .card').first();
    await expect(newStagingCard).toBeVisible(); // Just ensure there's a valid card
  });

  test('should drag card from staging to less important pile', async () => {
    // Flip a card first
    await page.locator('[data-testid="deck"]').click();
    // Wait for card to appear and flip animation to complete
    await expect(page.locator('[data-testid="staging-area"] .card')).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(700);
    
    // Capture the original card text to verify it moved to the pile
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    const originalCardText = await stagingCard.textContent();
    await expect(stagingCard).toBeVisible();
    
    const lessImportantZone = page.locator('[data-testid="less-important-pile"]');
    await expect(lessImportantZone).toBeVisible();
    
    // Perform drag and drop
    await stagingCard.dragTo(lessImportantZone);
    
    // Wait for drop animation and auto-flip to complete
    await page.waitForTimeout(800);
    
    // Verify card moved to less important pile
    await expect(lessImportantZone.locator('.card')).toHaveCount(1);
    
    // Verify the moved card is in the pile (check text content)
    const pileCard = lessImportantZone.locator('.card').first();
    await expect(pileCard).toHaveText(originalCardText || '');
    
    // Verify staging area has a card (auto-flipped from deck), not empty
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
    
    // Optional: Verify the staging card might be different from the original (auto-flipped)
    // Note: In edge cases with small decks or shuffling, cards could repeat
    const newStagingCard = page.locator('[data-testid="staging-area"] .card').first();
    await expect(newStagingCard).toBeVisible(); // Just ensure there's a valid card
  });

  test('should show visual feedback during drag operations', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"]').click();
    // Wait for card to appear and flip animation to complete
    await expect(page.locator('[data-testid="staging-area"] .card')).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(700);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    const moreImportantZone = page.locator('[data-testid="more-important-pile"]');
    
    // Start drag operation
    await stagingCard.hover();
    await page.mouse.down();
    
    // Move mouse over drop zone to trigger highlighting
    await moreImportantZone.hover();
    await page.waitForTimeout(100);
    
    // Check for highlight class or style changes
    const zoneClasses = await moreImportantZone.getAttribute('class');
    expect(zoneClasses).toMatch(/pile-highlight|bg-blue|border-blue/);
    
    // Complete the drop
    await page.mouse.up();
    await page.waitForTimeout(300);
  });

  test('should move cards between piles', async () => {
    // Flip and place a card in more important pile
    await page.locator('[data-testid="deck"]').click();
    // Wait for card to appear and flip animation to complete
    await expect(page.locator('[data-testid="staging-area"] .card')).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(700);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    const moreImportantZone = page.locator('[data-testid="more-important-pile"]');
    const lessImportantZone = page.locator('[data-testid="less-important-pile"]');
    
    await stagingCard.dragTo(moreImportantZone);
    await page.waitForTimeout(300);
    
    // Verify card is in more important pile
    await expect(moreImportantZone.locator('.card')).toHaveCount(1);
    
    // Now move it to less important pile
    const cardInPile = moreImportantZone.locator('.card').first();
    await cardInPile.dragTo(lessImportantZone);
    await page.waitForTimeout(300);
    
    // Verify card moved
    await expect(moreImportantZone.locator('.card')).toHaveCount(0);
    await expect(lessImportantZone.locator('.card')).toHaveCount(1);
  });

  test('should handle multiple cards in the same pile', async () => {
    // Add multiple cards to the same pile
    for (let i = 0; i < 3; i++) {
      if (i === 0) {
        // First card: manually flip from deck
        await page.locator('[data-testid="deck"]').click();
      } else {
        // Subsequent cards: wait for auto-flip (happens 300ms after previous card is placed)
        await page.waitForTimeout(100); // Small buffer for auto-flip to trigger
      }
      
      // Wait for card to appear and flip animation to complete
      await expect(page.locator('[data-testid="staging-area"] .card')).toBeVisible({ timeout: 3000 });
      await page.waitForTimeout(700);
      
      // Move to more important pile
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      const moreImportantZone = page.locator('[data-testid="more-important-pile"]');
      await stagingCard.dragTo(moreImportantZone);
      await page.waitForTimeout(400); // Wait for drop animation + auto-flip delay (300ms)
    }
    
    // Verify all cards are in the pile
    const moreImportantZone = page.locator('[data-testid="more-important-pile"]');
    await expect(moreImportantZone.locator('.card')).toHaveCount(3);
    
    // Verify cards are visually arranged (not overlapping completely)
    const cards = moreImportantZone.locator('.card');
    const firstCard = cards.nth(0);
    const secondCard = cards.nth(1);
    
    const firstCardBox = await firstCard.boundingBox();
    const secondCardBox = await secondCard.boundingBox();
    
    // Cards should have different positions (offset stacking)
    expect(firstCardBox?.x !== secondCardBox?.x || firstCardBox?.y !== secondCardBox?.y).toBeTruthy();
  });

  test('should cancel drag when ESC is pressed', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"]').click();
    // Wait for card to appear and flip animation to complete
    await expect(page.locator('[data-testid="staging-area"] .card')).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(700);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    
    // Start drag operation
    await stagingCard.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100); // Move away from original position
    
    // Press ESC to cancel
    await page.keyboard.press('Escape');
    
    // Card should return to staging area (ESC cancels drag)
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
    
    // Drop zones should remain empty
    const moreImportantZone = page.locator('[data-testid="more-important-pile"]');
    const lessImportantZone = page.locator('[data-testid="less-important-pile"]');
    await expect(moreImportantZone.locator('.card')).toHaveCount(0);
    await expect(lessImportantZone.locator('.card')).toHaveCount(0);
  });

  test('should maintain correct z-index during drag', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"]').click();
    // Wait for card to appear and flip animation to complete
    await expect(page.locator('[data-testid="staging-area"] .card')).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(700);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    
    // Start drag operation
    await stagingCard.hover();
    await page.mouse.down();
    
    // Check that dragged card has high z-index (the draggable wrapper should have z-index)
    const draggableParent = stagingCard.locator('..');
    const parentStyle = await draggableParent.getAttribute('style');
    expect(parentStyle).toMatch(/z-index|opacity/);
    
    await page.mouse.up();
  });

  test('should show drag start visual feedback', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"]').click();
    // Wait for card to appear and flip animation to complete
    await expect(page.locator('[data-testid="staging-area"] .card')).toBeVisible({ timeout: 3000 });
    await page.waitForTimeout(700);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    
    // Verify card is visible and interactive
    await expect(stagingCard).toBeVisible();
    
    // Start drag operation to test visual feedback
    await stagingCard.hover();
    await page.mouse.down();
    await page.waitForTimeout(100);
    
    // Check for drag styling - look for card-drag-start class or scale effects
    const dragClasses = await stagingCard.getAttribute('class');
    expect(dragClasses).toMatch(/card-drag-start|touch-drag-handle/);
    
    await page.mouse.up();
  });
});