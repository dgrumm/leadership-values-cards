import { getSessionStore, SessionStore } from './session-store';
import { SESSION_CONFIG } from '../constants';

export interface SessionTimeoutInfo {
  sessionCode: string;
  timeRemaining: number;
  isWarning: boolean;
  isExpired: boolean;
}

export class SessionLifecycle {
  private store: SessionStore;
  private timeoutCallbacks = new Map<string, () => void>();
  private warningCallbacks = new Map<string, () => void>();

  constructor(store?: SessionStore) {
    this.store = store || getSessionStore();
  }

  async checkSessionTimeout(sessionCode: string): Promise<SessionTimeoutInfo | null> {
    const session = await this.store.getSession(sessionCode);
    if (!session || !session.isActive) {
      return null;
    }

    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const timeRemaining = expiresAt.getTime() - now.getTime();
    
    const warningThreshold = SESSION_CONFIG.warningMinutes * 60 * 1000; // 55 minutes in ms
    const isWarning = timeRemaining <= warningThreshold && timeRemaining > 0;
    const isExpired = timeRemaining <= 0;

    return {
      sessionCode,
      timeRemaining: Math.max(0, timeRemaining),
      isWarning,
      isExpired
    };
  }

  async extendSession(sessionCode: string): Promise<boolean> {
    const session = await this.store.getSession(sessionCode);
    if (!session || !session.isActive) {
      return false;
    }

    await this.store.updateLastActivity(sessionCode);
    return true;
  }

  async expireSession(sessionCode: string): Promise<boolean> {
    const session = await this.store.getSession(sessionCode);
    if (!session) {
      return false;
    }

    const updatedSession = await this.store.updateSession(sessionCode, {
      isActive: false,
      expiresAt: new Date().toISOString()
    });

    if (updatedSession) {
      // Trigger timeout callback if registered
      const callback = this.timeoutCallbacks.get(sessionCode);
      if (callback) {
        callback();
        this.timeoutCallbacks.delete(sessionCode);
      }
      return true;
    }

    return false;
  }

  registerTimeoutCallback(sessionCode: string, callback: () => void): void {
    this.timeoutCallbacks.set(sessionCode, callback);
  }

  registerWarningCallback(sessionCode: string, callback: () => void): void {
    this.warningCallbacks.set(sessionCode, callback);
  }

  unregisterCallbacks(sessionCode: string): void {
    this.timeoutCallbacks.delete(sessionCode);
    this.warningCallbacks.delete(sessionCode);
  }

  async monitorSession(sessionCode: string): Promise<void> {
    const checkTimeout = async () => {
      const timeoutInfo = await this.checkSessionTimeout(sessionCode);
      if (!timeoutInfo) {
        return; // Session doesn't exist or is inactive
      }

      if (timeoutInfo.isExpired) {
        await this.expireSession(sessionCode);
        return;
      }

      if (timeoutInfo.isWarning) {
        const warningCallback = this.warningCallbacks.get(sessionCode);
        if (warningCallback) {
          warningCallback();
        }
      }

      // Continue monitoring if session is still active
      if (timeoutInfo.timeRemaining > 0) {
        const checkInterval = timeoutInfo.isWarning ? 30000 : 60000; // Check every 30s in warning, 1min otherwise
        setTimeout(checkTimeout, checkInterval);
      }
    };

    // Start monitoring
    checkTimeout();
  }

  formatTimeRemaining(milliseconds: number): string {
    if (milliseconds < 0) {
      return '0s';
    }
    
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  getWarningMessage(timeRemaining: number): string {
    const formatted = this.formatTimeRemaining(timeRemaining);
    return `Session will expire in ${formatted}. Continue working to extend the session.`;
  }

  getExpiredMessage(): string {
    return 'Your session has expired. Please save any work and start a new session.';
  }
}

// Singleton instance
let sessionLifecycle: SessionLifecycle | null = null;

export function getSessionLifecycle(): SessionLifecycle {
  if (!sessionLifecycle) {
    sessionLifecycle = new SessionLifecycle();
  }
  return sessionLifecycle;
}