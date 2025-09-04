/**
 * E2E tests for card flip animations
 */

import { test, expect, Page } from '@playwright/test';
import { setupTestSession } from '../helpers/test-sessions';

test.describe('Card Flip Animations', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await setupTestSession(page, 'Animation_User');
    await page.waitForLoadState('networkidle');
  });

  test('should animate card flip from back to front on click', async () => {
    // Find the deck and click it to flip a card
    const deck = page.locator('[data-testid="deck"]');
    await expect(deck).toBeVisible();
    
    // Click the deck to trigger flip animation
    await deck.click();
    
    // Wait for card to appear in staging area (includes flip animation)
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    await expect(stagingCard).toBeVisible({ timeout: 3000 });
    
    // Wait for flip animation to complete
    await page.waitForTimeout(700); // Flip animation is 0.5-0.7s
    
    // Verify final state (card shows content, not back)
    await expect(stagingCard).not.toContainText('?'); // Card back shows '?'
    
    // Verify card is properly positioned in staging area
    await expect(stagingCard).toBeVisible();
  });

  test('should respect reduced motion preferences', async () => {
    // Enable reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Find the deck and click it
    const deck = page.locator('[data-testid="deck"]');
    await expect(deck).toBeVisible();
    
    // Click to trigger flip
    await deck.click();
    
    // With reduced motion, animation should complete immediately
    const stagingCard = page.locator('[data-testid="staging-area"] .card').first();
    await expect(stagingCard).toBeVisible({ timeout: 1000 });
    
    // Card should be flipped without long animation duration
    await expect(stagingCard).not.toContainText('?');
  });

  test('should handle multiple rapid clicks gracefully', async () => {
    const deck = page.locator('[data-testid="deck"]');
    await expect(deck).toBeVisible();
    
    // Click deck multiple times rapidly to flip multiple cards
    for (let i = 0; i < 5; i++) {
      await deck.click();
      await page.waitForTimeout(10); // Very small delay between clicks
    }
    
    // Wait for all animations to complete
    await page.waitForTimeout(1500);
    
    // Verify staging area has cards (at least 1, due to auto-flip behavior)
    const stagingCards = page.locator('[data-testid="staging-area"] .card');
    const stagingCount = await stagingCards.count();
    
    expect(stagingCount).toBeGreaterThan(0);
  });

  test('should maintain 60fps during flip animations', async () => {
    // Start performance monitoring
    const performanceEntries: PerformanceEntry[] = [];
    
    await page.evaluate(() => {
      // Monitor frame rate during animation
      (window as any).frameRateMonitor = [];
      let lastTime = performance.now();
      
      function measureFrameRate() {
        const now = performance.now();
        const frameTime = now - lastTime;
        const fps = 1000 / frameTime;
        (window as any).frameRateMonitor.push(fps);
        lastTime = now;
        
        if ((window as any).frameRateMonitor.length < 60) {
          requestAnimationFrame(measureFrameRate);
        }
      }
      
      requestAnimationFrame(measureFrameRate);
    });
    
    // Trigger multiple animations
    const deck = page.locator('[data-testid="deck"]');
    for (let i = 0; i < 3; i++) {
      await deck.click();
      await page.waitForTimeout(100);
    }
    
    // Wait for monitoring to complete
    await page.waitForTimeout(1500);
    
    // Get frame rate measurements
    const frameRates = await page.evaluate(() => (window as any).frameRateMonitor);
    
    // Calculate average frame rate
    const avgFrameRate = frameRates.reduce((sum: number, fps: number) => sum + fps, 0) / frameRates.length;
    
    // Should maintain close to 60fps (allow for some variance)
    expect(avgFrameRate).toBeGreaterThan(50);
  });

  test('should show visual feedback during hover', async () => {
    const deck = page.locator('[data-testid="deck"]');
    await expect(deck).toBeVisible();
    
    // Get initial position and shadow
    const initialBox = await deck.boundingBox();
    const initialShadow = await deck.evaluate(el => getComputedStyle(el).boxShadow);
    
    // Hover over deck
    await deck.hover();
    await page.waitForTimeout(200); // Wait for hover animation
    
    // Check that deck has moved up (y position decreased)
    const hoveredBox = await deck.boundingBox();
    expect(hoveredBox!.y).toBeLessThan(initialBox!.y);
    
    // Check that shadow has increased (different box-shadow)
    const hoveredShadow = await deck.evaluate(el => getComputedStyle(el).boxShadow);
    expect(hoveredShadow).not.toBe(initialShadow);
    
    // Move mouse away
    await page.mouse.move(0, 0);
    await page.waitForTimeout(200);
    
    // Deck should return to original position
    const finalBox = await deck.boundingBox();
    expect(finalBox!.y).toBeCloseTo(initialBox!.y, 1);
  });

  test('should handle animation interruption gracefully', async () => {
    const deck = page.locator('[data-testid="deck"]');
    await expect(deck).toBeVisible();
    
    // Start flip animation
    await deck.click();
    
    // Immediately try to navigate away (interrupt animation)
    await page.goto('/');
    
    // Should not throw errors or hang
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/');
    
    // Go back and verify state
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    // Application should still be functional
    const newDeck = page.locator('[data-testid="deck"]');
    await expect(newDeck).toBeVisible();
    await newDeck.click();
    
    // Should still be able to flip cards
    await page.waitForTimeout(700);
    const stagingCard = page.locator('[data-testid="staging-area"] .card');
    await expect(stagingCard).toBeVisible();
  });

  test('should work across different browsers', async () => {
    // This test will run on all configured browsers in playwright.config.ts
    const deck = page.locator('[data-testid="deck"]');
    await expect(deck).toBeVisible();
    
    // Basic flip functionality should work consistently
    await deck.click();
    await page.waitForTimeout(700); // Wait for flip animation
    
    const stagingCard = page.locator('[data-testid="staging-area"] .card');
    await expect(stagingCard).toBeVisible();
    
    // Verify card is properly flipped (shows content)
    await expect(stagingCard).not.toContainText('?'); // Card back shows '?'
  });
});

test.describe('Card Animation Accessibility', () => {
  test('should announce state changes to screen readers', async ({ page }) => {
    await setupTestSession(page, 'Accessibility_User');
    
    // Enable screen reader simulation
    await page.evaluate(() => {
      // Mock screen reader announcements
      (window as any).screenReaderAnnouncements = [];
      
      // Override aria-live regions
      document.addEventListener('DOMSubtreeModified', (event) => {
        const target = event.target as HTMLElement;
        if (target.getAttribute && target.getAttribute('aria-live')) {
          (window as any).screenReaderAnnouncements.push(target.textContent);
        }
      });
    });
    
    const deck = page.locator('[data-testid="deck"]');
    await deck.click();
    
    await page.waitForTimeout(500);
    
    // Check for accessibility announcements
    const announcements = await page.evaluate(() => (window as any).screenReaderAnnouncements);
    expect(announcements.length).toBeGreaterThan(0);
  });

  test('should maintain focus during animations', async ({ page }) => {
    await setupTestSession(page, 'Focus_Test_User');
    
    const deck = page.locator('[data-testid="deck"]');
    await deck.focus();
    
    // Verify focus is on the deck
    let focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focusedElement).toBe('deck');
    
    // Trigger animation
    await deck.click();
    
    // During animation, focus should be maintained or transferred appropriately
    await page.waitForTimeout(150); // Mid-animation
    
    focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focusedElement).toBeTruthy(); // Should still have focus somewhere
    
    // After animation completes
    await page.waitForTimeout(300);
    
    // Focus should be on the moved card or appropriate next element
    const focusedCard = page.locator(':focus');
    await expect(focusedCard).toBeVisible();
  });
});