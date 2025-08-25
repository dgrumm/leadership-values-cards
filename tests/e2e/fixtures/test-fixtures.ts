import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { CanvasPage } from '../page-objects/CanvasPage';
import { TestSessionManager } from '../utils/test-session-manager';
import { TestDebugHelper } from '../utils/test-debug-helper';

// Extend Playwright test with our custom fixtures
export const test = base.extend<{
  loginPage: LoginPage;
  canvasPage: CanvasPage;
  sessionManager: TestSessionManager;
  debugHelper: TestDebugHelper;
  isolatedTest: void;
}>({
  // Login page fixture
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  // Canvas page fixture  
  canvasPage: async ({ page }, use) => {
    const canvasPage = new CanvasPage(page);
    await use(canvasPage);
  },

  // Session manager fixture
  sessionManager: async ({ page }, use) => {
    const sessionManager = new TestSessionManager(page);
    await use(sessionManager);
    
    // Cleanup after test
    await sessionManager.cleanupSessions();
  },

  // Debug helper fixture
  debugHelper: async ({ page }, use, testInfo) => {
    const debugHelper = new TestDebugHelper(page, testInfo);
    await use(debugHelper);
  },

  // Isolated test fixture - ensures clean state before each test with error handling
  isolatedTest: [async ({ page, sessionManager, debugHelper }, use, testInfo) => {
    // Pre-test setup: ensure clean state
    await sessionManager.isolateTest();
    
    // Wait for any pending requests to complete
    await page.waitForLoadState('networkidle');
    
    try {
      await use();
    } catch (error) {
      // Capture debug info on test failure
      console.log(`🚨 Test failed: ${testInfo.title}`);
      await debugHelper.captureFailureContext(testInfo.title.replace(/\s/g, '-'));
      
      // Re-throw the error to maintain test failure
      throw error;
    } finally {
      // Post-test cleanup: ensure no state leaks to next test
      await sessionManager.isolateTest();
    }
  }, { auto: true }], // Auto-use this fixture in every test
});

export { expect } from '@playwright/test';