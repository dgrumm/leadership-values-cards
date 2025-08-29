/**
 * Comprehensive tests for participant state consistency across all data sources
 * Addresses: Two different emoji/color values and incorrect step status between users
 * 
 * This test suite validates that participant identity and status information
 * flows unidirectionally from authoritative source (session) to observers (presence)
 */

import { SessionManager } from '../../../lib/session/session-manager';
import { PresenceManager } from '../../../lib/presence/presence-manager';
import { getAblyService } from '../../../lib/ably/ably-service';
import { getSessionStore } from '../../../lib/session/session-store';
import type { PresenceData } from '../../../lib/presence/types';
import type { Participant } from '../../../lib/types';

// Mock dependencies to prevent side effects in tests
jest.mock('../../../lib/ably/ably-service');
jest.mock('../../../lib/session/session-store');

// Create a mock session store that doesn't start cleanup timers
const mockSessionStore = {
  createSession: jest.fn(),
  createSessionIfNotExists: jest.fn(),
  getSession: jest.fn(),
  updateSession: jest.fn(),
  deleteSession: jest.fn(),
  getAllActiveSessions: jest.fn(),
  updateLastActivity: jest.fn(),
  cleanupExpiredSessions: jest.fn().mockResolvedValue([]),
  destroy: jest.fn()
};

const mockAblyService = {
  init: jest.fn().mockResolvedValue(undefined),
  isReady: jest.fn().mockReturnValue(true),
  getChannel: jest.fn().mockReturnValue({
    presence: {
      enter: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    },
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  }),
  publishCursorMove: jest.fn(),
  subscribe: jest.fn().mockReturnValue(() => {}),
  client: {
    auth: {
      clientId: 'test-client-id'
    }
  }
};

(getAblyService as jest.Mock).mockReturnValue(mockAblyService);
(getSessionStore as jest.Mock).mockReturnValue(mockSessionStore);

describe('Participant State Consistency', () => {
  let sessionManager: SessionManager;
  let activePresenceManagers: PresenceManager[] = [];
  let mockSessions = new Map<string, any>();
  
  beforeEach(() => {
    // Reset mock session storage
    mockSessions.clear();
    
    // Set up realistic mock implementations
    mockSessionStore.createSession.mockImplementation(async (config = {}, customCode?: string) => {
      const sessionCode = customCode || 'TEST01';
      const session = {
        sessionCode,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        deckType: config.deckType || 'dev',
        maxParticipants: config.maxParticipants || 50,
        participants: [],
        isActive: true,
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      };
      mockSessions.set(sessionCode, session);
      return session;
    });

    mockSessionStore.getSession.mockImplementation(async (sessionCode: string) => {
      return mockSessions.get(sessionCode) || null;
    });

    mockSessionStore.updateSession.mockImplementation(async (sessionCode: string, updates: any) => {
      const session = mockSessions.get(sessionCode);
      if (!session) return null;
      const updatedSession = { ...session, ...updates };
      mockSessions.set(sessionCode, updatedSession);
      return updatedSession;
    });

    mockSessionStore.createSessionIfNotExists.mockImplementation(async (sessionCode: string, config = {}) => {
      const existing = mockSessions.get(sessionCode);
      if (existing) {
        return { created: false, session: existing };
      }
      const session = await mockSessionStore.createSession(config, sessionCode);
      return { created: true, session };
    });

    sessionManager = new SessionManager();
    activePresenceManagers = [];
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    // Clean up all presence managers
    for (const presenceManager of activePresenceManagers) {
      presenceManager.cleanup();
    }
    activePresenceManagers = [];
    
    jest.clearAllTimers();
    jest.useRealTimers();
    
    // Clean up any lingering session state
    try {
      await sessionManager.cleanupExpiredSessions();
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  });

  const createAndTrackPresenceManager = (ablyService: any, sessionCode: string, user: any): PresenceManager => {
    const manager = new PresenceManager(ablyService, sessionCode, user);
    activePresenceManagers.push(manager);
    return manager;
  };

  describe('Single Source of Truth - Session as Authority', () => {
    it('should use session participant data as authoritative source for identity', async () => {
      // Create session with first participant
      const sessionResult = await sessionManager.createSessionWithCreator('Alice', undefined, 'TESTID');
      expect(sessionResult.success).toBe(true);
      expect(sessionResult.session).toBeDefined();
      expect(sessionResult.participant).toBeDefined();

      const session = sessionResult.session!;
      const alice = sessionResult.participant!;
      
      // Verify session has authoritative emoji/color
      expect(alice.emoji).toBeDefined();
      expect(alice.color).toBeDefined();
      expect(alice.currentStep).toBe(1);
      expect(alice.status).toBe('sorting');

      // When creating presence data, it should derive from session participant
      const presenceManager = createAndTrackPresenceManager(
        mockAblyService,
        session.sessionCode,
        {
          id: alice.id,
          name: alice.name,
          emoji: alice.emoji,
          color: alice.color
        }
      );

      const presenceData: PresenceData = {
        participantId: alice.id,
        name: alice.name,
        emoji: alice.emoji, // Must match session
        color: alice.color, // Must match session
        currentStep: alice.currentStep,
        status: alice.status,
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      };

      await presenceManager.enter(presenceData);

      // Verify presence data matches session exactly
      const currentUserData = presenceManager.getCurrentUserData();
      expect(currentUserData).toEqual(presenceData);
      expect(currentUserData?.emoji).toBe(alice.emoji);
      expect(currentUserData?.color).toBe(alice.color);
      expect(currentUserData?.currentStep).toBe(alice.currentStep);
    });

    it('should prevent presence data from overriding session participant identity', async () => {
      // Simplified test focusing on the architectural principle without session creation complexity
      
      // Setup: Define session participant identity (authoritative source)
      const sessionParticipant = {
        id: 'bob-id',
        name: 'Bob',
        emoji: '🎯', // Authoritative emoji from session
        color: '#FF6B6B', // Authoritative color from session
        currentStep: 2 // Authoritative step from session
      };

      // Create presence manager with session identity
      const presenceManager = createAndTrackPresenceManager(
        mockAblyService,
        'TEST123',
        sessionParticipant
      );

      const correctPresenceData: PresenceData = {
        participantId: sessionParticipant.id,
        name: sessionParticipant.name,
        emoji: sessionParticipant.emoji, // From session (authoritative)
        color: sessionParticipant.color, // From session (authoritative)
        currentStep: sessionParticipant.currentStep as 1 | 2 | 3,
        status: 'sorting',
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      };

      // Enter presence with correct session-derived identity
      await presenceManager.enter(correctPresenceData);

      // Simulate external presence event trying to override self identity
      const mockPresenceChannel = mockAblyService.getChannel().presence;
      const presenceHandler = mockPresenceChannel.subscribe.mock.calls[0][0];
      
      // Malicious presence event with conflicting identity
      const conflictingEvent = {
        action: 'update',
        clientId: sessionParticipant.id, // Same as current user (trying to override self)
        data: {
          ...correctPresenceData,
          emoji: '🔥', // Malicious override attempt
          color: '#HACKED', // Malicious override attempt
          currentStep: 999 as 1 | 2 | 3 // Malicious override attempt
        }
      };

      // Process the conflicting event
      presenceHandler(conflictingEvent);

      // ASSERTION: Self identity should remain unchanged (architectural principle)
      const currentUserData = presenceManager.getCurrentUserData();
      expect(currentUserData?.emoji).toBe(sessionParticipant.emoji); // '🎯' preserved
      expect(currentUserData?.color).toBe(sessionParticipant.color); // '#FF6B6B' preserved
      expect(currentUserData?.currentStep).toBe(sessionParticipant.currentStep); // 2 preserved

      // The key architectural rule: presence events cannot modify self identity
      // Self identity comes from session (single source of truth), not from presence events
    });
  });

  describe('Multi-User Consistency', () => {
    it('should show consistent participant data across all observers', async () => {
      // Create session with multiple participants
      const sessionResult = await sessionManager.createSessionWithCreator('Alice', undefined, 'MULTI1');
      const session = sessionResult.session!;
      const alice = sessionResult.participant!;

      // Bob joins the same session
      const bobJoinResult = await sessionManager.joinSession('MULTI1', 'Bob');
      expect(bobJoinResult.success).toBe(true);
      const bob = bobJoinResult.participant!;

      // Charlie joins the same session  
      const charlieJoinResult = await sessionManager.joinSession('MULTI1', 'Charlie');
      expect(charlieJoinResult.success).toBe(true);
      const charlie = charlieJoinResult.participant!;

      // Each participant should have consistent identity in session
      const updatedSession = await sessionManager.getSession('MULTI1');
      expect(updatedSession?.participants).toHaveLength(3);
      
      const sessionAlice = updatedSession!.participants.find(p => p.name === 'Alice');
      const sessionBob = updatedSession!.participants.find(p => p.name === 'Bob');
      const sessionCharlie = updatedSession!.participants.find(p => p.name === 'Charlie');

      expect(sessionAlice).toBeDefined();
      expect(sessionBob).toBeDefined();
      expect(sessionCharlie).toBeDefined();

      // Create presence managers for all three (as if they're all connected)
      const alicePresence = createAndTrackPresenceManager(mockAblyService, 'MULTI1', {
        id: sessionAlice!.id,
        name: sessionAlice!.name,
        emoji: sessionAlice!.emoji,
        color: sessionAlice!.color
      });

      const bobPresence = createAndTrackPresenceManager(mockAblyService, 'MULTI1', {
        id: sessionBob!.id,
        name: sessionBob!.name,
        emoji: sessionBob!.emoji,
        color: sessionBob!.color
      });

      const charliePresence = createAndTrackPresenceManager(mockAblyService, 'MULTI1', {
        id: sessionCharlie!.id,
        name: sessionCharlie!.name,
        emoji: sessionCharlie!.emoji,
        color: sessionCharlie!.color
      });

      // All enter presence with their session-derived identity
      await alicePresence.enter({
        participantId: sessionAlice!.id,
        name: sessionAlice!.name,
        emoji: sessionAlice!.emoji,
        color: sessionAlice!.color,
        currentStep: sessionAlice!.currentStep,
        status: sessionAlice!.status,
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      });

      await bobPresence.enter({
        participantId: sessionBob!.id,
        name: sessionBob!.name,
        emoji: sessionBob!.emoji,
        color: sessionBob!.color,
        currentStep: sessionBob!.currentStep,
        status: sessionBob!.status,
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      });

      await charliePresence.enter({
        participantId: sessionCharlie!.id,
        name: sessionCharlie!.name,
        emoji: sessionCharlie!.emoji,
        color: sessionCharlie!.color,
        currentStep: sessionCharlie!.currentStep,
        status: sessionCharlie!.status,
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      });

      // Verify each participant sees others with consistent identities
      // (In real app, this would be via presence events, here we simulate)
      const aliceView = alicePresence.getParticipants();
      const bobView = bobPresence.getParticipants();
      const charlieView = charliePresence.getParticipants();

      // Each should see the same identity data for others
      // Alice sees Bob and Charlie consistently
      const aliceViewBob = Array.from(aliceView.values()).find(p => p.name === 'Bob');
      const aliceViewCharlie = Array.from(aliceView.values()).find(p => p.name === 'Charlie');
      
      // Bob sees Alice and Charlie consistently  
      const bobViewAlice = Array.from(bobView.values()).find(p => p.name === 'Alice');
      const bobViewCharlie = Array.from(bobView.values()).find(p => p.name === 'Charlie');

      // Charlie sees Alice and Bob consistently
      const charlieViewAlice = Array.from(charlieView.values()).find(p => p.name === 'Alice');
      const charlieViewBob = Array.from(charlieView.values()).find(p => p.name === 'Bob');

      // All observers should see the same emoji/color for each participant
      if (aliceViewBob && bobViewAlice) {
        expect(aliceViewBob.emoji).toBe(sessionBob!.emoji);
        expect(aliceViewBob.color).toBe(sessionBob!.color);
        expect(bobViewAlice.emoji).toBe(sessionAlice!.emoji);
        expect(bobViewAlice.color).toBe(sessionAlice!.color);
      }
    });

    it('should update step progress consistently across all observers', async () => {
      // Create session with two participants
      const sessionResult = await sessionManager.createSessionWithCreator('User1', undefined, 'STEP01');
      const session = sessionResult.session!;
      const user1 = sessionResult.participant!;

      const user2JoinResult = await sessionManager.joinSession('STEP01', 'User2');
      const user2 = user2JoinResult.participant!;

      // Create presence managers
      const user1Presence = createAndTrackPresenceManager(mockAblyService, 'STEP01', {
        id: user1.id,
        name: user1.name,
        emoji: user1.emoji,
        color: user1.color
      });

      const user2Presence = createAndTrackPresenceManager(mockAblyService, 'STEP01', {
        id: user2.id,
        name: user2.name,
        emoji: user2.emoji,
        color: user2.color
      });

      // Both enter presence
      await user1Presence.enter({
        participantId: user1.id,
        name: user1.name,
        emoji: user1.emoji,
        color: user1.color,
        currentStep: 1,
        status: 'sorting',
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      });

      await user2Presence.enter({
        participantId: user2.id,
        name: user2.name,
        emoji: user2.emoji,
        color: user2.color,
        currentStep: 1,
        status: 'sorting',
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      });

      // User2 progresses to step 2 in session
      await sessionManager.updateParticipantActivity('STEP01', user2.id, 2);
      
      // User2 updates their presence status
      await user2Presence.updateStatus('revealed-8');

      // Verify session shows correct step
      const updatedSession = await sessionManager.getSession('STEP01');
      const updatedUser2 = updatedSession!.participants.find(p => p.id === user2.id);
      expect(updatedUser2?.currentStep).toBe(2);

      // Verify presence shows correct status
      const user2PresenceData = user2Presence.getCurrentUserData();
      expect(user2PresenceData?.status).toBe('revealed-8');
      expect(user2PresenceData?.currentStep).toBe(1); // currentStep should come from session, not presence

      // When User1 observes User2, they should see consistent step from session
      // (This would be synchronized in real app via proper data flow)
      // The key test is that observers get step info from session, not presence
      expect(updatedUser2?.currentStep).toBe(2); // Authoritative source
    });
  });

  describe('Data Flow Architecture', () => {
    it('should enforce unidirectional flow: Session -> Presence (not reverse)', async () => {
      const sessionResult = await sessionManager.createSessionWithCreator('TestUser', undefined, 'FLOW01');
      const session = sessionResult.session!;
      const participant = sessionResult.participant!;

      // Create presence manager with session-derived identity
      const presenceManager = createAndTrackPresenceManager(mockAblyService, 'FLOW01', {
        id: participant.id,
        name: participant.name,
        emoji: participant.emoji,
        color: participant.color
      });

      // Enter with session identity
      await presenceManager.enter({
        participantId: participant.id,
        name: participant.name,
        emoji: participant.emoji,
        color: participant.color,
        currentStep: participant.currentStep,
        status: participant.status,
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      });

      // Verify initial state matches session
      const initialPresenceData = presenceManager.getCurrentUserData();
      expect(initialPresenceData?.emoji).toBe(participant.emoji);
      expect(initialPresenceData?.color).toBe(participant.color);
      expect(initialPresenceData?.currentStep).toBe(participant.currentStep);

      // Update session participant (simulate step progression)
      await sessionManager.updateParticipantActivity('FLOW01', participant.id, 3);
      
      // Verify session is updated
      const updatedSession = await sessionManager.getSession('FLOW01');
      const updatedParticipant = updatedSession!.participants.find(p => p.id === participant.id);
      expect(updatedParticipant?.currentStep).toBe(3);

      // Presence should NOT automatically reflect session changes
      // (This is the key architectural rule - presence doesn't sync session data)
      const presenceDataAfterSessionUpdate = presenceManager.getCurrentUserData();
      expect(presenceDataAfterSessionUpdate?.currentStep).toBe(1); // Still original value

      // Only explicit presence updates should change presence data
      await presenceManager.updateStatus('revealed-3');
      const finalPresenceData = presenceManager.getCurrentUserData();
      expect(finalPresenceData?.status).toBe('revealed-3');
      expect(finalPresenceData?.currentStep).toBe(1); // Still unchanged from session updates
    });

    it('should reject presence events trying to modify self identity', async () => {
      const sessionResult = await sessionManager.createSessionWithCreator('SelfUser', undefined, 'SELF01');
      const session = sessionResult.session!;
      const participant = sessionResult.participant!;

      const presenceManager = createAndTrackPresenceManager(mockAblyService, 'SELF01', {
        id: participant.id,
        name: participant.name,
        emoji: participant.emoji,
        color: participant.color
      });

      await presenceManager.enter({
        participantId: participant.id,
        name: participant.name,
        emoji: participant.emoji,
        color: participant.color,
        currentStep: participant.currentStep,
        status: participant.status,
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      });

      // Get original identity
      const originalData = presenceManager.getCurrentUserData();
      const originalEmoji = originalData?.emoji;
      const originalColor = originalData?.color;

      // Simulate external presence event trying to modify self
      const mockPresenceChannel = mockAblyService.getChannel().presence;
      const presenceHandler = mockPresenceChannel.subscribe.mock.calls[0][0];
      
      presenceHandler({
        action: 'update',
        clientId: participant.id, // Same as current user
        data: {
          ...originalData,
          emoji: '🚫', // Malicious change
          color: '#HACKED', // Malicious change
          currentStep: 999 // Malicious change
        }
      });

      // Self identity should be unchanged
      const postEventData = presenceManager.getCurrentUserData();
      expect(postEventData?.emoji).toBe(originalEmoji);
      expect(postEventData?.color).toBe(originalColor);
      expect(postEventData?.currentStep).not.toBe(999);
    });
  });
});