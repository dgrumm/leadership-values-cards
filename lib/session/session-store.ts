import { Session, SessionConfig, SessionMetadata } from '../types';
import { SESSION_CONFIG } from '../constants';
import { createTimestamp, addMinutes, ensureUniqueSessionCode } from '../utils/generators';

export interface SessionStore {
  createSession(config?: Partial<SessionConfig>): Promise<Session>;
  getSession(sessionCode: string): Promise<Session | null>;
  updateSession(sessionCode: string, updates: Partial<Session>): Promise<Session | null>;
  deleteSession(sessionCode: string): Promise<boolean>;
  getAllActiveSessions(): Promise<SessionMetadata[]>;
  updateLastActivity(sessionCode: string): Promise<void>;
  cleanupExpiredSessions(): Promise<string[]>;
}

class InMemorySessionStore implements SessionStore {
  private sessions = new Map<string, Session>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  async createSession(config: Partial<SessionConfig> = {}): Promise<Session> {
    const mergedConfig = { ...SESSION_CONFIG, ...config };
    const now = new Date();
    const sessionCode = ensureUniqueSessionCode(new Set(this.sessions.keys()));
    
    const session: Session = {
      sessionCode,
      createdAt: createTimestamp(),
      lastActivity: createTimestamp(),
      deckType: mergedConfig.deckType,
      maxParticipants: mergedConfig.maxParticipants,
      participants: [],
      isActive: true,
      expiresAt: addMinutes(now, mergedConfig.timeoutMinutes).toISOString()
    };
    
    this.sessions.set(sessionCode, session);
    return session;
  }

  async getSession(sessionCode: string): Promise<Session | null> {
    return this.sessions.get(sessionCode) || null;
  }

  async updateSession(sessionCode: string, updates: Partial<Session>): Promise<Session | null> {
    const session = this.sessions.get(sessionCode);
    if (!session) return null;
    
    const updatedSession = { ...session, ...updates };
    this.sessions.set(sessionCode, updatedSession);
    return updatedSession;
  }

  async deleteSession(sessionCode: string): Promise<boolean> {
    return this.sessions.delete(sessionCode);
  }

  async getAllActiveSessions(): Promise<SessionMetadata[]> {
    const now = new Date();
    return Array.from(this.sessions.values())
      .filter(session => session.isActive && new Date(session.expiresAt) > now)
      .map(session => ({
        sessionCode: session.sessionCode,
        participantCount: session.participants.length,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        isActive: session.isActive,
        timeRemaining: Math.max(0, new Date(session.expiresAt).getTime() - now.getTime())
      }));
  }

  async updateLastActivity(sessionCode: string): Promise<void> {
    const session = this.sessions.get(sessionCode);
    if (session) {
      const now = new Date();
      session.lastActivity = createTimestamp();
      session.expiresAt = addMinutes(now, SESSION_CONFIG.timeoutMinutes).toISOString();
      this.sessions.set(sessionCode, session);
    }
  }

  async cleanupExpiredSessions(): Promise<string[]> {
    const now = new Date();
    const expiredSessions: string[] = [];
    
    for (const [sessionCode, session] of this.sessions.entries()) {
      if (!session.isActive || new Date(session.expiresAt) <= now) {
        this.sessions.delete(sessionCode);
        expiredSessions.push(sessionCode);
      }
    }
    
    return expiredSessions;
  }

  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredSessions();
    }, 60000); // Run every minute
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.sessions.clear();
  }
}

// Singleton instance
let sessionStore: SessionStore | null = null;

export function getSessionStore(): SessionStore {
  if (!sessionStore) {
    sessionStore = new InMemorySessionStore();
  }
  return sessionStore;
}

export function resetSessionStore(): void {
  if (sessionStore && 'destroy' in sessionStore) {
    (sessionStore as InMemorySessionStore).destroy();
  }
  sessionStore = null;
}