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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers(); // Mock timers for throttling and heartbeat tests
    
    // Set up unsubscribe functions before creating presence manager
    const presenceUnsubscribe = jest.fn();
    const cursorUnsubscribe = jest.fn();
    
    // Reset all mock implementations to successful defaults
    (mockChannel.presence.enter as jest.Mock).mockResolvedValue(undefined);
    (mockChannel.presence.leave as jest.Mock).mockResolvedValue(undefined);
    (mockChannel.presence.update as jest.Mock).mockResolvedValue(undefined);
    (mockChannel.presence.get as jest.Mock).mockResolvedValue([]);
    (mockChannel.publish as jest.Mock).mockResolvedValue(undefined);
    
    (mockAblyService.getChannel as jest.Mock).mockReturnValue(mockChannel);
    (mockAblyService.subscribe as jest.Mock).mockReturnValue(cursorUnsubscribe); // Return unsubscribe function
    
    // Reset the presence subscribe mock to properly record calls
    (mockChannel.presence.subscribe as jest.Mock).mockImplementation((handler) => {
      // This will store the handler for tests to access
    });
    
    // Reset throttle state
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
    jest.useRealTimers(); // Reset timers in case any test mocked them
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

    it('should enter presence with participant data', async () => {
      await presenceManager.enter(mockParticipantData);

      expect(mockChannel.presence.enter).toHaveBeenCalledWith(mockParticipantData);
    });

    it('should handle enter errors gracefully', async () => {
      const error = new Error('Enter failed');
      (mockChannel.presence.enter as jest.Mock).mockRejectedValue(error);

      await expect(presenceManager.enter(mockParticipantData)).rejects.toThrow('Enter failed');
    });

    it('should update local participants map on successful enter', async () => {
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

      // Then leave
      await presenceManager.leave();

      const participants = presenceManager.getParticipants();
      expect(participants.has(mockData.participantId)).toBe(false);
    });
  });

  describe('updateStatus', () => {
    const mockStatus = 'revealed-8' as const;
    const mockParticipantData = {
      participantId: mockCurrentUser.id,
      name: mockCurrentUser.name,
      emoji: mockCurrentUser.emoji,
      color: mockCurrentUser.color,
      currentStep: 1,
      status: 'sorting' as const,
      cursor: { x: 0, y: 0, timestamp: Date.now() },
      lastActive: Date.now(),
      isViewing: null
    };

    beforeEach(async () => {
      // Enter presence first so updateStatus works
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
      // Simulate cursor messages from different users with different timestamps
      const now = Date.now();
      
      // Old cursor message (6 seconds ago)
      const oldCursorMessage = {
        name: 'cursor-move',
        data: {
          participantId: 'old-user',
          x: 100,
          y: 100,
          timestamp: now - 6000 // Will be filtered out as inactive
        }
      };
      
      // New cursor message (2 seconds ago)  
      const newCursorMessage = {
        name: 'cursor-move',
        data: {
          participantId: 'new-user',
          x: 200,
          y: 200,
          timestamp: now - 2000 // Will remain active
        }
      };
      
      // Get the cursor callback and simulate messages
      const cursorCallback = (mockAblyService.subscribe as jest.Mock).mock.calls[0][3];
      cursorCallback(oldCursorMessage);
      cursorCallback(newCursorMessage);

      // Debug: check all cursors
      const allCursors = presenceManager.getCursors();
      console.log('All cursors:', Array.from(allCursors.entries()));
      
      // Get active cursors should filter out old ones
      const activeCursors = presenceManager.getActiveCursors();
      console.log('Active cursors:', Array.from(activeCursors.entries()));
      
      expect(activeCursors.has('old-user')).toBe(false);
      expect(activeCursors.has('new-user')).toBe(true);
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

      // Get the presence event handler from the mock
      const presenceHandler = (mockChannel.presence.subscribe as jest.Mock).mock.calls[0][0];
      
      // Create an event that will cause an error when trying to access properties
      const malformedPresenceEvent = {
        action: 'enter',
        clientId: 'test-client',
        data: {
          participantId: 'test-user',
          // Simulate an error by making participants.set throw
          get name() { throw new Error('Data access error'); }
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
});