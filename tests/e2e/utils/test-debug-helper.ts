import { Page, TestInfo } from '@playwright/test';

export class TestDebugHelper {
  constructor(private page: Page, private testInfo: TestInfo) {}

  /**
   * Take a debug screenshot with context information
   */
  async debugScreenshot(name: string, context?: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `debug-${name}-${timestamp}.png`;
    
    const screenshot = await this.page.screenshot({ fullPage: true });
    await this.testInfo.attach(fileName, {
      body: screenshot,
      contentType: 'image/png'
    });

    if (context) {
      console.log(`📸 Debug screenshot taken: ${fileName} - ${context}`);
    }
  }

  /**
   * Capture page HTML for debugging
   */
  async debugPageHTML(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `debug-${name}-${timestamp}.html`;
    
    const html = await this.page.content();
    await this.testInfo.attach(fileName, {
      body: html,
      contentType: 'text/html'
    });

    console.log(`📄 HTML snapshot taken: ${fileName}`);
  }

  /**
   * Capture browser console logs
   */
  async debugConsoleLogs(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `debug-console-${name}-${timestamp}.txt`;
    
    // Get console messages that were collected
    const logs: string[] = [];
    
    this.page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Wait a moment to collect any pending logs
    await this.page.waitForTimeout(100);
    
    const logContent = logs.join('\n');
    await this.testInfo.attach(fileName, {
      body: logContent,
      contentType: 'text/plain'
    });

    console.log(`📋 Console logs captured: ${fileName}`);
  }

  /**
   * Capture network requests for debugging
   */
  async debugNetworkActivity(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `debug-network-${name}-${timestamp}.json`;
    
    const networkLogs: any[] = [];
    
    this.page.on('request', request => {
      networkLogs.push({
        type: 'request',
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: new Date().toISOString()
      });
    });

    this.page.on('response', response => {
      networkLogs.push({
        type: 'response',
        url: response.url(),
        status: response.status(),
        headers: response.headers(),
        timestamp: new Date().toISOString()
      });
    });

    // Wait a moment to collect pending network activity
    await this.page.waitForLoadState('networkidle');
    
    const networkContent = JSON.stringify(networkLogs, null, 2);
    await this.testInfo.attach(fileName, {
      body: networkContent,
      contentType: 'application/json'
    });

    console.log(`🌐 Network activity captured: ${fileName}`);
  }

  /**
   * Debug element state and properties
   */
  async debugElement(selector: string, name: string): Promise<void> {
    try {
      const element = this.page.locator(selector);
      const isVisible = await element.isVisible();
      const isEnabled = await element.isEnabled();
      const textContent = await element.textContent();
      const innerHTML = await element.innerHTML();
      const boundingBox = await element.boundingBox();

      const debugInfo = {
        selector,
        isVisible,
        isEnabled,
        textContent,
        innerHTML,
        boundingBox,
        timestamp: new Date().toISOString()
      };

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `debug-element-${name}-${timestamp}.json`;
      
      await this.testInfo.attach(fileName, {
        body: JSON.stringify(debugInfo, null, 2),
        contentType: 'application/json'
      });

      console.log(`🎯 Element debug info captured: ${fileName}`);
      console.log(`Element ${selector}: visible=${isVisible}, enabled=${isEnabled}`);
    } catch (error) {
      console.log(`❌ Failed to debug element ${selector}:`, error);
    }
  }

  /**
   * Comprehensive debug capture for failed tests
   */
  async captureFailureContext(testName: string): Promise<void> {
    console.log(`🚨 Capturing failure context for: ${testName}`);
    
    await Promise.all([
      this.debugScreenshot(`failure-${testName}`, 'Test failure screenshot'),
      this.debugPageHTML(`failure-${testName}`),
      this.debugConsoleLogs(`failure-${testName}`),
      this.debugNetworkActivity(`failure-${testName}`)
    ]);

    // Also capture current URL and viewport
    const url = this.page.url();
    const viewport = this.page.viewportSize();
    
    const contextInfo = {
      testName,
      url,
      viewport,
      timestamp: new Date().toISOString(),
      userAgent: await this.page.evaluate(() => navigator.userAgent)
    };

    await this.testInfo.attach(`failure-context-${testName}.json`, {
      body: JSON.stringify(contextInfo, null, 2),
      contentType: 'application/json'
    });

    console.log(`✅ Failure context captured for: ${testName}`);
  }

  /**
   * Wait with debug logging
   */
  async waitForConditionWithDebug<T>(
    condition: () => Promise<T>,
    description: string,
    timeout: number = 5000
  ): Promise<T> {
    console.log(`⏳ Waiting for: ${description}`);
    const startTime = Date.now();
    
    try {
      const result = await condition();
      const elapsed = Date.now() - startTime;
      console.log(`✅ Condition met after ${elapsed}ms: ${description}`);
      return result;
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.log(`❌ Condition failed after ${elapsed}ms: ${description}`);
      await this.debugScreenshot(`wait-failure-${description}`, `Failed waiting for: ${description}`);
      throw error;
    }
  }
}