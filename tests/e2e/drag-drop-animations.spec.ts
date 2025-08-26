import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for drag-and-drop visual feedback and animations
 * Tests animation timing, visual states, and performance requirements
 */

test.describe('Drag and Drop Animations and Visual Feedback', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to home and create session
    await page.goto('/');
    await page.fill('input[name="name"]', 'Animation User');
    await page.fill('input[name="sessionCode"]', 'ANIM01');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/canvas/);
    
    // Close Step 1 modal
    const modalCloseButton = page.locator('button:has-text("Got it!")');
    if (await modalCloseButton.isVisible()) {
      await modalCloseButton.click();
      // Wait for modal close animation to complete
      await expect(modalCloseButton).not.toBeVisible();
      await page.waitForTimeout(300);
    }
    
    await expect(page.locator('[data-testid="step1-page"], .step-1-container, h1:has-text("Step 1")')).toBeVisible();
  });

  test('should show card flip animation from deck to staging', async () => {
    const stagingArea = page.locator('[data-testid="staging-area"], .staging-area');
    
    // Verify staging is empty initially
    await expect(stagingArea.locator('.card')).toHaveCount(0);
    
    // Start timing the flip animation
    const startTime = Date.now();
    
    // Flip a card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    
    // Wait for card to appear with animation
    await expect(stagingArea.locator('.card')).toBeVisible({ timeout: 2000 });
    
    const endTime = Date.now();
    const animationDuration = endTime - startTime;
    
    // Animation should complete within reasonable time (per spec: 200-500ms)
    expect(animationDuration).toBeLessThan(1000);
    
    // Verify card is fully visible and interactive
    const stagingCard = stagingArea.locator('.card').first();
    await expect(stagingCard).toHaveCSS('opacity', '1');
  });

  test('should show drag start visual feedback', async () => {
    // Flip a card first
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    
    // Get initial state
    const initialTransform = await stagingCard.evaluate(el => window.getComputedStyle(el).transform);
    const initialShadow = await stagingCard.evaluate(el => window.getComputedStyle(el).boxShadow);
    
    // Start drag operation
    await stagingCard.hover();
    await page.mouse.down();
    await page.waitForTimeout(100); // Wait for drag start animation
    
    // Check for scale transformation (should be scale(1.05) per spec)
    const dragTransform = await stagingCard.evaluate(el => window.getComputedStyle(el).transform);
    expect(dragTransform).not.toBe(initialTransform);
    expect(dragTransform).toMatch(/matrix.*1\.05|scale.*1\.05/);
    
    // Check for enhanced shadow
    const dragShadow = await stagingCard.evaluate(el => window.getComputedStyle(el).boxShadow);
    expect(dragShadow).not.toBe(initialShadow);
    expect(dragShadow).toMatch(/rgba.*0\.2/); // Should have enhanced shadow
    
    await page.mouse.up();
  });

  test('should show drop zone highlighting during drag hover', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    const moreZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
    
    // Get initial drop zone styling
    const initialBorder = await moreZone.evaluate(el => window.getComputedStyle(el).borderColor);
    const initialBackground = await moreZone.evaluate(el => window.getComputedStyle(el).backgroundColor);
    
    // Start drag
    await stagingCard.hover();
    await page.mouse.down();
    
    // Move over drop zone
    await moreZone.hover();
    await page.waitForTimeout(100); // Wait for highlight animation
    
    // Check for highlight styling
    const highlightBorder = await moreZone.evaluate(el => window.getComputedStyle(el).borderColor);
    const highlightBackground = await moreZone.evaluate(el => window.getComputedStyle(el).backgroundColor);
    
    // Border and background should change to indicate valid drop
    expect(highlightBorder).not.toBe(initialBorder);
    expect(highlightBackground).not.toBe(initialBackground);
    
    // Should match blue highlight color (per spec: #4A90E2)
    expect(highlightBorder).toMatch(/rgb\(74, 144, 226\)|#4a90e2/i);
    
    await page.mouse.up();
  });

  test('should show snap animation when card is dropped', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"], .deck-container, button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    const lessZone = page.locator('[data-pile="less"], [data-testid="less-important-pile"]');
    
    // Perform drag and drop
    const startTime = Date.now();
    
    await stagingCard.hover();
    await page.mouse.down();
    await lessZone.hover();
    await page.mouse.up();
    
    // Wait for snap animation to complete (spec: 200ms ease-out)
    await page.waitForTimeout(300);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Verify card moved to pile
    await expect(lessZone.locator('.card')).toHaveCount(1);
    
    // Animation should complete within reasonable time
    expect(totalTime).toBeLessThan(800);
    
    // Card should be in final position with proper opacity
    const movedCard = lessZone.locator('.card').first();
    await expect(movedCard).toHaveCSS('opacity', '1');
  });

  test('should show invalid drop feedback for pile constraints', async () => {
    // Navigate to Step 2 to test pile limits
    // Complete Step 1 first
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
    
    // Fill Top 8 pile to capacity
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(100);
    }
    
    // Try to add 9th card and check invalid feedback
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    
    // Start drag over full pile
    await stagingCard.hover();
    await page.mouse.down();
    await top8Zone.hover();
    await page.waitForTimeout(100);
    
    // Check for invalid drop styling (spec: red border #EF4444)
    const invalidBorder = await top8Zone.evaluate(el => window.getComputedStyle(el).borderColor);
    const invalidBackground = await top8Zone.evaluate(el => window.getComputedStyle(el).backgroundColor);
    
    expect(invalidBorder).toMatch(/rgb\(239, 68, 68\)|#ef4444/i);
    expect(invalidBackground).toMatch(/rgba\(239, 68, 68, 0\.1\)/);
    
    await page.mouse.up();
  });

  test('should show bounce animation for rejected drops', async () => {
    // Navigate to Step 2 and fill Top 8 pile
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
    
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(100);
    }
    
    // Try to add 9th card
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    
    const startTime = Date.now();
    await stagingCard.dragTo(top8Zone);
    
    // Wait for bounce animation (spec: 400ms elastic)
    await page.waitForTimeout(500);
    
    const endTime = Date.now();
    const bounceTime = endTime - startTime;
    
    // Bounce animation should complete within reasonable time
    expect(bounceTime).toBeLessThan(1000);
    
    // Card should be back in staging area
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
    await expect(top8Zone.locator('.card')).toHaveCount(8);
  });

  test('should maintain 60fps performance during drag operations', async () => {
    // Add multiple cards to create a complex scene
    const moreZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
    
    for (let i = 0; i < 10; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(moreZone);
      await page.waitForTimeout(100);
    }
    
    // Flip one more card for testing
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    // Start performance monitoring
    await page.evaluate(() => {
      (window as any).performanceStart = performance.now();
      (window as any).frameCount = 0;
      
      function countFrames() {
        (window as any).frameCount++;
        requestAnimationFrame(countFrames);
      }
      requestAnimationFrame(countFrames);
    });
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    const lessZone = page.locator('[data-pile="less"], [data-testid="less-important-pile"]');
    
    // Perform drag operation
    await stagingCard.hover();
    await page.mouse.down();
    
    // Move slowly across the screen to test frame rate
    for (let i = 0; i < 10; i++) {
      await page.mouse.move(100 + i * 20, 100 + i * 20);
      await page.waitForTimeout(50);
    }
    
    await lessZone.hover();
    await page.mouse.up();
    
    // Check frame rate
    const performance = await page.evaluate(() => {
      const duration = performance.now() - (window as any).performanceStart;
      const fps = ((window as any).frameCount / duration) * 1000;
      return { fps, duration };
    });
    
    // Should maintain close to 60fps (allow some margin for test environment)
    expect(performance.fps).toBeGreaterThan(30); // Minimum acceptable
    expect(performance.fps).toBeLessThan(120); // Sanity check
  });

  test('should show proper z-index management during complex drags', async () => {
    // Add cards to multiple piles
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      const targetZone = i % 2 === 0 ? 
        page.locator('[data-pile="more"], [data-testid="more-important-pile"]') :
        page.locator('[data-pile="less"], [data-testid="less-important-pile"]');
      
      await stagingCard.dragTo(targetZone);
      await page.waitForTimeout(100);
    }
    
    // Flip one more card
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    
    // Start drag and check z-index
    await stagingCard.hover();
    await page.mouse.down();
    await page.waitForTimeout(100);
    
    // Dragged card should have highest z-index
    const dragZIndex = await stagingCard.evaluate(el => window.getComputedStyle(el).zIndex);
    expect(parseInt(dragZIndex)).toBeGreaterThanOrEqual(9999);
    
    // Other cards should have lower z-index
    const otherCards = page.locator('.card').filter({ has: page.locator(':not([data-dragging])') });
    const otherZIndex = await otherCards.first().evaluate(el => window.getComputedStyle(el).zIndex);
    expect(parseInt(dragZIndex)).toBeGreaterThan(parseInt(otherZIndex) || 0);
    
    await page.mouse.up();
  });

  test('should handle animation interruption gracefully', async () => {
    // Flip a card
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(500);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    const moreZone = page.locator('[data-pile="more"], [data-testid="more-important-pile"]');
    
    // Start drag animation
    await stagingCard.hover();
    await page.mouse.down();
    await page.waitForTimeout(50); // Start but don't complete drag start animation
    
    // Interrupt with page navigation or refresh
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });
    
    // Complete the drag
    await moreZone.hover();
    await page.mouse.up();
    await page.waitForTimeout(300);
    
    // Card should still move properly despite interruption
    await expect(moreZone.locator('.card')).toHaveCount(1);
  });
});