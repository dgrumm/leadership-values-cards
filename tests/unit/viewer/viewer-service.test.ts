import { getViewerService, resetViewerService } from '@/lib/viewer/viewer-service';
import { getAblyService, resetAblyService } from '@/lib/ably/ably-service';
import { getEventBus } from '@/lib/events/event-bus';

// Mock Ably Service
const mockChannel = {
  publish: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn()
};

const mockAblyService = {
  getChannel: jest.fn().mockReturnValue(mockChannel),
  subscribe: jest.fn()
};

jest.mock('@/lib/ably/ably-service', () => ({
  getAblyService: () => mockAblyService,
  resetAblyService: jest.fn()
}));

// Mock Event Bus
const mockEventBus = {
  on: jest.fn(),
  emit: jest.fn()
};

jest.mock('@/lib/events/event-bus', () => ({
  getEventBus: () => mockEventBus
}));

describe('ViewerService', () => {
  let viewerService: any;

  beforeEach(() => {
    resetViewerService();
    jest.clearAllMocks();
    viewerService = getViewerService();
  });

  afterEach(() => {
    resetViewerService();
  });

  describe('initialization', () => {
    it('should initialize for a session with user data', async () => {
      await viewerService.initializeForSession(
        'TEST123',
        'user1',
        'John Doe',
        '👨',
        '#4A90E2'
      );

      expect(viewerService.currentSessionCode).toBe('TEST123');
      expect(viewerService.currentUserId).toBe('user1');
      expect(viewerService.currentUserName).toBe('John Doe');
      expect(mockAblyService.getChannel).toHaveBeenCalledWith('TEST123', 'viewers');
    });

    it('should not re-initialize for same session', async () => {
      await viewerService.initializeForSession('TEST123', 'user1', 'John', '👨', 'blue');
      jest.clearAllMocks();

      await viewerService.initializeForSession('TEST123', 'user1', 'John', '👨', 'blue');

      expect(mockAblyService.getChannel).not.toHaveBeenCalled();
    });

    it('should clean up previous session when initializing new one', async () => {
      const cleanupSpy = jest.spyOn(viewerService, 'cleanup');
      
      await viewerService.initializeForSession('OLD123', 'user1', 'John', '👨', 'blue');
      await viewerService.initializeForSession('NEW123', 'user1', 'John', '👨', 'blue');

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('viewer session management', () => {
    beforeEach(async () => {
      await viewerService.initializeForSession('TEST123', 'user1', 'John Doe', '👨', '#4A90E2');
    });

    it('should join viewer session successfully', async () => {
      await viewerService.joinViewerSession('target123');

      expect(mockChannel.publish).toHaveBeenCalledWith('viewer-joined', {
        viewerId: 'user1',
        viewerName: 'John Doe',
        viewerEmoji: '👨',
        viewerColor: '#4A90E2',
        targetParticipantId: 'target123',
        joinedAt: expect.any(Number)
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith('VIEWER_JOINED', {
        targetParticipantId: 'target123',
        viewerName: 'John Doe'
      });

      expect(viewerService.isActive).toBe(true);
    });

    it('should leave viewer session successfully', async () => {
      await viewerService.joinViewerSession('target123');
      jest.clearAllMocks();

      await viewerService.leaveViewerSession('target123');

      expect(mockChannel.publish).toHaveBeenCalledWith('viewer-left', {
        viewerId: 'user1',
        viewerName: 'John Doe',
        targetParticipantId: 'target123'
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith('VIEWER_LEFT', {
        targetParticipantId: 'target123',
        viewerName: 'John Doe'
      });

      expect(viewerService.isActive).toBe(false);
    });

    it('should throw error if not initialized when joining', async () => {
      resetViewerService();
      viewerService = getViewerService();

      await expect(viewerService.joinViewerSession('target123')).rejects.toThrow(
        'Viewer service not properly initialized'
      );
    });

    it('should handle leave gracefully when not initialized', async () => {
      resetViewerService();
      viewerService = getViewerService();

      // Should not throw
      await viewerService.leaveViewerSession('target123');
    });
  });

  describe('viewer presence subscription', () => {
    beforeEach(async () => {
      await viewerService.initializeForSession('TEST123', 'user1', 'John', '👨', 'blue');
    });

    it('should subscribe to viewer presence updates', () => {
      const mockCallback = jest.fn();
      mockAblyService.subscribe.mockReturnValue(() => {});

      const unsubscribe = viewerService.subscribeToViewerPresence('target123', mockCallback);

      expect(mockAblyService.subscribe).toHaveBeenCalledTimes(2); // joined + left events
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle viewer joined events correctly', () => {
      const mockCallback = jest.fn();
      let joinedHandler: any;
      
      mockAblyService.subscribe.mockImplementation((sessionCode, channel, event, handler) => {
        if (event === 'viewer-joined') {
          joinedHandler = handler;
        }
        return () => {};
      });

      viewerService.subscribeToViewerPresence('target123', mockCallback);

      // Simulate viewer joined event
      joinedHandler({
        data: {
          viewerId: 'viewer2',
          viewerName: 'Jane Doe',
          viewerEmoji: '👩',
          viewerColor: 'red',
          targetParticipantId: 'target123',
          joinedAt: 1234567890
        }
      });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.any(Map)
      );
    });

    it('should return no-op unsubscribe when not initialized', () => {
      resetViewerService();
      viewerService = getViewerService();

      const unsubscribe = viewerService.subscribeToViewerPresence('target123', jest.fn());
      
      expect(typeof unsubscribe).toBe('function');
      // Should not throw when called
      unsubscribe();
    });
  });

  describe('viewer limits', () => {
    beforeEach(async () => {
      await viewerService.initializeForSession('TEST123', 'user1', 'John', '👨', 'blue');
    });

    it('should respect maximum viewer limits', async () => {
      // Mock getCurrentViewers to return max viewers
      const mockViewers = Array.from({ length: 10 }, (_, i) => ({
        viewerId: `viewer${i}`,
        viewerName: `Viewer ${i}`,
        targetParticipantId: 'target123',
        joinedAt: Date.now()
      }));

      jest.spyOn(viewerService, 'getCurrentViewers').mockResolvedValue(mockViewers);

      await expect(viewerService.joinViewerSession('target123')).rejects.toThrow(
        'Maximum 10 viewers per arrangement reached'
      );
    });
  });

  describe('activity updates', () => {
    beforeEach(async () => {
      await viewerService.initializeForSession('TEST123', 'user1', 'John', '👨', 'blue');
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start activity updates when joining', async () => {
      await viewerService.joinViewerSession('target123');
      
      // Fast-forward time to trigger activity update
      jest.advanceTimersByTime(30000);

      expect(mockChannel.publish).toHaveBeenCalledWith('viewer-activity', {
        viewerId: 'user1',
        targetParticipantId: 'target123',
        timestamp: expect.any(Number),
        isActive: true
      });
    });

    it('should stop activity updates when leaving', async () => {
      await viewerService.joinViewerSession('target123');
      jest.clearAllMocks();
      
      await viewerService.leaveViewerSession('target123');
      
      // Fast-forward time - should not trigger activity update
      jest.advanceTimersByTime(30000);

      expect(mockChannel.publish).not.toHaveBeenCalledWith('viewer-activity', expect.any(Object));
    });
  });

  describe('cleanup', () => {
    it('should clean up all state and timers', async () => {
      await viewerService.initializeForSession('TEST123', 'user1', 'John', '👨', 'blue');
      await viewerService.joinViewerSession('target123');

      await viewerService.cleanup();

      expect(viewerService.currentSessionCode).toBeNull();
      expect(viewerService.currentUserId).toBeNull();
      expect(viewerService.isActive).toBe(false);
    });
  });
});