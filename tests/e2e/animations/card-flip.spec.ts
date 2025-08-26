/**
 * E2E tests for card flip animations
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Card Flip Animations', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/canvas');
    await page.waitForLoadState('networkidle');
  });

  test('should animate card flip from back to front on click', async () => {
    // Find a face-down card in the deck
    const deckCard = page.locator('[data-testid="deck-card"]').first();
    await expect(deckCard).toBeVisible();
    
    // Verify initial state (back side showing)
    const cardBack = deckCard.locator('[data-testid="card-back"]');
    await expect(cardBack).toBeVisible();
    
    // Click the card to trigger flip
    await deckCard.click();
    
    // Wait for animation to start (card should begin rotating)
    await page.waitForTimeout(50); // Small delay to catch animation start
    
    // Verify animation is happening by checking transform style
    const cardElement = deckCard.locator('[data-testid="card"]');
    const transform = await cardElement.evaluate(el => getComputedStyle(el).transform);
    
    // During animation, transform should not be 'none'
    expect(transform).not.toBe('none');
    
    // Wait for flip animation to complete (250ms + buffer)
    await page.waitForTimeout(400);
    
    // Verify final state (front side showing)
    const cardFront = deckCard.locator('[data-testid="card-front"]');
    await expect(cardFront).toBeVisible();
    await expect(cardBack).toBeHidden();
    
    // Verify card moved to staging position
    const stagingArea = page.locator('[data-testid="staging-area"]');
    const cardInStaging = stagingArea.locator('[data-testid="card"]');
    await expect(cardInStaging).toBeVisible();
  });

  test('should respect reduced motion preferences', async () => {
    // Enable reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    // Find a face-down card
    const deckCard = page.locator('[data-testid="deck-card"]').first();
    await expect(deckCard).toBeVisible();
    
    // Click to trigger flip
    await deckCard.click();
    
    // With reduced motion, animation should complete immediately
    await page.waitForTimeout(50);
    
    // Card should be flipped without animation duration
    const cardFront = deckCard.locator('[data-testid="card-front"]');
    await expect(cardFront).toBeVisible();
  });

  test('should handle multiple rapid clicks gracefully', async () => {
    const deckCards = page.locator('[data-testid="deck-card"]');
    const cardCount = await deckCards.count();
    
    // Click multiple cards rapidly
    for (let i = 0; i < Math.min(5, cardCount); i++) {
      await deckCards.nth(i).click();
      await page.waitForTimeout(10); // Very small delay between clicks
    }
    
    // Wait for all animations to complete
    await page.waitForTimeout(1000);
    
    // Verify all clicked cards are now in staging
    const stagingCards = page.locator('[data-testid="staging-area"] [data-testid="card"]');
    const stagingCount = await stagingCards.count();
    
    expect(stagingCount).toBe(Math.min(5, cardCount));
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
    const deckCards = page.locator('[data-testid="deck-card"]');
    for (let i = 0; i < 3; i++) {
      await deckCards.nth(i).click();
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
    const deckCard = page.locator('[data-testid="deck-card"]').first();
    await expect(deckCard).toBeVisible();
    
    // Get initial position and shadow
    const initialBox = await deckCard.boundingBox();
    const initialShadow = await deckCard.evaluate(el => getComputedStyle(el).boxShadow);
    
    // Hover over card
    await deckCard.hover();
    await page.waitForTimeout(200); // Wait for hover animation
    
    // Check that card has moved up (y position decreased)
    const hoveredBox = await deckCard.boundingBox();
    expect(hoveredBox!.y).toBeLessThan(initialBox!.y);
    
    // Check that shadow has increased (different box-shadow)
    const hoveredShadow = await deckCard.evaluate(el => getComputedStyle(el).boxShadow);
    expect(hoveredShadow).not.toBe(initialShadow);
    
    // Move mouse away
    await page.mouse.move(0, 0);
    await page.waitForTimeout(200);
    
    // Card should return to original position
    const finalBox = await deckCard.boundingBox();
    expect(finalBox!.y).toBeCloseTo(initialBox!.y, 1);
  });

  test('should handle animation interruption gracefully', async () => {
    const deckCard = page.locator('[data-testid="deck-card"]').first();
    
    // Start flip animation
    await deckCard.click();
    
    // Immediately try to navigate away (interrupt animation)
    await page.goto('/');
    
    // Should not throw errors or hang
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/');
    
    // Go back and verify state
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    // Application should still be functional
    const newDeckCard = page.locator('[data-testid="deck-card"]').first();
    await expect(newDeckCard).toBeVisible();
    await newDeckCard.click();
    
    // Should still be able to flip cards
    await page.waitForTimeout(400);
    const cardFront = page.locator('[data-testid="staging-area"] [data-testid="card-front"]');
    await expect(cardFront).toBeVisible();
  });

  test('should work across different browsers', async () => {
    // This test will run on all configured browsers in playwright.config.ts
    const deckCard = page.locator('[data-testid="deck-card"]').first();
    
    // Basic flip functionality should work consistently
    await deckCard.click();
    await page.waitForTimeout(400);
    
    const stagingCard = page.locator('[data-testid="staging-area"] [data-testid="card"]');
    await expect(stagingCard).toBeVisible();
    
    // Animation timing should be consistent (within reasonable bounds)
    const animationDuration = await page.evaluate(async () => {
      const card = document.querySelector('[data-testid="deck-card"]') as HTMLElement;
      if (!card) return 0;
      
      const startTime = performance.now();
      card.click();
      
      return new Promise(resolve => {
        const checkAnimation = () => {
          const transform = getComputedStyle(card).transform;
          if (transform !== 'none' && transform !== 'matrix(1, 0, 0, 1, 0, 0)') {
            setTimeout(() => {
              const finalTransform = getComputedStyle(card).transform;
              if (finalTransform === 'none' || finalTransform === 'matrix(1, 0, 0, 1, 0, 0)') {
                resolve(performance.now() - startTime);
              } else {
                checkAnimation();
              }
            }, 50);
          } else {
            setTimeout(checkAnimation, 10);
          }
        };
        checkAnimation();
      });
    });
    
    // Animation should complete within expected timeframe (250ms + tolerance)
    expect(animationDuration).toBeGreaterThan(200);
    expect(animationDuration).toBeLessThan(500);
  });
});

test.describe('Card Animation Accessibility', () => {
  test('should announce state changes to screen readers', async ({ page }) => {
    await page.goto('/canvas');
    
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
    
    const deckCard = page.locator('[data-testid="deck-card"]').first();
    await deckCard.click();
    
    await page.waitForTimeout(500);
    
    // Check for accessibility announcements
    const announcements = await page.evaluate(() => (window as any).screenReaderAnnouncements);
    expect(announcements.length).toBeGreaterThan(0);
  });

  test('should maintain focus during animations', async ({ page }) => {
    await page.goto('/canvas');
    
    const deckCard = page.locator('[data-testid="deck-card"]').first();
    await deckCard.focus();
    
    // Verify focus is on the card
    let focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focusedElement).toBe('deck-card');
    
    // Trigger animation
    await deckCard.click();
    
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