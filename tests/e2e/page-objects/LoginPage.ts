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

  async clickGenerateCode() {
    await this.page.click(this.selectors.generateCodeButton);
  }

  async submitForm(name: string, sessionCode: string) {
    await this.fillName(name);
    await this.fillSessionCode(sessionCode);
    await this.clickSubmit();
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
    // Either navigate to canvas or show error
    const currentUrl = this.page.url();
    const hasCanvas = currentUrl.includes('/canvas');
    const hasError = await this.page.locator(this.selectors.errorMessage).isVisible();
    
    expect(hasCanvas || hasError).toBe(true);
  }
}