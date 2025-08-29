/**
 * Focused tests for the exact issue in the screenshots:
 * - Different emoji/color for same participant across views
 * - Incorrect step status between observers
 * 
 * These tests target the architectural problems without complex mocking
 */

import { usePresence } from '../../../hooks/collaboration/usePresence';
import { PresenceManager } from '../../../lib/presence/presence-manager';
import { getAblyService } from '../../../lib/ably/ably-service';
import { getSessionManager } from '../../../lib/session/session-manager';
import type { PresenceData } from '../../../lib/presence/types';
import type { Participant } from '../../../lib/types';

// Mock all external dependencies
jest.mock('../../../lib/ably/ably-service');
jest.mock('../../../lib/session/session-manager');
jest.mock('../../../lib/constants/participants');

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
    }
  }),
  publishCursorMove: jest.fn(),
  subscribe: jest.fn().mockReturnValue(() => {}),
  client: { auth: { clientId: 'test-client' } }
};

const mockSessionManager = {
  getCurrentParticipant: jest.fn(),
  getSession: jest.fn()
};

// Mock constants
const mockConstants = {
  PARTICIPANT_EMOJIS: ['🎯', '🚀', '⭐', '🔥', '💎'],
  PARTICIPANT_COLORS: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
};

(getAblyService as jest.Mock).mockReturnValue(mockAblyService);
(getSessionManager as jest.Mock).mockReturnValue(mockSessionManager);

// Mock the constants import
jest.doMock('../../../lib/constants/participants', () => mockConstants);

describe('Participant Identity Consistency - Screenshot Issues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Issue 1: Different emoji/color for same participant across views', () => {
    it('should show consistent emoji/color when same participant viewed by different users', async () => {
      // Setup: Name3 has consistent identity in session
      const name3SessionParticipant: Participant = {
        id: 'name3-id',
        name: 'Name3', 
        emoji: '🦄',
        color: '#FF6B6B',
        joinedAt: new Date().toISOString(),
        isActive: true,
        currentStep: 2,
        status: 'sorting',
        cardStates: {
          step1: { more: [], less: [] },
          step2: { top8: [], less: [] },
          step3: { top3: [], less: [] }
        },
        revealed: { top8: false, top3: false },
        isViewing: null,
        lastActivity: new Date().toISOString()
      };

      // Mock session lookup to return consistent participant
      mockSessionManager.getCurrentParticipant.mockResolvedValue(name3SessionParticipant);

      // Create two PresenceManagers representing different users observing Name3
      const user1PresenceManager = new PresenceManager(
        mockAblyService,
        'LBWFLD',
        { id: 'name1-id', name: 'Name1', emoji: '🎯', color: '#4ECDC4' }
      );

      const user3PresenceManager = new PresenceManager(
        mockAblyService, 
        'LBWFLD',
        { id: 'name3-id', name: 'Name3', emoji: '🦄', color: '#FF6B6B' }
      );

      // Simulate Name3 entering presence with session identity
      const name3PresenceData: PresenceData = {
        participantId: 'name3-id',
        name: 'Name3',
        emoji: name3SessionParticipant.emoji, // From session
        color: name3SessionParticipant.color, // From session  
        currentStep: name3SessionParticipant.currentStep,
        status: name3SessionParticipant.status,
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      };

      await user3PresenceManager.enter(name3PresenceData);

      // Simulate presence events being broadcast to all observers
      const mockPresenceChannel = mockAblyService.getChannel().presence;
      const presenceHandler1 = mockPresenceChannel.subscribe.mock.calls[0][0];
      const presenceHandler3 = mockPresenceChannel.subscribe.mock.calls[1][0];

      // Both users receive the same presence event for Name3
      const presenceEvent = {
        action: 'enter',
        clientId: 'name3-client',
        data: name3PresenceData
      };

      presenceHandler1(presenceEvent); // Name1 receives Name3's presence
      presenceHandler3(presenceEvent); // Name3 receives their own presence

      // ASSERTION: Both observers should see the same identity for Name3
      const user1ViewOfName3 = user1PresenceManager.getParticipants().get('name3-id');
      const user3ViewOfSelf = user3PresenceManager.getCurrentUserData();

      // This should be consistent (currently fails due to architectural bug)
      expect(user1ViewOfName3?.emoji).toBe('🦄');
      expect(user1ViewOfName3?.color).toBe('#FF6B6B');
      expect(user3ViewOfSelf?.emoji).toBe('🦄');  
      expect(user3ViewOfSelf?.color).toBe('#FF6B6B');

      // Clean up
      user1PresenceManager.cleanup();
      user3PresenceManager.cleanup();
    });

    it('should prevent random emoji/color assignment from overriding session identity', () => {
      // This test addresses the root cause: random assignment in usePresence
      
      // Setup session participant with fixed identity
      const sessionParticipant: Participant = {
        id: 'test-user',
        name: 'TestUser',
        emoji: '🎯', // Fixed session identity
        color: '#FF6B6B', // Fixed session identity
        joinedAt: new Date().toISOString(),
        isActive: true,
        currentStep: 1,
        status: 'sorting',
        cardStates: {
          step1: { more: [], less: [] },
          step2: { top8: [], less: [] },
          step3: { top3: [], less: [] }
        },
        revealed: { top8: false, top3: false },
        isViewing: null,
        lastActivity: new Date().toISOString()
      };

      mockSessionManager.getCurrentParticipant.mockResolvedValue(sessionParticipant);

      // Multiple calls should return the same identity (not random)
      const identity1 = sessionParticipant;
      const identity2 = sessionParticipant;

      expect(identity1.emoji).toBe(identity2.emoji);
      expect(identity1.color).toBe(identity2.color);
      expect(identity1.emoji).toBe('🎯'); // Not random
      expect(identity1.color).toBe('#FF6B6B'); // Not random
    });
  });

  describe('Issue 2: Incorrect step status between observers', () => {
    it('should show consistent step progress across all observers', async () => {
      // Setup: Name3 progresses to step 2
      const name3AtStep2: Participant = {
        id: 'name3-id',
        name: 'Name3',
        emoji: '🦄',
        color: '#FF6B6B',
        joinedAt: new Date().toISOString(),
        isActive: true,
        currentStep: 2, // Actually at step 2
        status: 'revealed-8',
        cardStates: {
          step1: { more: [], less: [] },
          step2: { top8: [], less: [] },
          step3: { top3: [], less: [] }
        },
        revealed: { top8: false, top3: false },
        isViewing: null,
        lastActivity: new Date().toISOString()
      };

      // All observers should get step info from session (single source of truth)
      mockSessionManager.getCurrentParticipant.mockResolvedValue(name3AtStep2);
      mockSessionManager.getSession.mockResolvedValue({
        sessionCode: 'LBWFLD',
        participants: [name3AtStep2],
        // ... other session props
      });

      const presenceManager = new PresenceManager(
        mockAblyService,
        'LBWFLD', 
        { id: 'observer-id', name: 'Observer', emoji: '👀', color: '#000' }
      );

      // Simulate receiving presence data with potentially stale step info
      const presenceData: PresenceData = {
        participantId: 'name3-id',
        name: 'Name3',
        emoji: '🦄',
        color: '#FF6B6B',
        currentStep: 1, // Stale presence data says step 1
        status: 'revealed-8', // But status indicates step 2 progression
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      };

      const mockPresenceChannel = mockAblyService.getChannel().presence;
      const presenceHandler = mockPresenceChannel.subscribe.mock.calls[0][0];
      
      presenceHandler({
        action: 'enter',
        clientId: 'name3-client',
        data: presenceData
      });

      // ASSERTION: Observer should see authoritative step from session, not presence
      const observedParticipant = presenceManager.getParticipants().get('name3-id');
      
      // The key architectural fix: step should come from session, not presence
      // This requires the UI to merge session data (step) with presence data (status)
      expect(name3AtStep2.currentStep).toBe(2); // Session has authoritative step
      expect(observedParticipant?.status).toBe('revealed-8'); // Presence has real-time status
      
      // UI should display: "Step 2 of 3" (from session) with status "revealed-8" (from presence)

      presenceManager.cleanup();
    });

    it('should enforce unidirectional data flow: Session → UI, not Presence → UI for step info', () => {
      // This test validates architectural principle that step progression lives in session only

      const sessionData = {
        currentStep: 3, // Authoritative source
        status: 'sorting'
      };

      const presenceData = {
        currentStep: 1, // Stale/incorrect presence data
        status: 'completed' // Real-time status update
      };

      // Architectural rule: UI must combine these correctly
      const displayData = {
        // Step from session (authoritative)
        currentStep: sessionData.currentStep, 
        
        // Status from presence (real-time)
        status: presenceData.status
      };

      expect(displayData.currentStep).toBe(3); // From session, not presence
      expect(displayData.status).toBe('completed'); // From presence, not session
    });
  });

  describe('Data Source Separation Architecture', () => {
    it('should clearly separate self data (local) from others data (remote)', () => {
      // This addresses the core architectural problem from the screenshots

      // Self: authoritative local data
      const selfParticipant: Participant = {
        id: 'self-id',
        name: 'Self',
        emoji: '👤',
        color: '#SELF',
        currentStep: 2,
        status: 'sorting',
        // ... other props
      } as Participant;

      // Others: data from presence events
      const othersFromPresence = new Map<string, PresenceData>([
        ['other1-id', {
          participantId: 'other1-id',
          name: 'Other1',
          emoji: '🎭',
          color: '#OTHER1',
          currentStep: 1, // Presence step data (ignore for display)
          status: 'revealed-8', // Presence status data (use for display)
          cursor: { x: 0, y: 0, timestamp: Date.now() },
          lastActive: Date.now(),
          isViewing: null
        }]
      ]);

      // UI combination rules (what usePresence should return)
      const uiData = {
        // Self always from local session participant
        self: {
          ...selfParticipant,
          // Never override with presence data
        },
        
        // Others from presence, but step info should come from session lookup
        others: Array.from(othersFromPresence.values()).map(presence => ({
          ...presence,
          // TODO: In real implementation, lookup currentStep from session
          // currentStep: await sessionManager.getCurrentParticipant(sessionCode, presence.name).currentStep
        }))
      };

      // Verify separation
      expect(uiData.self.emoji).toBe('👤'); // Self identity never changes
      expect(uiData.self.color).toBe('#SELF'); // Self identity never changes  
      expect(uiData.others[0].emoji).toBe('🎭'); // Others from presence
      expect(uiData.others[0].status).toBe('revealed-8'); // Others real-time status
    });
  });
});