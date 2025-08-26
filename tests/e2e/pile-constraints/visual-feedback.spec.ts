import { test, expect, type Page } from '@playwright/test';

/**
 * E2E tests for pile constraint visual feedback
 * Tests pile counters, visual states, and bounce animations
 */

test.describe('Pile Constraint Visual Feedback', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to home and create session
    await page.goto('/');
    await page.fill('input[name="name"]', 'Visual Test User');
    await page.fill('input[name="sessionCode"]', 'VISUAL');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/canvas/);
    
    // Close initial modal if present
    const modalCloseButton = page.locator('button:has-text("Got it!"), button:has-text("Start Sorting")');
    if (await modalCloseButton.isVisible()) {
      await modalCloseButton.click();
      await page.waitForTimeout(300);
    }
  });

  test('should show pile counters with correct formatting', async () => {
    // Navigate to Step 2 to see pile counters
    await test.step('Complete Step 1 and navigate to Step 2', async () => {
      // Add 8 cards to more important pile
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

    // Check Top 8 pile counter shows correct format
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    // Add 5 cards to Top 8
    for (let i = 0; i < 5; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(200);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(150);
    }

    // Should show "5/8" counter
    await expect(top8Zone.locator('text=5/8')).toBeVisible({ timeout: 2000 });
    
    // Pile counter component should be present
    const pileCounter = top8Zone.locator('[role="status"]');
    await expect(pileCounter).toBeVisible();
  });

  test('should show visual warning state when approaching limit', async () => {
    await test.step('Navigate to Step 2', async () => {
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
    });
    
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    // Add 7 cards (approaching the 8-card limit)
    for (let i = 0; i < 7; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(150);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(100);
    }

    // Should show warning visual state (orange/yellow styling)
    await expect(top8Zone.locator('text=7/8')).toBeVisible();
    
    // Check for approaching limit indicator
    const approachingIndicator = page.locator('[title="Approaching pile limit"]');
    await expect(approachingIndicator).toBeVisible({ timeout: 1000 });
    
    // Zone should have warning styling
    await expect(top8Zone).toHaveClass(/border-orange|bg-orange/, { timeout: 1000 });
  });

  test('should show error state and bounce animation for constraint violations', async () => {
    await test.step('Navigate to Step 2 and fill Top 8 pile', async () => {
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
    });
    
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    // Fill Top 8 pile completely (8 cards)
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(150);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(100);
    }

    // Should show "8/8" and be at limit
    await expect(top8Zone.locator('text=8/8')).toBeVisible();
    
    // Try to add 9th card - should trigger error state
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    
    // Attempt to drag to full pile
    await stagingCard.dragTo(top8Zone);
    await page.waitForTimeout(500);

    // Card should return to staging (bounce animation)
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
    
    // Top 8 should still have exactly 8 cards
    await expect(top8Zone.locator('.card')).toHaveCount(8);
    
    // Should show error indicator
    const errorIndicator = page.locator('[title="Pile limit exceeded"]');
    await expect(errorIndicator).toBeVisible({ timeout: 1000 });
    
    // Zone should have error styling during violation
    await expect(top8Zone).toHaveClass(/border-red|bg-red/, { timeout: 1000 });
  });

  test('should show valid state when exact requirement is met', async () => {
    await test.step('Navigate to Step 2 and fill Top 8 pile exactly', async () => {
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
    });
    
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    // Add exactly 8 cards
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(150);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(100);
    }

    // Should show "8/8" counter
    await expect(top8Zone.locator('text=8/8')).toBeVisible();
    
    // Should show valid (green) state styling
    await expect(top8Zone).toHaveClass(/border-green|bg-green/, { timeout: 1000 });
    
    // Continue button should be enabled
    const continueButton = page.locator('button:has-text("Continue to Step 3")');
    await expect(continueButton).toBeEnabled({ timeout: 1000 });
  });

  test('should show disabled state for invalid drop zones', async () => {
    await test.step('Navigate to Step 2 and fill Top 8 pile', async () => {
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
    });
    
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    // Fill Top 8 pile completely
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(150);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(100);
    }

    // Top 8 zone should show disabled state (reduced opacity, different cursor)
    await expect(top8Zone).toHaveClass(/opacity-60|pointer-events-none/, { timeout: 1000 });
    
    // Should show visual indication that zone is full
    await expect(top8Zone.locator('text=8/8')).toBeVisible();
    
    // Dragging over disabled zone should not show valid drop indicator
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    await stagingCard.hover();
    await page.mouse.down();
    await top8Zone.hover();
    
    // Should not show valid drop styling (green border)
    await expect(top8Zone).not.toHaveClass(/border-green/, { timeout: 500 });
    
    await page.mouse.up();
  });

  test('should handle rapid constraint violations gracefully', async () => {
    await test.step('Navigate to Step 2', async () => {
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
    });
    
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    // Fill Top 8 pile rapidly
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(100);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(80);
    }
    
    // Rapidly attempt to add more cards
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(80);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(50); // Very fast
    }
    
    // Should maintain correct state despite rapid violations
    await expect(top8Zone.locator('.card')).toHaveCount(8);
    await expect(page.locator('[data-testid="staging-area"] .card')).toHaveCount(1);
    
    // Visual feedback should still work
    await expect(top8Zone.locator('text=8/8')).toBeVisible();
    
    // Error indicator should be visible
    const errorIndicator = page.locator('[title="Pile limit exceeded"]');
    await expect(errorIndicator).toBeVisible({ timeout: 1000 });
  });

  test('should show accessibility announcements for constraint violations', async () => {
    await test.step('Navigate to Step 2 and setup', async () => {
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
    });
    
    const top8Zone = page.locator('[data-pile="top8"], [data-testid="top8-pile"]');
    
    // Fill Top 8 pile
    for (let i = 0; i < 8; i++) {
      await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
      await page.waitForTimeout(150);
      
      const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
      await stagingCard.dragTo(top8Zone);
      await page.waitForTimeout(100);
    }

    // Try to add 9th card
    await page.locator('[data-testid="deck"], button:has-text("Flip Next")').click();
    await page.waitForTimeout(300);
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    await stagingCard.dragTo(top8Zone);
    await page.waitForTimeout(500);

    // Check for accessibility announcements
    const announcementRegion = page.locator('[data-testid="accessibility-announcements"]');
    await expect(announcementRegion).toBeInTheDocument();
    
    // Should have proper ARIA attributes
    await expect(announcementRegion).toHaveAttribute('aria-live');
    
    // Pile counter should have descriptive aria-label
    const pileCounter = top8Zone.locator('[role="status"]');
    await expect(pileCounter).toHaveAttribute('aria-label', 
      /Top 8 pile.*8 cards.*At limit|Over limit/
    );
  });
});