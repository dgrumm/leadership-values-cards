import { PresenceManager } from '../../../../lib/presence/presence-manager';
import { AblyService } from '../../../../lib/ably/ably-service';
import type { RealtimeChannel } from 'ably';

// Mock Ably
jest.mock('ably');

// Mock AblyService 
const mockAblyService = {
  getChannel: jest.fn(),
  subscribe: jest.fn(),
  subscribeAll: jest.fn(),
  publishCursorMove: jest.fn(),
  isReady: jest.fn(() => true)
} as unknown as AblyService;

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
    (mockAblyService.getChannel as jest.Mock).mockReturnValue(mockChannel);
    (mockAblyService.subscribe as jest.Mock).mockReturnValue(jest.fn()); // Return unsubscribe function
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
      jest.useFakeTimers();

      // Send multiple cursor updates rapidly
      presenceManager.updateCursor(100, 100);
      presenceManager.updateCursor(200, 200);
      presenceManager.updateCursor(300, 300);

      // Only first call should go through immediately
      expect(mockAblyService.publishCursorMove).toHaveBeenCalledTimes(1);

      // Advance time by 50ms
      jest.advanceTimersByTime(50);

      // Now send another update
      presenceManager.updateCursor(400, 400);
      expect(mockAblyService.publishCursorMove).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('presence event handling', () => {
    beforeEach(() => {
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

      // Get the presence subscription callback
      const presenceCallback = (mockChannel.presence.subscribe as jest.Mock).mock.calls[0][0];
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

      const presenceCallback = (mockChannel.presence.subscribe as jest.Mock).mock.calls[0][0];
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

      const presenceCallback = (mockChannel.presence.subscribe as jest.Mock).mock.calls[0][0];
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
      const unsubscribe = jest.fn();
      (mockChannel.presence.subscribe as jest.Mock).mockReturnValue(unsubscribe);

      // Reinitialize to get the unsubscribe function
      presenceManager = new PresenceManager(mockAblyService, mockSessionCode, mockCurrentUser);
      
      presenceManager.cleanup();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it('should clean up cursor subscriptions', () => {
      const unsubscribe = jest.fn();
      (mockAblyService.subscribe as jest.Mock).mockReturnValue(unsubscribe);

      presenceManager.cleanup();

      expect(unsubscribe).toHaveBeenCalled();
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
    it('should start heartbeat on initialization', () => {
      jest.useFakeTimers();

      // Heartbeat should be called every 30 seconds
      jest.advanceTimersByTime(30000);

      expect(mockChannel.presence.update).toHaveBeenCalledWith(
        expect.objectContaining({
          lastActive: expect.any(Number)
        })
      );

      jest.useRealTimers();
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
      jest.useFakeTimers();

      const now = Date.now();
      const oldCursor = { x: 100, y: 100, timestamp: now - 6000 }; // 6 seconds ago
      const newCursor = { x: 200, y: 200, timestamp: now - 2000 }; // 2 seconds ago

      presenceManager.getCursors().set('old-user', oldCursor);
      presenceManager.getCursors().set('new-user', newCursor);

      // Get active cursors should filter out old ones
      const activeCursors = presenceManager.getActiveCursors();
      
      expect(activeCursors.has('old-user')).toBe(false);
      expect(activeCursors.has('new-user')).toBe(true);

      jest.useRealTimers();
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

      // Simulate channel error
      const errorCallback = (mockChannel.presence.subscribe as jest.Mock).mock.calls[0][0];
      const errorMessage = { action: 'error', data: new Error('Channel error') };

      expect(() => {
        errorCallback(errorMessage);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Presence event error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});