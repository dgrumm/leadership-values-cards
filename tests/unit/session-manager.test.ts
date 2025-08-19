import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SessionManager } from '@/lib/session/session-manager';
import { resetSessionStore } from '@/lib/session/session-store';
import { SessionConfig } from '@/lib/types';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    resetSessionStore();
    sessionManager = new SessionManager();
  });

  afterEach(() => {
    resetSessionStore();
  });

  describe('createSession', () => {
    it('should create a session with default config', async () => {
      const result = await sessionManager.createSession();
      
      expect(result.success).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.session!.sessionCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(result.session!.maxParticipants).toBe(50);
      expect(result.session!.isActive).toBe(true);
      expect(result.session!.participants).toEqual([]);
    });

    it('should create a session with custom config', async () => {
      const config: Partial<SessionConfig> = {
        maxParticipants: 10,
        timeoutMinutes: 30,
        deckType: 'professional'
      };
      
      const result = await sessionManager.createSession(config);
      
      expect(result.success).toBe(true);
      expect(result.session!.maxParticipants).toBe(10);
      expect(result.session!.deckType).toBe('professional');
    });

    it('should create sessions with unique codes', async () => {
      const session1 = await sessionManager.createSession();
      const session2 = await sessionManager.createSession();
      
      expect(session1.session!.sessionCode).not.toBe(session2.session!.sessionCode);
    });
  });

  describe('getSession', () => {
    it('should return null for invalid session code', async () => {
      const session = await sessionManager.getSession('INVALID');
      expect(session).toBeNull();
    });

    it('should return null for non-existent session', async () => {
      const session = await sessionManager.getSession('ABC123');
      expect(session).toBeNull();
    });

    it('should return session for valid code', async () => {
      const createResult = await sessionManager.createSession();
      const sessionCode = createResult.session!.sessionCode;
      
      const session = await sessionManager.getSession(sessionCode);
      expect(session).toBeDefined();
      expect(session!.sessionCode).toBe(sessionCode);
    });
  });

  describe('joinSession', () => {
    let sessionCode: string;

    beforeEach(async () => {
      const result = await sessionManager.createSession();
      sessionCode = result.session!.sessionCode;
    });

    it('should allow participant to join valid session', async () => {
      const result = await sessionManager.joinSession(sessionCode, 'John');
      
      expect(result.success).toBe(true);
      expect(result.participant!.name).toBe('John');
      expect(result.session!.participants).toHaveLength(1);
    });

    it('should reject invalid session codes', async () => {
      const result = await sessionManager.joinSession('INVALID', 'John');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('6 alphanumeric characters');
    });

    it('should reject non-existent sessions', async () => {
      const result = await sessionManager.joinSession('ABC123', 'John');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Session not found');
    });

    it('should handle name conflicts by appending numbers', async () => {
      await sessionManager.joinSession(sessionCode, 'John');
      const result2 = await sessionManager.joinSession(sessionCode, 'John');
      
      expect(result2.success).toBe(true);
      expect(result2.participant!.name).toBe('John-2');
    });

    it('should reject invalid participant names', async () => {
      const result = await sessionManager.joinSession(sessionCode, '');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('1-50 characters');
    });

    it('should reject participants when session is full', async () => {
      // Create session with max 2 participants
      const smallSessionResult = await sessionManager.createSession({ maxParticipants: 2 });
      const smallSessionCode = smallSessionResult.session!.sessionCode;
      
      await sessionManager.joinSession(smallSessionCode, 'John');
      await sessionManager.joinSession(smallSessionCode, 'Jane');
      
      const result = await sessionManager.joinSession(smallSessionCode, 'Bob');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Session is full');
    });

    it('should assign unique emojis and colors to participants', async () => {
      const result1 = await sessionManager.joinSession(sessionCode, 'John');
      const result2 = await sessionManager.joinSession(sessionCode, 'Jane');
      
      expect(result1.participant!.emoji).not.toBe(result2.participant!.emoji);
      expect(result1.participant!.color).not.toBe(result2.participant!.color);
    });
  });

  describe('leaveSession', () => {
    let sessionCode: string;
    let participantId: string;

    beforeEach(async () => {
      const createResult = await sessionManager.createSession();
      sessionCode = createResult.session!.sessionCode;
      
      const joinResult = await sessionManager.joinSession(sessionCode, 'John');
      participantId = joinResult.participant!.id;
    });

    it('should remove participant from session', async () => {
      const result = await sessionManager.leaveSession(sessionCode, participantId);
      
      expect(result.success).toBe(true);
      expect(result.sessionDeleted).toBe(true); // Session deleted when last participant leaves
    });

    it('should delete session when last participant leaves', async () => {
      const leaveResult = await sessionManager.leaveSession(sessionCode, participantId);
      const session = await sessionManager.getSession(sessionCode);
      
      expect(leaveResult.sessionDeleted).toBe(true);
      expect(session).toBeNull();
    });

    it('should keep session alive when other participants remain', async () => {
      // Add another participant
      const joinResult = await sessionManager.joinSession(sessionCode, 'Jane');
      const janeId = joinResult.participant!.id;
      
      const leaveResult = await sessionManager.leaveSession(sessionCode, participantId);
      const session = await sessionManager.getSession(sessionCode);
      
      expect(leaveResult.sessionDeleted).toBe(false);
      expect(session).toBeDefined();
      expect(session!.participants).toHaveLength(1);
      expect(session!.participants[0].id).toBe(janeId);
    });
  });

  describe('updateParticipantActivity', () => {
    let sessionCode: string;
    let participantId: string;

    beforeEach(async () => {
      const createResult = await sessionManager.createSession();
      sessionCode = createResult.session!.sessionCode;
      
      const joinResult = await sessionManager.joinSession(sessionCode, 'John');
      participantId = joinResult.participant!.id;
    });

    it('should update participant activity and step', async () => {
      const success = await sessionManager.updateParticipantActivity(sessionCode, participantId, 2);
      
      expect(success).toBe(true);
      
      const session = await sessionManager.getSession(sessionCode);
      const participant = session!.participants.find(p => p.id === participantId);
      
      expect(participant!.currentStep).toBe(2);
    });

    it('should return false for non-existent session', async () => {
      const success = await sessionManager.updateParticipantActivity('ABC123', participantId, 2);
      expect(success).toBe(false);
    });

    it('should return false for non-existent participant', async () => {
      const success = await sessionManager.updateParticipantActivity(sessionCode, 'fake-id', 2);
      expect(success).toBe(false);
    });
  });
});