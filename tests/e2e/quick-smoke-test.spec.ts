import { test, expect } from './fixtures/test-fixtures';

/**
 * Quick smoke test to verify E2E setup works
 * Now with proper test isolation and semantic waits
 */

test.describe('Quick Smoke Test', () => {
  test('should load homepage and show login form', async ({ loginPage }) => {
    // Navigate to homepage (clean state guaranteed by isolatedTest fixture)
    await loginPage.goto();
    
    // Check that the page loads with login form
    await loginPage.expectPageLoaded();
    await loginPage.expectFormElementsVisible();
  });

  test('should fill form and attempt submission', async ({ loginPage, sessionManager }) => {
    // Create a unique test session
    const session = await sessionManager.createTestSession('TestUser');
    
    await loginPage.goto();
    
    // Submit form with test data (includes loading state detection)
    await loginPage.submitForm(session.participantName, session.sessionCode);
    
    // Wait for and verify appropriate response (semantic waits, no arbitrary timeout!)
    await loginPage.expectFormSubmissionResult();
  });

  test('should handle form submission with proper loading states', async ({ loginPage, sessionManager }) => {
    const session = await sessionManager.createTestSession('LoadingTestUser');
    
    await loginPage.goto();
    
    // Fill form but don't submit yet
    await loginPage.fillName(session.participantName);
    await loginPage.fillSessionCode(session.sessionCode);
    
    // Click submit and verify loading state starts
    await loginPage.clickSubmit();
    await loginPage.waitForFormSubmissionStart();
    
    // Wait for completion and verify result
    await loginPage.waitForFormSubmissionComplete();
    await loginPage.expectFormSubmissionResult();
  });
});