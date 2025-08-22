import { test, expect, type Page, type Locator } from '@playwright/test';

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
    const modalCloseButton = page.locator('button:has-text("Start Sorting")');
    if (await modalCloseButton.isVisible()) {
      await modalCloseButton.click();
    }
    
    // Wait for the step to be ready
    await expect(page.locator('[data-testid="step1-page"], .step-1-container, h1:has-text("Step 1")')).toBeVisible();
  });

  test('should display initial deck and empty drop zones', async () => {
    // Verify deck is present
    await expect(page.locator('[data-testid="deck"], .deck-container')).toBeVisible();
    
    // Verify drop zones are present and empty
    await expect(page.locator('[data-pile="more"], [data-testid="more-important-pile"]')).toBeVisible();
    await expect(page.locator('[data-pile="less"], [data-testid="less-important-pile"]')).toBeVisible();
    
    // Verify staging area is visible
    await expect(page.locator('[data-testid="staging-area"], .staging-area')).toBeVisible();
  });

  test('should flip card from deck to staging area', async () => {
    // Find and click the deck to flip a card
    const deck = page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")');
    await deck.click();
    
    // Wait for card to appear in staging area
    await expect(page.locator('[data-testid="staging-area"] .card, .staging-area .card')).toBeVisible({ timeout: 2000 });
    
    // Verify card is flipped (shows content, not back)
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    await expect(stagingCard).not.toContainText('?'); // Card back shows '?'
  });

  test('should drag card from staging to more important pile', async () => {
    // Flip a card first
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500); // Wait for flip animation
    
    // Get the staging card
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    await expect(stagingCard).toBeVisible();
    
    // Get the more important drop zone
    const moreImportantZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
    await expect(moreImportantZone).toBeVisible();
    
    // Perform drag and drop
    await stagingCard.dragTo(moreImportantZone);
    
    // Wait for drop animation to complete
    await page.waitForTimeout(300);
    
    // Verify card moved to more important pile
    await expect(moreImportantZone.locator('.card')).toHaveCount(1);
    
    // Verify staging area is empty
    await expect(page.locator('[data-testid="staging-area"] .card, .staging-area .card')).toHaveCount(0);
  });

  test('should drag card from staging to less important pile', async () => {
    // Flip a card first
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    await expect(stagingCard).toBeVisible();
    
    const lessImportantZone = page.locator('[data-pile="less"], [data-testid="less-important-pile"]');
    await expect(lessImportantZone).toBeVisible();
    
    // Perform drag and drop
    await stagingCard.dragTo(lessImportantZone);
    await page.waitForTimeout(300);
    
    // Verify card moved to less important pile
    await expect(lessImportantZone.locator('.card')).toHaveCount(1);
    await expect(page.locator('[data-testid="staging-area"] .card, .staging-area .card')).toHaveCount(0);
  });

  test('should show visual feedback during drag operations', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    const moreImportantZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
    
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
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    const moreImportantZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
    const lessImportantZone = page.locator('[data-pile="less"], [data-testid="less-important-pile"]');
    
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
      // Flip a card
      await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
      await page.waitForTimeout(500);
      
      // Move to more important pile
      const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
      const moreImportantZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
      await stagingCard.dragTo(moreImportantZone);
      await page.waitForTimeout(300);
    }
    
    // Verify all cards are in the pile
    await expect(page.locator('[data-pile="more"] .card, [data-testid="more-important-pile"] .card')).toHaveCount(3);
    
    // Verify cards are visually arranged (not overlapping completely)
    const cards = page.locator('[data-pile="more"] .card, [data-testid="more-important-pile"] .card');
    const firstCard = cards.nth(0);
    const secondCard = cards.nth(1);
    
    const firstCardBox = await firstCard.boundingBox();
    const secondCardBox = await secondCard.boundingBox();
    
    // Cards should have different positions (offset stacking)
    expect(firstCardBox?.x !== secondCardBox?.x || firstCardBox?.y !== secondCardBox?.y).toBeTruthy();
  });

  test('should cancel drag when ESC is pressed', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    
    // Start drag operation
    await stagingCard.hover();
    await page.mouse.down();
    await page.mouse.move(100, 100); // Move away from original position
    
    // Press ESC to cancel
    await page.keyboard.press('Escape');
    
    // Card should return to staging area
    await expect(page.locator('[data-testid="staging-area"] .card, .staging-area .card')).toHaveCount(1);
    
    // Drop zones should remain empty
    await expect(page.locator('[data-pile="more"] .card')).toHaveCount(0);
    await expect(page.locator('[data-pile="less"] .card')).toHaveCount(0);
  });

  test('should maintain correct z-index during drag', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    
    // Start drag operation
    await stagingCard.hover();
    await page.mouse.down();
    
    // Check that dragged card has high z-index
    const cardStyle = await stagingCard.getAttribute('style');
    expect(cardStyle).toMatch(/z-index:\s*9999|z-index:\s*1000/);
    
    await page.mouse.up();
  });

  test('should show drag start visual feedback', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card, .staging-area .card').first();
    
    // Get initial state
    const initialClasses = await stagingCard.getAttribute('class');
    
    // Start drag
    await stagingCard.hover();
    await page.mouse.down();
    await page.waitForTimeout(100);
    
    // Check for drag start styling
    const dragClasses = await stagingCard.getAttribute('class');
    expect(dragClasses).toMatch(/card-drag-start|scale-105|shadow/);
    
    await page.mouse.up();
  });
});