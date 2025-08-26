/**
 * E2E Test Session Management Helper
 * Provides reusable session codes and cleanup utilities for tests
 */

const BASE_CODES = [
  'TEST01', 'TEST02', 'TEST03', 'TEST04', 'TEST05',
  'ANIM01', 'ANIM02', 'ANIM03', 'ANIM04', 'ANIM05',
  'CONST1', 'CONST2', 'CONST3', 'CONST4', 'CONST5',
  'TOUCH1', 'TOUCH2', 'TOUCH3', 'TOUCH4', 'TOUCH5',
  'STEP21', 'STEP22', 'STEP23', 'STEP24', 'STEP25',
  'STEP31', 'STEP32', 'STEP33', 'STEP34', 'STEP35'
];

let codeIndex = 0;

/**
 * Get a unique session code for testing
 * Cycles through predefined codes to minimize API calls
 */
export function getTestSessionCode(prefix?: string): string {
  if (prefix) {
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}${timestamp}`;
  }
  
  const code = BASE_CODES[codeIndex % BASE_CODES.length];
  codeIndex++;
  return code;
}

/**
 * Reset the session code index (useful for test isolation)
 */
export function resetSessionCodes(): void {
  codeIndex = 0;
}

/**
 * Create a session with retry logic for rate limiting
 */
export async function createTestSession(
  page: any, 
  userName: string = 'Test User',
  sessionCode?: string
): Promise<string> {
  const code = sessionCode || getTestSessionCode();
  
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    try {
      await page.goto('/');
      await page.fill('input[name="name"]', userName);
      await page.fill('input[name="sessionCode"]', code);
      await page.click('button[type="submit"]');
      
      // Wait for successful navigation
      await page.waitForLoadState('networkidle');
      const url = page.url();
      
      if (url.includes('/canvas')) {
        return code;
      }
      
      // If we see an error about rate limiting, wait and retry
      const errorText = await page.textContent('body').catch(() => '');
      if (errorText?.includes('Rate limit exceeded')) {
        attempts++;
        console.log(`Rate limit hit, attempt ${attempts}/${maxAttempts}, waiting...`);
        await page.waitForTimeout(2000); // Wait 2 seconds before retry
        continue;
      }
      
      break;
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(`Failed to create session after ${maxAttempts} attempts: ${error}`);
      }
      await page.waitForTimeout(1000);
    }
  }
  
  return code;
}

/**
 * Standard test setup that handles modal dismissal
 */
export async function setupTestSession(
  page: any,
  userName: string = 'Test User',
  sessionCode?: string
): Promise<string> {
  const code = await createTestSession(page, userName, sessionCode);
  
  // Close Step 1 modal if present
  const modalCloseButton = page.locator('button:has-text("Got it!")');
  if (await modalCloseButton.isVisible()) {
    await modalCloseButton.click();
    await modalCloseButton.waitFor({ state: 'hidden' });
    await page.waitForTimeout(300);
  }
  
  return code;
}