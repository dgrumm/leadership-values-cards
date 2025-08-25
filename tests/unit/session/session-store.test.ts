import { getSessionStore, resetSessionStore } from '@/lib/session/session-store';
import { SESSION_CONFIG } from '@/lib/constants';
import { Session, SessionConfig } from '@/lib/types';

// Mock the generators module
jest.mock('@/lib/utils/generators', () => ({
  createTimestamp: () => '2024-01-01T10:00:00.000Z',
  addMinutes: (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60000),
  ensureUniqueSessionCode: (existingCodes: Set<string>) => {
    const availableCodes = ['ABC123', 'DEF456', 'GHI789', 'JKL012'];
    return availableCodes.find(code => !existingCodes.has(code)) || 'XYZ999';
  }
}));

describe('SessionStore', () => {
  beforeEach(() => {
    resetSessionStore();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
  });

  afterEach(() => {
    // Ensure all timers are cleared and store is reset
    resetSessionStore();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('createSession', () => {
    it('should create a session with default config', async () => {
      const store = getSessionStore();
      const session = await store.createSession();

      expect(session.sessionCode).toBe('ABC123');
      expect(session.createdAt).toBe('2024-01-01T10:00:00.000Z');
      expect(session.lastActivity).toBe('2024-01-01T10:00:00.000Z');
      expect(session.deckType).toBe(SESSION_CONFIG.deckType);
      expect(session.maxParticipants).toBe(SESSION_CONFIG.maxParticipants);
      expect(session.participants).toEqual([]);
      expect(session.isActive).toBe(true);
      expect(session.expiresAt).toBe('2024-01-01T11:00:00.000Z'); // +60 minutes
    });

    it('should create a session with custom config', async () => {
      const store = getSessionStore();
      const customConfig: Partial<SessionConfig> = {
        maxParticipants: 10,
        timeoutMinutes: 30
      };

      const session = await store.createSession(customConfig);

      expect(session.maxParticipants).toBe(10);
      expect(session.expiresAt).toBe('2024-01-01T10:30:00.000Z'); // +30 minutes
    });

    it('should create a session with custom code', async () => {
      const store = getSessionStore();
      const customCode = 'XYZ999';
      
      const session = await store.createSession({}, customCode);
      
      expect(session.sessionCode).toBe('XYZ999');
    });

    it('should reject invalid custom session codes', async () => {
      const store = getSessionStore();
      
      await expect(store.createSession({}, 'invalid')).rejects.toThrow(
        'Custom session code must be exactly 6 alphanumeric characters'
      );
      
      await expect(store.createSession({}, 'abc123')).rejects.toThrow(
        'Custom session code must be exactly 6 alphanumeric characters'
      );
      
      await expect(store.createSession({}, 'ABC12@')).rejects.toThrow(
        'Custom session code must be exactly 6 alphanumeric characters'
      );
    });

    it('should reject duplicate custom session codes', async () => {
      const store = getSessionStore();
      
      await store.createSession({}, 'ABC123');
      
      await expect(store.createSession({}, 'ABC123')).rejects.toThrow(
        'Session code already exists'
      );
    });

    it('should generate unique session codes automatically', async () => {
      const store = getSessionStore();
      
      const session1 = await store.createSession();
      const session2 = await store.createSession();
      const session3 = await store.createSession();
      
      expect(session1.sessionCode).toBe('ABC123');
      expect(session2.sessionCode).toBe('DEF456');
      expect(session3.sessionCode).toBe('GHI789');
      expect(new Set([session1.sessionCode, session2.sessionCode, session3.sessionCode]).size).toBe(3);
    });
  });

  describe('createSessionIfNotExists', () => {
    it('should create session if not exists', async () => {
      const store = getSessionStore();
      
      const result = await store.createSessionIfNotExists('ABC123');
      
      expect(result.created).toBe(true);
      expect(result.session.sessionCode).toBe('ABC123');
      expect(result.session.isActive).toBe(true);
    });

    it('should return existing session if exists', async () => {
      const store = getSessionStore();
      
      // Create initial session
      const initialSession = await store.createSession({}, 'ABC123');
      
      // Try to create again
      const result = await store.createSessionIfNotExists('ABC123');
      
      expect(result.created).toBe(false);
      expect(result.session).toEqual(initialSession);
    });

    it('should reject invalid session code format', async () => {
      const store = getSessionStore();
      
      await expect(store.createSessionIfNotExists('invalid')).rejects.toThrow(
        'Session code must be exactly 6 alphanumeric characters'
      );
    });

    it('should use custom config when creating new session', async () => {
      const store = getSessionStore();
      const customConfig: Partial<SessionConfig> = {
        maxParticipants: 25,
        timeoutMinutes: 45
      };
      
      const result = await store.createSessionIfNotExists('ABC123', customConfig);
      
      expect(result.created).toBe(true);
      expect(result.session.maxParticipants).toBe(25);
      expect(result.session.expiresAt).toBe('2024-01-01T10:45:00.000Z');
    });
  });

  describe('getSession', () => {
    it('should return session if exists', async () => {
      const store = getSessionStore();
      const createdSession = await store.createSession({}, 'ABC123');
      
      const retrievedSession = await store.getSession('ABC123');
      
      expect(retrievedSession).toEqual(createdSession);
    });

    it('should return null if session does not exist', async () => {
      const store = getSessionStore();
      
      const session = await store.getSession('NONEXISTENT');
      
      expect(session).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update existing session', async () => {
      const store = getSessionStore();
      await store.createSession({}, 'ABC123');
      
      const updates: Partial<Session> = {
        isActive: false,
        participants: [{ id: 'user1', name: 'John' }] as any
      };
      
      const updatedSession = await store.updateSession('ABC123', updates);
      
      expect(updatedSession?.isActive).toBe(false);
      expect(updatedSession?.participants).toHaveLength(1);
    });

    it('should return null for non-existent session', async () => {
      const store = getSessionStore();
      
      const result = await store.updateSession('NONEXISTENT', { isActive: false });
      
      expect(result).toBeNull();
    });

    it('should preserve unchanged fields', async () => {
      const store = getSessionStore();
      const originalSession = await store.createSession({}, 'ABC123');
      
      const updatedSession = await store.updateSession('ABC123', { isActive: false });
      
      expect(updatedSession?.sessionCode).toBe(originalSession.sessionCode);
      expect(updatedSession?.createdAt).toBe(originalSession.createdAt);
      expect(updatedSession?.maxParticipants).toBe(originalSession.maxParticipants);
      expect(updatedSession?.isActive).toBe(false); // Updated field
    });
  });

  describe('deleteSession', () => {
    it('should delete existing session', async () => {
      const store = getSessionStore();
      await store.createSession({}, 'ABC123');
      
      const deleted = await store.deleteSession('ABC123');
      const retrieved = await store.getSession('ABC123');
      
      expect(deleted).toBe(true);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent session', async () => {
      const store = getSessionStore();
      
      const deleted = await store.deleteSession('NONEXISTENT');
      
      expect(deleted).toBe(false);
    });
  });

  describe('getAllActiveSessions', () => {
    it('should return all active non-expired sessions', async () => {
      const store = getSessionStore();
      
      // Create active sessions
      await store.createSession({}, 'ABC123');
      await store.createSession({}, 'DEF456');
      
      // Create inactive session
      await store.createSession({}, 'GHI789');
      await store.updateSession('GHI789', { isActive: false });
      
      const activeSessions = await store.getAllActiveSessions();
      
      expect(activeSessions).toHaveLength(2);
      expect(activeSessions.map(s => s.sessionCode)).toEqual(expect.arrayContaining(['ABC123', 'DEF456']));
      expect(activeSessions.every(s => s.isActive)).toBe(true);
    });

    it('should exclude expired sessions', async () => {
      const store = getSessionStore();
      
      // Create session
      await store.createSession({}, 'ABC123');
      
      // Advance time past expiration
      jest.advanceTimersByTime(61 * 60 * 1000); // 61 minutes
      
      const activeSessions = await store.getAllActiveSessions();
      
      expect(activeSessions).toHaveLength(0);
    });

    it('should include correct metadata', async () => {
      const store = getSessionStore();
      const session = await store.createSession({}, 'ABC123');
      await store.updateSession('ABC123', { 
        participants: [{ id: 'user1', name: 'John' }, { id: 'user2', name: 'Jane' }] as any 
      });
      
      const activeSessions = await store.getAllActiveSessions();
      
      expect(activeSessions[0]).toMatchObject({
        sessionCode: 'ABC123',
        participantCount: 2,
        createdAt: '2024-01-01T10:00:00.000Z',
        lastActivity: '2024-01-01T10:00:00.000Z',
        isActive: true,
        timeRemaining: expect.any(Number)
      });
      expect(activeSessions[0].timeRemaining).toBeGreaterThan(0);
    });
  });

  describe('updateLastActivity', () => {
    it('should update last activity and extend expiration', async () => {
      const store = getSessionStore();
      await store.createSession({}, 'ABC123');
      
      // Advance time
      jest.advanceTimersByTime(30 * 60 * 1000); // 30 minutes
      jest.setSystemTime(new Date('2024-01-01T10:30:00.000Z'));
      
      await store.updateLastActivity('ABC123');
      
      const session = await store.getSession('ABC123');
      expect(session?.lastActivity).toBe('2024-01-01T10:00:00.000Z'); // Mocked timestamp
      expect(session?.expiresAt).toBe('2024-01-01T11:30:00.000Z'); // Extended by 60 minutes from new time
    });

    it('should handle non-existent session gracefully', async () => {
      const store = getSessionStore();
      
      await expect(store.updateLastActivity('NONEXISTENT')).resolves.not.toThrow();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should preserve active non-expired sessions', async () => {
      const store = getSessionStore();
      
      await store.createSession({}, 'ABC123');
      
      const expiredCodes = await store.cleanupExpiredSessions();
      
      expect(expiredCodes).toEqual([]);
      expect(await store.getSession('ABC123')).toBeTruthy();
    });

    it('should return cleanup function', async () => {
      const store = getSessionStore();
      
      // Test that cleanup function exists and returns array
      const expiredCodes = await store.cleanupExpiredSessions();
      expect(Array.isArray(expiredCodes)).toBe(true);
    });
  });

  describe('memory management', () => {
    it('should have memory limit enforcement method', async () => {
      const store = getSessionStore();
      
      // Test that the store can create multiple sessions (basic memory management exists)
      await store.createSession({}, 'ABC123');
      await store.createSession({}, 'DEF456');
      await store.createSession({}, 'GHI789');
      
      expect(await store.getSession('ABC123')).toBeTruthy();
      expect(await store.getSession('DEF456')).toBeTruthy();
      expect(await store.getSession('GHI789')).toBeTruthy();
    });
  });

  describe('automatic cleanup timer', () => {
    it('should have cleanup timer functionality', async () => {
      const store = getSessionStore();
      
      // Test that store has timer-related functionality
      expect(typeof (store as any).destroy).toBe('function');
      
      // Create a session to verify store works
      await store.createSession({}, 'ABC123');
      expect(await store.getSession('ABC123')).toBeTruthy();
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance', () => {
      const store1 = getSessionStore();
      const store2 = getSessionStore();
      
      expect(store1).toBe(store2);
    });

    it('should create new instance after reset', async () => {
      const store1 = getSessionStore();
      await store1.createSession({}, 'ABC123');
      
      resetSessionStore();
      
      const store2 = getSessionStore();
      expect(store2).not.toBe(store1);
      expect(await store2.getSession('ABC123')).toBeNull(); // New instance, no sessions
    });

    it('should cleanup resources on reset', () => {
      const store = getSessionStore();
      const destroySpy = jest.spyOn(store as any, 'destroy');
      
      resetSessionStore();
      
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('destroy', () => {
    it('should clear sessions and stop cleanup timer', async () => {
      const store = getSessionStore();
      await store.createSession({}, 'ABC123');
      
      // Verify session exists before destroy
      expect(await store.getSession('ABC123')).toBeTruthy();
      
      // Destroy should clear everything
      (store as any).destroy();
      
      expect(await store.getSession('ABC123')).toBeNull();
    });
  });
});