import { Page } from '@playwright/test';

export interface TestSessionData {
  sessionCode: string;
  participantName: string;
  createdAt: Date;
}

export class TestSessionManager {
  private activeSessions: Set<string> = new Set();
  
  constructor(private page: Page) {}

  /**
   * Generate a unique test session code
   */
  generateTestSessionCode(): string {
    const timestamp = Date.now().toString(36).slice(-4);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `T${timestamp}${random}`.substring(0, 6);
  }

  /**
   * Create a clean test session
   */
  async createTestSession(participantName?: string): Promise<TestSessionData> {
    const sessionCode = this.generateTestSessionCode();
    const name = participantName || `TestUser${Date.now()}`;
    
    const sessionData: TestSessionData = {
      sessionCode,
      participantName: name,
      createdAt: new Date()
    };
    
    this.activeSessions.add(sessionCode);
    return sessionData;
  }

  /**
   * Clean up all sessions created during testing
   */
  async cleanupSessions(): Promise<void> {
    for (const sessionCode of this.activeSessions) {
      try {
        // Call cleanup API if it exists
        await this.page.request.delete(`/api/sessions/${sessionCode}`).catch(() => {
          // Ignore errors - session might not exist or API might not be implemented
        });
      } catch (error) {
        console.warn(`Failed to cleanup session ${sessionCode}:`, error);
      }
    }
    
    this.activeSessions.clear();
  }

  /**
   * Clear all browser state (localStorage, sessionStorage, cookies)
   */
  async clearBrowserState(): Promise<void> {
    try {
      // Clear all storage (with error handling for security restrictions)
      await this.page.evaluate(() => {
        try {
          localStorage.clear();
        } catch (e) {
          // Ignore localStorage access errors
        }
        try {
          sessionStorage.clear();
        } catch (e) {
          // Ignore sessionStorage access errors
        }
      });
    } catch (error) {
      // If evaluation fails entirely, just continue
      console.debug('Storage clearing failed (expected in some contexts):', error);
    }
    
    try {
      // Clear cookies
      const context = this.page.context();
      await context.clearCookies();
    } catch (error) {
      console.debug('Cookie clearing failed:', error);
    }
  }

  /**
   * Perform complete test isolation cleanup
   */
  async isolateTest(): Promise<void> {
    await this.clearBrowserState();
    await this.cleanupSessions();
  }

  /**
   * Navigate to a fresh login page with clean state
   */
  async gotoFreshLoginPage(): Promise<void> {
    await this.clearBrowserState();
    await this.page.goto('/', { waitUntil: 'networkidle' });
  }

  /**
   * Navigate directly to canvas with session data
   */
  async gotoCanvasWithSession(sessionData: TestSessionData): Promise<void> {
    const params = new URLSearchParams({
      session: sessionData.sessionCode,
      name: sessionData.participantName
    });
    
    await this.page.goto(`/canvas?${params.toString()}`, { waitUntil: 'networkidle' });
  }

  /**
   * Get list of active test sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions);
  }
}