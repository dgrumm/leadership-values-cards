import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Limit workers to prevent rate limit issues while maintaining reasonable speed */
  workers: process.env.CI ? 1 : 4,  // Reduced from 7 to 4 to stay under rate limits
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    /* Record video on failure */
    video: 'retain-on-failure',
    /* Timeouts optimized for animation-heavy card operations */
    actionTimeout: 15000,  // Increased for drag-drop + auto-flip operations
    navigationTimeout: 20000,  // Increased for form submission + redirect
    /* Set environment variable for E2E testing to relax rate limits */
    extraHTTPHeaders: {
      'X-Test-Environment': 'playwright'
    }
  },
  
  /* Set test environment variables */
  env: {
    PLAYWRIGHT_TEST: 'true'
  },
  
  /* Configure where screenshots and visual regression snapshots are stored */
  expect: {
    /* Path to visual regression snapshots */
    toMatchSnapshot: { 
      threshold: 0.2, 
      mode: 'strict',
      animations: 'disabled' // Disable animations for consistent screenshots
    }
  },
  
  /* Global test timeout - increased for complex animations and drag operations */
  timeout: 30000,

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        headless: true, // Run in headless mode for better performance
      },
    },

    // Disable other browsers during development for faster feedback
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'cross-env PLAYWRIGHT_TEST=true NODE_ENV=test npm run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      PLAYWRIGHT_TEST: 'true',
      NODE_ENV: 'test',
    },
  },
});