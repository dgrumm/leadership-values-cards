import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage';

/**
 * Quick smoke test to verify E2E setup works
 */

test.describe('Quick Smoke Test', () => {
  test('should load homepage and show login form', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    // Navigate to homepage
    await loginPage.goto();
    
    // Check that the page loads with login form
    await loginPage.expectPageLoaded();
    await loginPage.expectFormElementsVisible();
  });

  test('should fill form and attempt submission', async ({ page }) => {
    const loginPage = new LoginPage(page);
    
    await loginPage.goto();
    
    // Submit form with test data
    await loginPage.submitForm('Test User', 'TEST01');
    
    // Should navigate or show some response
    await page.waitForTimeout(2000);
    
    // Verify we get appropriate feedback
    await loginPage.expectFormSubmissionResult();
  });
});