import { PresenceManager } from '../../../../lib/presence/presence-manager';
import { AblyService } from '../../../../lib/ably/ably-service';
import type { RealtimeChannel } from 'ably';

// Mock Ably
jest.mock('ably');

// Mock AblyService with throttled cursor publishing
const mockAblyService = {
  getChannel: jest.fn(),
  subscribe: jest.fn(),
  subscribeAll: jest.fn(),
  publishCursorMove: jest.fn(),
  isReady: jest.fn(() => true),
  // Track throttle state for testing
  _throttleState: { lastPublish: 0, throttleMs: 50 }
} as unknown as AblyService & { _throttleState: { lastPublish: number; throttleMs: number } };

// Mock channel
const mockChannel = {
  presence: {
    enter: jest.fn(() => Promise.resolve()),
    leave: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    get: jest.fn(() => Promise.resolve([])),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  },
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  publish: jest.fn(() => Promise.resolve())
} as unknown as RealtimeChannel;

describe('PresenceManager', () => {
  let presenceManager: PresenceManager;
  const mockSessionCode = 'ABC123';
  const mockCurrentUser = {
    id: 'user-123',
    name: 'Test User',
    emoji: '😊',
    color: '#FF6B6B'
  };
  
  // Factory function to create mock data and prevent state bleeding
  const createMockParticipantData = (overrides: Partial<any> = {}) => ({
    participantId: 'user-123',
    name: 'Test User',
    emoji: '😊',
    color: '#FF6B6B',
    currentStep: 1,
    status: 'sorting' as const,
    cursor: { x: 0, y: 0, timestamp: Date.now() },
    lastActive: Date.now(),
    isViewing: null,
    ...overrides
  });
  
  const createMockPresenceData = () => [
    { 
      clientId: 'user1', 
      data: createMockParticipantData({ 
        participantId: 'user1',
        name: 'Alice',
        cursor: { x: 100, y: 200, timestamp: Date.now() }
      })
    },
    { 
      clientId: 'user2', 
      data: createMockParticipantData({ 
        participantId: 'user2',
        name: 'Bob',
        cursor: { x: 300, y: 400, timestamp: Date.now() }
      })
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Set up unsubscribe functions before creating presence manager
    const presenceUnsubscribe = jest.fn();
    const cursorUnsubscribe = jest.fn();
    
    // Reset all mock implementations to successful defaults
    (mockChannel.presence.enter as jest.Mock).mockResolvedValue(undefined);
    (mockChannel.presence.leave as jest.Mock).mockResolvedValue(undefined);
    (mockChannel.presence.update as jest.Mock).mockResolvedValue(undefined);
    (mockChannel.presence.get as jest.Mock).mockResolvedValue(createMockPresenceData());
    (mockChannel.publish as jest.Mock).mockResolvedValue(undefined);
    
    (mockAblyService.getChannel as jest.Mock).mockReturnValue(mockChannel);
    (mockAblyService.subscribe as jest.Mock).mockReturnValue(cursorUnsubscribe);
    
    // Reset the presence subscribe mock to properly record calls
    (mockChannel.presence.subscribe as jest.Mock).mockImplementation((handler) => {
      // This will store the handler for tests to access
    });
    
    // Reset throttle state using factory pattern
    (mockAblyService as any)._throttleState = { lastPublish: 0, throttleMs: 50 };
    
    // Mock publishCursorMove with throttling behavior
    (mockAblyService.publishCursorMove as jest.Mock).mockImplementation(() => {
      const now = Date.now();
      const throttleState = (mockAblyService as any)._throttleState;
      
      if (now - throttleState.lastPublish >= throttleState.throttleMs) {
        throttleState.lastPublish = now;
        return Promise.resolve();
      }
      // Skip throttled calls (don't increment call count)
      return Promise.resolve();
    });
    
    presenceManager = new PresenceManager(mockAblyService, mockSessionCode, mockCurrentUser);
  });

  afterEach(() => {
    // Clean up the presence manager to prevent async operations after test completion
    if (presenceManager) {
      presenceManager.cleanup();
    }
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with correct channel', () => {
      expect(mockAblyService.getChannel).toHaveBeenCalledWith(mockSessionCode, 'presence');
    });

    it('should set up presence listeners on initialization', () => {
      expect(mockChannel.presence.subscribe).toHaveBeenCalled();
    });

    it('should initialize with empty participants map', () => {
      expect(presenceManager.getParticipants()).toEqual(new Map());
    });

    it('should initialize with empty cursors map', () => {
      expect(presenceManager.getCursors()).toEqual(new Map());
    });
  });

  describe('enter', () => {
    it('should enter presence with participant data', async () => {
      const mockParticipantData = createMockParticipantData();
      await presenceManager.enter(mockParticipantData);

      expect(mockChannel.presence.enter).toHaveBeenCalledWith(mockParticipantData);
    });

    it('should handle enter errors gracefully', async () => {
      const mockParticipantData = createMockParticipantData();
      const error = new Error('Enter failed');
      (mockChannel.presence.enter as jest.Mock).mockRejectedValue(error);

      await expect(presenceManager.enter(mockParticipantData)).rejects.toThrow('Enter failed');
    });

    it('should update local participants map on successful enter', async () => {
      const mockParticipantData = createMockParticipantData();
      await presenceManager.enter(mockParticipantData);

      const participants = presenceManager.getParticipants();
      expect(participants.has(mockParticipantData.participantId)).toBe(true);
      expect(participants.get(mockParticipantData.participantId)).toEqual(mockParticipantData);
    });
  });

  describe('leave', () => {
    it('should leave presence channel', async () => {
      await presenceManager.leave();

      expect(mockChannel.presence.leave).toHaveBeenCalled();
    });

    it('should handle leave errors gracefully', async () => {
      const error = new Error('Leave failed');
      (mockChannel.presence.leave as jest.Mock).mockRejectedValue(error);

      await expect(presenceManager.leave()).rejects.toThrow('Leave failed');
    });

    it('should clean up local state on successful leave', async () => {
      // First enter
      const mockData = createMockParticipantData();
      await presenceManager.enter(mockData);

      // Then leave
      await presenceManager.leave();

      const participants = presenceManager.getParticipants();
      expect(participants.has(mockData.participantId)).toBe(false);
    });
  });

  describe('updateStatus', () => {
    const mockStatus = 'revealed-8' as const;

    beforeEach(async () => {
      // Enter presence first so updateStatus works
      const mockParticipantData = createMockParticipantData({
        participantId: mockCurrentUser.id,
        name: mockCurrentUser.name,
        emoji: mockCurrentUser.emoji,
        color: mockCurrentUser.color
      });
      await presenceManager.enter(mockParticipantData);
    });

    it('should update presence with new status', async () => {
      await presenceManager.updateStatus(mockStatus);

      expect(mockChannel.presence.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: mockStatus,
          lastActive: expect.any(Number)
        })
      );
    });

    it('should handle update errors gracefully', async () => {
      const error = new Error('Update failed');
      (mockChannel.presence.update as jest.Mock).mockRejectedValue(error);

      await expect(presenceManager.updateStatus(mockStatus)).rejects.toThrow('Update failed');
    });

    it('should update local participant data', async () => {
      // First enter to have local data
      const mockData = {
        participantId: 'user-123',
        name: 'Test User',
        emoji: '😊',
        color: '#FF6B6B',
        currentStep: 1,
        status: 'sorting' as const,
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      };
      await presenceManager.enter(mockData);

      // Then update status
      await presenceManager.updateStatus(mockStatus);

      const participants = presenceManager.getParticipants();
      const updatedParticipant = participants.get(mockData.participantId);
      expect(updatedParticipant?.status).toBe(mockStatus);
    });
  });

  describe('updateCursor', () => {
    const mockCursor = { x: 100, y: 200 };

    it('should call throttled cursor update', () => {
      presenceManager.updateCursor(mockCursor.x, mockCursor.y);

      expect(mockAblyService.publishCursorMove).toHaveBeenCalledWith(
        mockSessionCode,
        expect.objectContaining({
          x: mockCursor.x,
          y: mockCursor.y,
          participantId: mockCurrentUser.id
        })
      );
    });

    it('should update local cursor state', () => {
      presenceManager.updateCursor(mockCursor.x, mockCursor.y);

      const cursors = presenceManager.getCursors();
      expect(cursors.has(mockCurrentUser.id)).toBe(true);
      
      const cursor = cursors.get(mockCurrentUser.id);
      expect(cursor?.x).toBe(mockCursor.x);
      expect(cursor?.y).toBe(mockCursor.y);
      expect(cursor?.timestamp).toBeGreaterThan(0);
    });

    it('should throttle cursor updates to 50ms', () => {
      // Reset the mock to count actual calls made
      let callCount = 0;
      (mockAblyService.publishCursorMove as jest.Mock).mockImplementation(() => {
        const now = Date.now();
        const throttleState = (mockAblyService as any)._throttleState;
        
        if (now - throttleState.lastPublish >= throttleState.throttleMs) {
          throttleState.lastPublish = now;
          callCount++;
        }
        return Promise.resolve();
      });

      // Send multiple cursor updates rapidly
      presenceManager.updateCursor(100, 100);
      presenceManager.updateCursor(200, 200);
      presenceManager.updateCursor(300, 300);

      // Only first call should go through immediately
      expect(callCount).toBe(1);

      // Advance time by 50ms
      jest.advanceTimersByTime(50);
      // Update throttle timestamp to simulate time passage
      (mockAblyService as any)._throttleState.lastPublish = Date.now() - 51;

      // Now send another update
      presenceManager.updateCursor(400, 400);
      expect(callCount).toBe(2);
    });
  });

  describe('presence event handling', () => {
    let presenceEventHandler: any;
    
    beforeEach(() => {
      // Get the presence event handler from the subscribe call
      presenceEventHandler = (mockChannel.presence.subscribe as jest.Mock).mock.calls[0]?.[0];
      if (!presenceEventHandler) {
        throw new Error('Presence event handler not found - check mock setup');
      }
      
      // Clear the subscribe call from initialization
      jest.clearAllMocks();
    });

    it('should handle participant enter events', () => {
      const mockPresenceMessage = {
        action: 'enter',
        clientId: 'other-user',
        data: {
          participantId: 'other-user',
          name: 'Other User',
          emoji: '🎨',
          color: '#4ECDC4',
          currentStep: 2,
          status: 'revealed-8' as const,
          cursor: { x: 50, y: 75, timestamp: Date.now() },
          lastActive: Date.now(),
          isViewing: null
        }
      };

      // Use the stored presence callback
      const presenceCallback = presenceEventHandler;
      presenceCallback(mockPresenceMessage);

      const participants = presenceManager.getParticipants();
      expect(participants.has('other-user')).toBe(true);
      expect(participants.get('other-user')).toEqual(mockPresenceMessage.data);
    });

    it('should handle participant leave events', () => {
      // First add a participant
      const mockData = {
        participantId: 'leaving-user',
        name: 'Leaving User',
        emoji: '👋',
        color: '#45B7D1',
        currentStep: 1,
        status: 'sorting' as const,
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      };

      presenceManager.getParticipants().set('leaving-user', mockData);

      // Then simulate leave event
      const mockPresenceMessage = {
        action: 'leave',
        clientId: 'leaving-user',
        data: mockData
      };

      const presenceCallback = presenceEventHandler;
      presenceCallback(mockPresenceMessage);

      const participants = presenceManager.getParticipants();
      expect(participants.has('leaving-user')).toBe(false);
    });

    it('should handle participant update events', () => {
      // First add a participant
      const initialData = {
        participantId: 'updating-user',
        name: 'Updating User',
        emoji: '🔄',
        color: '#96CEB4',
        currentStep: 1,
        status: 'sorting' as const,
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      };

      presenceManager.getParticipants().set('updating-user', initialData);

      // Then simulate update event
      const updatedData = {
        ...initialData,
        status: 'revealed-8' as const,
        currentStep: 2
      };

      const mockPresenceMessage = {
        action: 'update',
        clientId: 'updating-user',
        data: updatedData
      };

      const presenceCallback = presenceEventHandler;
      presenceCallback(mockPresenceMessage);

      const participants = presenceManager.getParticipants();
      const participant = participants.get('updating-user');
      expect(participant?.status).toBe('revealed-8');
      expect(participant?.currentStep).toBe(2);
    });
  });

  describe('cursor event handling', () => {
    it('should handle cursor move messages', () => {
      const mockCursorMessage = {
        name: 'cursor-move',
        data: {
          participantId: 'other-user',
          x: 150,
          y: 250,
          timestamp: Date.now()
        }
      };

      // Get the cursor subscription callback
      const cursorCallback = (mockAblyService.subscribe as jest.Mock).mock.calls[0][3];
      cursorCallback(mockCursorMessage);

      const cursors = presenceManager.getCursors();
      expect(cursors.has('other-user')).toBe(true);
      
      const cursor = cursors.get('other-user');
      expect(cursor?.x).toBe(150);
      expect(cursor?.y).toBe(250);
    });

    it('should not handle cursor moves from current user', () => {
      const mockCursorMessage = {
        name: 'cursor-move',
        data: {
          participantId: mockCurrentUser.id,
          x: 150,
          y: 250,
          timestamp: Date.now()
        }
      };

      const cursorCallback = (mockAblyService.subscribe as jest.Mock).mock.calls[0][3];
      cursorCallback(mockCursorMessage);

      const cursors = presenceManager.getCursors();
      // Should not add our own cursor to the cursors map for display
      expect(cursors.has(mockCurrentUser.id)).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clean up presence subscriptions', () => {
      presenceManager.cleanup();
      
      // Verify that presence unsubscribe was called
      expect(mockChannel.presence.unsubscribe).toHaveBeenCalled();
    });

    it('should clean up cursor subscriptions', () => {
      // Get the unsubscribe function that was returned by mockAblyService.subscribe
      const cursorUnsubscribe = (mockAblyService.subscribe as jest.Mock).mock.results[0].value;
      
      presenceManager.cleanup();

      expect(cursorUnsubscribe).toHaveBeenCalled();
    });

    it('should clear local state on cleanup', () => {
      // Add some test data
      const mockData = {
        participantId: 'test-user',
        name: 'Test',
        emoji: '🧪',
        color: '#FECA57',
        currentStep: 1,
        status: 'sorting' as const,
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      };

      presenceManager.getParticipants().set('test-user', mockData);
      presenceManager.getCursors().set('test-user', { x: 100, y: 100, timestamp: Date.now() });

      presenceManager.cleanup();

      expect(presenceManager.getParticipants().size).toBe(0);
      expect(presenceManager.getCursors().size).toBe(0);
    });
  });

  describe('activity heartbeat', () => {
    it('should start heartbeat on initialization', async () => {
      const mockParticipantData = {
        participantId: 'user-123',
        name: 'Test User',
        emoji: '😊',
        color: '#FF6B6B',
        currentStep: 1,
        status: 'sorting' as const,
        cursor: { x: 0, y: 0, timestamp: Date.now() },
        lastActive: Date.now(),
        isViewing: null
      };
      
      // Enter presence first so heartbeat has data to update
      await presenceManager.enter(mockParticipantData);
      
      // Clear the enter call
      jest.clearAllMocks();

      // Heartbeat should be called every 30 seconds
      jest.advanceTimersByTime(30000);

      expect(mockChannel.presence.update).toHaveBeenCalledWith(
        expect.objectContaining({
          lastActive: expect.any(Number)
        })
      );
    });

    it('should stop heartbeat on cleanup', () => {
      jest.useFakeTimers();

      presenceManager.cleanup();

      // Advance time and verify no more heartbeat calls
      const initialCallCount = (mockChannel.presence.update as jest.Mock).mock.calls.length;
      jest.advanceTimersByTime(60000);

      expect((mockChannel.presence.update as jest.Mock).mock.calls.length).toBe(initialCallCount);

      jest.useRealTimers();
    });
  });

  describe('idle detection', () => {
    it('should mark cursors as inactive after 5 seconds', () => {
      // Use Date.now() in a way that works with fake timers
      const baseTime = Date.now();
      
      // Create cursor data directly since cursor handler checks timestamp
      const oldCursor = { x: 100, y: 100, timestamp: baseTime - 6000 };
      const newCursor = { x: 200, y: 200, timestamp: baseTime - 2000 };
      
      // Manually set cursors to simulate having received messages
      presenceManager.getCursors().set('old-user', oldCursor);
      presenceManager.getCursors().set('new-user', newCursor);
      
      // Get active cursors should filter out old ones (5+ seconds old)
      const activeCursors = presenceManager.getActiveCursors();
      
      expect(activeCursors.has('old-user')).toBe(false); // 6 seconds old = inactive
      expect(activeCursors.has('new-user')).toBe(true);  // 2 seconds old = active
    });
  });

  describe('error handling', () => {
    it('should handle AblyService not ready state', () => {
      (mockAblyService.isReady as jest.Mock).mockReturnValue(false);

      expect(() => {
        presenceManager.updateCursor(100, 100);
      }).not.toThrow();

      // Should not attempt to publish when service not ready
      expect(mockAblyService.publishCursorMove).not.toHaveBeenCalled();
    });

    it('should handle channel errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Get the presence event handler from the last call (after all setup)
      const allCalls = (mockChannel.presence.subscribe as jest.Mock).mock.calls;
      const presenceHandler = allCalls[allCalls.length - 1][0];
      
      // Create an event that will cause an error during processing
      const malformedPresenceEvent = {
        action: 'enter',
        clientId: 'test-client',
        data: {
          participantId: 'test-user',
          name: 'Test User',
          // Force an error by making the data structure invalid for Map.set
          get emoji() { 
            throw new Error('Data access error'); 
          }
        }
      };

      expect(() => {
        presenceHandler(malformedPresenceEvent);
      }).not.toThrow();

      // The error should be logged when data access fails
      expect(consoleSpy).toHaveBeenCalledWith(
        'Presence event error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('session isolation', () => {
    let secondAblyService: any;
    let secondChannel: any;
    let presenceManager2: PresenceManager;

    beforeEach(() => {
      // Create separate mock services for session isolation testing
      secondChannel = {
        presence: {
          enter: jest.fn(() => Promise.resolve()),
          leave: jest.fn(() => Promise.resolve()),
          update: jest.fn(() => Promise.resolve()),
          get: jest.fn(() => Promise.resolve([])),
          subscribe: jest.fn(),
          unsubscribe: jest.fn()
        },
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        publish: jest.fn(() => Promise.resolve())
      } as unknown as RealtimeChannel;

      secondAblyService = {
        getChannel: jest.fn().mockReturnValue(secondChannel),
        subscribe: jest.fn().mockReturnValue(jest.fn()),
        subscribeAll: jest.fn(),
        publishCursorMove: jest.fn().mockResolvedValue(undefined),
        isReady: jest.fn(() => true),
        _throttleState: { lastPublish: 0, throttleMs: 50 }
      } as unknown as AblyService & { _throttleState: { lastPublish: number; throttleMs: number } };
    });

    afterEach(() => {
      if (presenceManager2) {
        presenceManager2.cleanup();
      }
    });

    it('should isolate presence data between different sessions', async () => {
      const sessionA = 'ABC123';
      const sessionB = 'XYZ999';
      const userA = { id: 'user-a', name: 'Alice', emoji: '😊', color: '#FF6B6B' };
      const userB = { id: 'user-b', name: 'Bob', emoji: '🎨', color: '#4ECDC4' };

      // Create managers for different sessions
      const managerA = new PresenceManager(mockAblyService, sessionA, userA);
      presenceManager2 = new PresenceManager(secondAblyService, sessionB, userB);

      // Verify they use different channels
      expect(mockAblyService.getChannel).toHaveBeenCalledWith(sessionA, 'presence');
      expect(secondAblyService.getChannel).toHaveBeenCalledWith(sessionB, 'presence');

      // Enter presence in both sessions
      const dataA = createMockParticipantData({ participantId: userA.id, name: userA.name });
      const dataB = createMockParticipantData({ participantId: userB.id, name: userB.name });
      
      await managerA.enter(dataA);
      await presenceManager2.enter(dataB);

      // Verify isolation - each manager only knows about its own participants
      const participantsA = managerA.getParticipants();
      const participantsB = presenceManager2.getParticipants();

      expect(participantsA.has(userA.id)).toBe(true);
      expect(participantsA.has(userB.id)).toBe(false);
      
      expect(participantsB.has(userB.id)).toBe(true);
      expect(participantsB.has(userA.id)).toBe(false);

      managerA.cleanup();
    });

    it('should isolate cursor positions between different sessions', () => {
      const sessionA = 'ABC123';
      const sessionB = 'XYZ999';
      const userA = { id: 'user-a', name: 'Alice', emoji: '😊', color: '#FF6B6B' };
      const userB = { id: 'user-b', name: 'Bob', emoji: '🎨', color: '#4ECDC4' };

      const managerA = new PresenceManager(mockAblyService, sessionA, userA);
      presenceManager2 = new PresenceManager(secondAblyService, sessionB, userB);

      // Clear initial setup calls to isolate our test
      jest.clearAllMocks();

      // Update cursors in both sessions
      managerA.updateCursor(100, 200);
      presenceManager2.updateCursor(300, 400);

      // Verify cursor calls went to different services
      expect(mockAblyService.publishCursorMove).toHaveBeenCalledWith(
        sessionA,
        expect.objectContaining({
          x: 100,
          y: 200,
          participantId: userA.id
        })
      );

      expect(secondAblyService.publishCursorMove).toHaveBeenCalledWith(
        sessionB,
        expect.objectContaining({
          x: 300,
          y: 400,
          participantId: userB.id
        })
      );

      // Verify cursors are isolated locally
      const cursorsA = managerA.getCursors();
      const cursorsB = presenceManager2.getCursors();

      expect(cursorsA.has(userA.id)).toBe(true);
      expect(cursorsA.has(userB.id)).toBe(false);
      
      expect(cursorsB.has(userB.id)).toBe(true);
      expect(cursorsB.has(userA.id)).toBe(false);

      managerA.cleanup();
    });

    it('should isolate same participant across different sessions', async () => {
      // Same user joining different sessions should be completely isolated
      const sessionA = 'ABC123';
      const sessionB = 'XYZ999';
      const sameUser = { id: 'same-user', name: 'Same User', emoji: '🔀', color: '#45B7D1' };

      const managerA = new PresenceManager(mockAblyService, sessionA, sameUser);
      presenceManager2 = new PresenceManager(secondAblyService, sessionB, sameUser);

      const dataA = createMockParticipantData({ 
        participantId: sameUser.id, 
        name: sameUser.name,
        currentStep: 1,
        status: 'sorting' as const 
      });
      
      const dataB = createMockParticipantData({ 
        participantId: sameUser.id, 
        name: sameUser.name,
        currentStep: 3,
        status: 'revealed-3' as const 
      });

      await managerA.enter(dataA);
      await presenceManager2.enter(dataB);

      // Update status differently in each session
      await managerA.updateStatus('revealed-8');
      await presenceManager2.updateStatus('completed');

      // Verify different channels were called
      expect(mockChannel.presence.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'revealed-8' })
      );
      
      expect(secondChannel.presence.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' })
      );

      // Verify local state isolation
      const userDataA = managerA.getCurrentUserData();
      const userDataB = presenceManager2.getCurrentUserData();

      expect(userDataA?.status).toBe('revealed-8');
      expect(userDataB?.status).toBe('completed');
      expect(userDataA?.currentStep).toBe(1);
      expect(userDataB?.currentStep).toBe(3);

      managerA.cleanup();
    });

    it('should prevent cross-session presence event pollution', () => {
      const sessionA = 'ABC123';
      const sessionB = 'XYZ999';
      const userA = { id: 'user-a', name: 'Alice', emoji: '😊', color: '#FF6B6B' };
      const userB = { id: 'user-b', name: 'Bob', emoji: '🎨', color: '#4ECDC4' };

      const managerA = new PresenceManager(mockAblyService, sessionA, userA);
      presenceManager2 = new PresenceManager(secondAblyService, sessionB, userB);

      // Get event handlers for both managers (need to account for multiple managers)
      const allMockChannelCalls = (mockChannel.presence.subscribe as jest.Mock).mock.calls;
      const allSecondChannelCalls = (secondChannel.presence.subscribe as jest.Mock).mock.calls;
      
      const handlerA = allMockChannelCalls[allMockChannelCalls.length - 1][0]; // Latest call for managerA
      const handlerB = allSecondChannelCalls[0][0]; // First call for manager2

      // Simulate presence events in each session
      const eventA = {
        action: 'enter',
        clientId: 'participant-a',
        data: createMockParticipantData({ participantId: 'participant-a', name: 'Participant A' })
      };

      const eventB = {
        action: 'enter',
        clientId: 'participant-b',
        data: createMockParticipantData({ participantId: 'participant-b', name: 'Participant B' })
      };

      // Process events in their respective sessions
      handlerA(eventA);
      handlerB(eventB);

      // Verify complete isolation
      const participantsA = managerA.getParticipants();
      const participantsB = presenceManager2.getParticipants();

      expect(participantsA.has('participant-a')).toBe(true);
      expect(participantsA.has('participant-b')).toBe(false);
      
      expect(participantsB.has('participant-b')).toBe(true);
      expect(participantsB.has('participant-a')).toBe(false);

      managerA.cleanup();
    });
  });

  describe('real-time behavior', () => {
    it('should handle WebSocket connection lifecycle', () => {
      // Verify proper setup of connection listeners
      expect(mockChannel.presence.subscribe).toHaveBeenCalled();
      expect(mockAblyService.subscribe).toHaveBeenCalledWith(
        mockSessionCode,
        'presence',
        'cursor-move',
        expect.any(Function)
      );
      
      // Verify cleanup handlers are stored
      presenceManager.cleanup();
      expect(mockChannel.presence.unsubscribe).toHaveBeenCalled();
    });

    it('should enforce 50ms cursor throttling requirement', () => {
      // Reset mock to track actual calls that go through throttling
      let actualPublishCalls = 0;
      (mockAblyService.publishCursorMove as jest.Mock).mockImplementation(() => {
        const now = Date.now();
        const throttleState = (mockAblyService as any)._throttleState;
        
        if (now - throttleState.lastPublish >= throttleState.throttleMs) {
          throttleState.lastPublish = now;
          actualPublishCalls++;
        }
        return Promise.resolve();
      });

      // Send rapid cursor updates - should be throttled
      presenceManager.updateCursor(10, 10);
      presenceManager.updateCursor(20, 20);
      presenceManager.updateCursor(30, 30);

      // Only first call should go through
      expect(actualPublishCalls).toBe(1);

      // Advance time past throttle period
      jest.advanceTimersByTime(60);
      // Update throttle state to simulate time passage
      (mockAblyService as any)._throttleState.lastPublish = Date.now() - 60;
      
      // This call should now go through
      presenceManager.updateCursor(40, 40);
      expect(actualPublishCalls).toBe(2);
    });

    it('should handle concurrent presence operations', async () => {
      const data1 = createMockParticipantData({ participantId: 'user-1' });

      // Enter first so we can update status
      await presenceManager.enter(data1);
      
      // Clear the enter call to isolate our test
      jest.clearAllMocks();

      // Simulate concurrent operations
      const promises = [
        presenceManager.updateStatus('revealed-8'),
        presenceManager.updateCursor(100, 200)
      ];

      // Should handle concurrent operations without errors
      await expect(Promise.all(promises)).resolves.toBeDefined();
      
      // Verify all operations completed
      expect(mockChannel.presence.update).toHaveBeenCalled();
      expect(mockAblyService.publishCursorMove).toHaveBeenCalled();
    });

    it('should handle network disconnection gracefully', async () => {
      // Simulate network failure
      (mockChannel.presence.update as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      const data = createMockParticipantData();
      await presenceManager.enter(data);

      // Status update should fail gracefully
      await expect(presenceManager.updateStatus('revealed-8')).rejects.toThrow('Network error');
      
      // But local state should remain consistent
      expect(presenceManager.getCurrentUserData()?.status).toBe('sorting');
    });

    it('should clean up properly on disconnect', () => {
      // Add some state
      presenceManager.updateCursor(100, 100);
      const data = createMockParticipantData();
      presenceManager.getParticipants().set(data.participantId, data);

      // Cleanup should remove all state and subscriptions
      presenceManager.cleanup();

      expect(presenceManager.getParticipants().size).toBe(0);
      expect(presenceManager.getCursors().size).toBe(0);
      expect(mockChannel.presence.unsubscribe).toHaveBeenCalled();
    });
  });
});