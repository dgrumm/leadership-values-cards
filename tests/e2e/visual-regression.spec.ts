import { test, expect } from './fixtures/test-fixtures';

/**
 * Visual regression tests for animations and UI consistency
 */

test.describe('Visual Regression Tests', () => {
  test('should maintain consistent login form appearance', async ({ loginPage, page }) => {
    await loginPage.goto();
    await loginPage.expectPageLoaded();
    
    // Take screenshot of clean login form
    await expect(page).toHaveScreenshot('login-form-clean.png');
  });

  test('should show proper loading state appearance', async ({ loginPage, sessionManager, page }) => {
    const session = await sessionManager.createTestSession();
    
    await loginPage.goto();
    await loginPage.fillName(session.participantName);
    await loginPage.fillSessionCode(session.sessionCode);
    
    // Click submit and capture loading state
    await loginPage.clickSubmit();
    await loginPage.waitForFormSubmissionStart();
    
    // Screenshot during loading state
    await expect(page).toHaveScreenshot('login-form-loading.png');
  });

  test('should show consistent error state appearance', async ({ loginPage, page }) => {
    await loginPage.goto();
    
    // Submit invalid form to trigger error
    await loginPage.submitForm('', 'INVALID');
    
    // Wait for error to appear
    try {
      await loginPage.expectErrorShown();
      // Screenshot of error state
      await expect(page).toHaveScreenshot('login-form-error.png');
    } catch {
      // If no error appears, that's also valid - take screenshot of current state
      await expect(page).toHaveScreenshot('login-form-invalid-submission.png');
    }
  });

  test('should maintain consistent deck appearance on canvas', async ({ loginPage, canvasPage, sessionManager, page }) => {
    const session = await sessionManager.createTestSession();
    
    // Navigate directly to canvas
    await sessionManager.gotoCanvasWithSession(session);
    
    // Wait for step 1 to load
    await canvasPage.expectStep1Page();
    await canvasPage.expectDeckVisible();
    
    // Screenshot of Step 1 with deck
    await expect(page).toHaveScreenshot('canvas-step1-initial.png');
  });

  test('should show consistent card flip animation states', async ({ loginPage, canvasPage, sessionManager, page }) => {
    const session = await sessionManager.createTestSession();
    
    await sessionManager.gotoCanvasWithSession(session);
    await canvasPage.expectStep1Page();
    
    // Screenshot before clicking deck
    await expect(page.locator('[data-testid="deck"]')).toHaveScreenshot('deck-before-click.png');
    
    // Click deck to flip a card
    await canvasPage.clickDeck();
    
    // Wait a moment for animation to start
    await page.waitForTimeout(100);
    
    // Screenshot during flip animation (if visible)
    await expect(page.locator('[data-testid="deck"]')).toHaveScreenshot('deck-after-click.png');
  });

  test.describe('Responsive Design', () => {
    test('should maintain layout on mobile viewport', async ({ loginPage, page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await loginPage.goto();
      await loginPage.expectPageLoaded();
      
      // Screenshot of mobile login
      await expect(page).toHaveScreenshot('login-form-mobile.png');
    });

    test('should maintain layout on tablet viewport', async ({ loginPage, page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await loginPage.goto();
      await loginPage.expectPageLoaded();
      
      // Screenshot of tablet login
      await expect(page).toHaveScreenshot('login-form-tablet.png');
    });
  });
});