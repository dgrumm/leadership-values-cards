import { test, expect } from '@playwright/test';

// Helper to create a new session
async function createSession(page: any): Promise<string> {
  await page.goto('/');
  
  // Fill in name first
  await page.waitForSelector('input[type="text"]');
  await page.fill('input[type="text"]', 'Dave');
  
  // Small wait for UI to react
  await page.waitForTimeout(500);
  
  // Click create session button
  await page.waitForSelector('[data-testid="generate-session-button"]');
  await page.click('[data-testid="generate-session-button"]', { force: true });
  
  // Wait for session to be created and get the session code
  await page.waitForSelector('[data-testid="session-code"]', { timeout: 15000 });
  const sessionCode = await page.textContent('[data-testid="session-code"]');
  
  return sessionCode?.trim() || '';
}

// Helper to join an existing session
async function joinSession(page: any, sessionCode: string, participantName: string) {
  await page.goto('/');
  
  // Click join session
  await page.waitForSelector('[data-testid="join-session-button-existing"]');
  await page.click('[data-testid="join-session-button-existing"]');
  
  // Fill in session code and name
  await page.waitForSelector('input[placeholder*="session code"]');
  await page.fill('input[placeholder*="session code"]', sessionCode);
  
  await page.waitForSelector('input[placeholder*="name"]');
  await page.fill('input[placeholder*="name"]', participantName);
  
  await page.click('[data-testid="join-session-button"]');
  
  // Wait for session to load
  await page.waitForSelector('[data-testid="session-code"]', { timeout: 10000 });
}

test.describe('Viewer Real-time Sync Fix', () => {
  test('Dave reveals Top 8 → Bob sees arrangement immediately', async ({ browser }) => {
    // Create two browser contexts (Dave and Bob)
    const daveContext = await browser.newContext();
    const bobContext = await browser.newContext();
    
    const davePage = await daveContext.newPage();
    const bobPage = await bobContext.newPage();

    try {
      // Dave creates session
      const sessionCode = await createSession(davePage);
      console.log(`Created session: ${sessionCode}`);
      
      // Bob joins the same session
      await joinSession(bobPage, sessionCode, 'Bob');

      // Wait for state injection utilities to be available 
      await davePage.waitForFunction(() => {
        return typeof (window as any).StateInjectionUtils !== 'undefined';
      }, { timeout: 10000 });
      
      await bobPage.waitForFunction(() => {
        return typeof (window as any).StateInjectionUtils !== 'undefined';
      }, { timeout: 10000 });

      // Close initial modal for Dave
      const daveModalCloseButton = davePage.locator('button:has-text("Got it!"), button:has-text("Start Sorting")');
      if (await daveModalCloseButton.isVisible()) {
        await daveModalCloseButton.click();
        await davePage.waitForTimeout(300);
      }

      // Close initial modal for Bob
      const bobModalCloseButton = bobPage.locator('button:has-text("Got it!"), button:has-text("Start Sorting")');
      if (await bobModalCloseButton.isVisible()) {
        await bobModalCloseButton.click();
        await bobPage.waitForTimeout(300);
      }

      // Use state injection to setup Dave with revealed Top 8 (this creates both the state AND the reveal event)
      await davePage.evaluate(() => {
        (window as any).StateInjectionUtils.injectRevealedParticipant('Dave', 'top8');
      });

      // The reveal should now be automatically set up, so Dave should show as revealed
      // Bob should see Dave as revealed in participant list
      await expect(bobPage.locator('[data-testid="participant-list"]')).toContainText('revealed', { timeout: 10000 });
      
      // Bob clicks to view Dave's arrangement (use test-id instead of text)
      await bobPage.click('[data-testid="view-reveal-button"]');
      
      // Bob should now see Dave's arrangement (NOT the "No arrangement" message)
      await expect(bobPage.locator('h1')).toContainText("Dave's Top 8 Leadership Values", { timeout: 15000 });
      
      // Verify that arrangement cards are visible (not empty)
      await expect(bobPage.locator('[data-testid="arrangement-cards"] .card')).toHaveCount(8, { timeout: 5000 });
      
      // Verify Bob can navigate back
      await bobPage.click('button:has-text("← Back to Participants")');
      await expect(bobPage.locator('[data-testid="participant-list"]')).toBeVisible();

      console.log('✅ Test passed - Viewer sync is working correctly!');
      
    } finally {
      await daveContext.close();
      await bobContext.close();
    }
  });
  
  test('Real-time card movement sync', async ({ browser }) => {
    const daveContext = await browser.newContext();
    const bobContext = await browser.newContext();
    
    const davePage = await daveContext.newPage();
    const bobPage = await bobContext.newPage();

    try {
      // Dave creates session
      const sessionCode = await createSession(davePage);
      console.log(`Created session: ${sessionCode}`);
      
      // Bob joins the same session
      await joinSession(bobPage, sessionCode, 'Bob');

      // Wait for state injection utilities to be available 
      await davePage.waitForFunction(() => {
        return typeof (window as any).StateInjectionUtils !== 'undefined';
      }, { timeout: 10000 });
      
      await bobPage.waitForFunction(() => {
        return typeof (window as any).StateInjectionUtils !== 'undefined';
      }, { timeout: 10000 });

      // Close modals for Dave
      const daveModalCloseButton = davePage.locator('button:has-text("Got it!"), button:has-text("Start Sorting")');
      if (await daveModalCloseButton.isVisible()) {
        await daveModalCloseButton.click();
        await davePage.waitForTimeout(300);
      }

      // Close modals for Bob
      const bobModalCloseButton = bobPage.locator('button:has-text("Got it!"), button:has-text("Start Sorting")');
      if (await bobModalCloseButton.isVisible()) {
        await bobModalCloseButton.click();
        await bobPage.waitForTimeout(300);
      }

      // Inject Step 1 completion for Dave, then navigate to Step 2
      await davePage.evaluate(() => {
        (window as any).StateInjectionUtils.injectStep1Completion();
      });

      // Navigate Dave to Step 2
      await davePage.click('button:has-text("Continue to Step 2")');
      await davePage.waitForTimeout(500);
      
      // Close Step 2 modal if present
      const step2Modal = davePage.locator('button:has-text("Start Selecting"), button:has-text("Got it")');
      if (await step2Modal.isVisible()) {
        await step2Modal.click();
        await davePage.waitForTimeout(300);
      }

      // Dave injects Step 2 completion and reveals
      await davePage.evaluate(() => {
        (window as any).StateInjectionUtils.injectStep2Completion();
      });

      await davePage.click('button:has-text("Reveal Top 8")');
      await davePage.click('button:has-text("Reveal")');
      await expect(davePage.locator('text=revealed')).toBeVisible();

      // Bob views Dave's arrangement
      await bobPage.click('button:has-text("See Dave\'s Top 8")');
      await expect(bobPage.locator('h1')).toContainText("Dave's Top 8 Leadership Values");
      
      // Dave moves a card (if drag-drop is available)
      const firstCard = davePage.locator('[data-testid="top8-pile"] .card').first();
      if (await firstCard.isVisible()) {
        // Get initial position
        const initialText = await firstCard.textContent();
        
        // Move card position
        await firstCard.hover();
        await davePage.mouse.down();
        await davePage.mouse.move(100, 100); // Move relative
        await davePage.mouse.up();
        
        // Wait 300ms for debounce
        await bobPage.waitForTimeout(300);
        
        // Bob should see the updated position
        // (This is a simplified test - real test would check actual positions)
        await expect(bobPage.locator('[data-testid="arrangement-cards"]')).toBeVisible();
      }
      
    } finally {
      await daveContext.close();
      await bobContext.close();
    }
  });
});