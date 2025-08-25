import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  // Selectors
  private selectors = {
    nameInput: '[data-testid="name-input"]',
    sessionCodeInput: '[data-testid="session-code-input"]',
    submitButton: '[data-testid="submit-button"]',
    errorMessage: '[data-testid="error-message"]',
    generateCodeButton: '[data-testid="generate-code-button"]',
  };

  // Actions
  async goto() {
    await this.page.goto('/');
  }

  async fillName(name: string) {
    await this.page.locator(this.selectors.nameInput).fill(name);
  }

  async fillSessionCode(code: string) {
    await this.page.locator(this.selectors.sessionCodeInput).fill(code);
  }

  async clickSubmit() {
    await this.page.click(this.selectors.submitButton);
  }

  async waitForFormSubmissionStart() {
    // Wait for loading state to begin by checking if button is disabled
    await expect(this.page.locator(this.selectors.submitButton)).toBeDisabled({ timeout: 2000 });
  }

  async waitForFormSubmissionComplete() {
    // Wait for loading state to end (button re-enabled or page navigation)
    await Promise.race([
      // Button becomes enabled again (error case) 
      expect(this.page.locator(this.selectors.submitButton)).toBeEnabled({ timeout: 8000 }),
      // Page navigates away (success case)
      this.page.waitForURL('**/canvas**', { timeout: 8000 })
    ]).catch(() => {
      // Either condition met or timeout - we'll verify the result afterwards
    });
  }

  async clickGenerateCode() {
    await this.page.click(this.selectors.generateCodeButton);
  }

  async submitForm(name: string, sessionCode: string) {
    await this.fillName(name);
    await this.fillSessionCode(sessionCode);
    await this.clickSubmit();
    
    // Wait for submission to start (button becomes disabled)
    await this.waitForFormSubmissionStart();
  }

  async submitFormAndWaitForCompletion(name: string, sessionCode: string) {
    await this.submitForm(name, sessionCode);
    
    // Wait for submission to complete
    await this.waitForFormSubmissionComplete();
  }

  // Assertions
  async expectPageLoaded() {
    await expect(this.page).toHaveTitle(/Leadership Values/);
    await expect(this.page.locator('text=Welcome to Leadership Values')).toBeVisible();
  }

  async expectFormElementsVisible() {
    await expect(this.page.locator(this.selectors.nameInput)).toBeVisible();
    await expect(this.page.locator(this.selectors.sessionCodeInput)).toBeVisible();
    await expect(this.page.locator(this.selectors.submitButton)).toBeVisible();
  }

  async expectErrorMessage() {
    await expect(this.page.locator(this.selectors.errorMessage)).toBeVisible();
  }

  async expectSuccessNavigation() {
    await expect(this.page).toHaveURL(/\/canvas/);
  }

  async expectFormSubmissionResult() {
    // Wait for either navigation to canvas OR error message to appear
    await Promise.race([
      // Wait for navigation to canvas
      this.page.waitForURL('**/canvas**', { timeout: 8000 }),
      // OR wait for error message to appear
      this.page.locator(this.selectors.errorMessage).waitFor({ state: 'visible', timeout: 8000 })
    ]).catch(() => {
      // If both timeout, that's also a valid test result - we'll check below
    });
    
    // Now check the actual result
    const currentUrl = this.page.url();
    const hasCanvas = currentUrl.includes('/canvas');
    const hasError = await this.page.locator(this.selectors.errorMessage).isVisible();
    
    expect(hasCanvas || hasError).toBe(true);
  }

  async expectSuccessfulNavigation() {
    // Wait specifically for successful navigation to canvas
    await this.page.waitForURL('**/canvas**', { timeout: 8000 });
    await expect(this.page).toHaveURL(/\/canvas/);
  }

  async expectErrorShown() {
    // Wait specifically for error message to appear
    await this.page.locator(this.selectors.errorMessage).waitFor({ state: 'visible', timeout: 8000 });
    await this.expectErrorMessage();
  }
}