import { test, expect } from '@playwright/test';

/**
 * Quick smoke test to verify E2E setup works
 */

test.describe('Quick Smoke Test', () => {
  test('should load homepage and show login form', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/Leadership Values/);
    
    // Check that login form elements are present
    await expect(page.locator('text=Welcome to Leadership Values')).toBeVisible();
    await expect(page.locator('text=Your Name')).toBeVisible();
    await expect(page.locator('text=Session Code')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should fill form and attempt submission', async ({ page }) => {
    await page.goto('/');
    
    // Find inputs by label text instead of name attribute
    await page.getByLabel('Your Name:').fill('Test User');
    await page.getByLabel('Session Code:').fill('TEST01');
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Should navigate or show some response
    await page.waitForTimeout(2000);
    
    // Check that we either navigated to canvas or have some feedback
    const currentUrl = page.url();
    const hasCanvas = currentUrl.includes('/canvas');
    const hasError = await page.locator('text=/error|Error/').isVisible();
    
    // One of these should be true (either success navigation or error feedback)
    expect(hasCanvas || hasError).toBe(true);
  });
});