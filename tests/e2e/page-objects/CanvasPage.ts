import { Page, expect } from '@playwright/test';

export class CanvasPage {
  constructor(private page: Page) {}

  // Selectors
  private selectors = {
    step1Page: '[data-testid="step1-page"]',
    step2Page: '[data-testid="step2-page"]', 
    step3Page: '[data-testid="step3-page"]',
    deck: '[data-testid="deck"]',
    stagingArea: '[data-testid="staging-area"]',
    moreImportantPile: '[data-testid="more-important-pile"]',
    lessImportantPile: '[data-testid="less-important-pile"]',
    top8Pile: '[data-testid="top8-pile"]',
    top3Pile: '[data-testid="top3-pile"]',
    continueButton: '[data-testid="continue-button"]',
    progressInfo: '[data-testid="progress-info"]',
  };

  // Navigation
  async expectStep1Page() {
    await expect(this.page.locator(this.selectors.step1Page)).toBeVisible();
  }

  async expectStep2Page() {
    await expect(this.page.locator(this.selectors.step2Page)).toBeVisible();
  }

  async expectStep3Page() {
    await expect(this.page.locator(this.selectors.step3Page)).toBeVisible();
  }

  // Deck interactions
  async clickDeck() {
    await this.page.click(this.selectors.deck);
  }

  async expectDeckVisible() {
    await expect(this.page.locator(this.selectors.deck)).toBeVisible();
  }

  async expectDeckEmpty() {
    await expect(this.page.locator(this.selectors.deck)).toContainText('Deck Empty');
  }

  // Card interactions
  async dragCardToPile(cardSelector: string, pileSelector: string) {
    await this.page.dragAndDrop(cardSelector, pileSelector);
  }

  // Pile interactions
  async expectPileVisible(pileType: 'more-important' | 'less-important' | 'top8' | 'top3') {
    const selector = this.selectors[`${pileType.replace('-', '')}Pile` as keyof typeof this.selectors];
    await expect(this.page.locator(selector as string)).toBeVisible();
  }

  async expectPileCardCount(pileType: string, count: number) {
    const selector = this.selectors[`${pileType}Pile` as keyof typeof this.selectors];
    const cards = this.page.locator(`${selector} [data-testid*="card"]`);
    await expect(cards).toHaveCount(count);
  }

  // Step progression
  async clickContinue() {
    await this.page.click(this.selectors.continueButton);
  }

  async expectCanContinue() {
    await expect(this.page.locator(this.selectors.continueButton)).toBeEnabled();
  }

  async expectCannotContinue() {
    await expect(this.page.locator(this.selectors.continueButton)).toBeDisabled();
  }
}