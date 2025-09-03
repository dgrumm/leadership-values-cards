import { getArrangementSync, resetArrangementSync } from '@/lib/viewer/arrangement-sync';
import { getAblyService } from '@/lib/ably/ably-service';
import type { ArrangementViewData } from '@/types/viewer';

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

// Mock DOM methods
Object.defineProperty(document, 'getElementById', {
  value: jest.fn().mockReturnValue({
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn()
    }
  }),
  writable: true
});

describe('ArrangementSync', () => {
  let arrangementSync: any;

  beforeEach(() => {
    resetArrangementSync();
    jest.clearAllMocks();
    jest.useFakeTimers();
    arrangementSync = getArrangementSync();
  });

  afterEach(() => {
    resetArrangementSync();
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize for a session', async () => {
      await arrangementSync.initializeForSession('TEST123');

      expect(arrangementSync.currentSessionCode).toBe('TEST123');
      expect(mockAblyService.getChannel).toHaveBeenCalledWith('TEST123', 'reveals');
    });

    it('should not re-initialize for same session', async () => {
      await arrangementSync.initializeForSession('TEST123');
      jest.clearAllMocks();

      await arrangementSync.initializeForSession('TEST123');

      expect(mockAblyService.getChannel).not.toHaveBeenCalled();
    });

    it('should clean up when switching sessions', async () => {
      const cleanupSpy = jest.spyOn(arrangementSync, 'cleanup');
      
      await arrangementSync.initializeForSession('OLD123');
      await arrangementSync.initializeForSession('NEW123');

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('arrangement updates subscription', () => {
    beforeEach(async () => {
      await arrangementSync.initializeForSession('TEST123');
    });

    it('should subscribe to arrangement updates', () => {
      const mockCallback = jest.fn();
      mockAblyService.subscribe.mockReturnValue(() => {});

      const unsubscribe = arrangementSync.subscribeToArrangementUpdates('participant1', mockCallback);

      expect(mockAblyService.subscribe).toHaveBeenCalledWith(
        'TEST123',
        'reveals',
        'arrangement-updated',
        expect.any(Function)
      );

      expect(typeof unsubscribe).toBe('function');
    });

    it('should return no-op unsubscribe when not initialized', () => {
      resetArrangementSync();
      arrangementSync = getArrangementSync();

      const unsubscribe = arrangementSync.subscribeToArrangementUpdates('participant1', jest.fn());
      
      expect(typeof unsubscribe).toBe('function');
      unsubscribe(); // Should not throw
    });

    it('should filter updates by participant ID', () => {
      const mockCallback = jest.fn();
      let updateHandler: any;

      mockAblyService.subscribe.mockImplementation((sessionCode, channel, event, handler) => {
        updateHandler = handler;
        return () => {};
      });

      arrangementSync.subscribeToArrangementUpdates('participant1', mockCallback);

      // Send update for different participant - should be ignored
      updateHandler({
        data: {
          participantId: 'participant2',
          participantName: 'Other User',
          revealType: 'top8',
          cardPositions: [],
          timestamp: Date.now()
        }
      });

      // Should not trigger callback due to debouncing not advancing
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should debounce updates correctly', () => {
      const mockCallback = jest.fn();
      let updateHandler: any;

      mockAblyService.subscribe.mockImplementation((sessionCode, channel, event, handler) => {
        updateHandler = handler;
        return () => {};
      });

      arrangementSync.subscribeToArrangementUpdates('participant1', mockCallback);

      const arrangementData = {
        participantId: 'participant1',
        participantName: 'John Doe',
        revealType: 'top8' as const,
        cardPositions: [{ cardId: 'card1', x: 100, y: 200, pile: 'top8' }],
        timestamp: Date.now()
      };

      // Send multiple rapid updates
      updateHandler({ data: arrangementData });
      updateHandler({ data: { ...arrangementData, timestamp: Date.now() + 50 } });
      updateHandler({ data: { ...arrangementData, timestamp: Date.now() + 100 } });

      // Should not have called callback yet (debounced)
      expect(mockCallback).not.toHaveBeenCalled();

      // Advance time past debounce delay (200ms)
      jest.advanceTimersByTime(200);

      // Now should have called callback once with latest data
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith({
        participantId: 'participant1',
        participantName: 'John Doe',
        revealType: 'top8',
        cardPositions: [{ cardId: 'card1', x: 100, y: 200, pile: 'top8' }],
        lastUpdated: expect.any(Number)
      });
    });

    it('should cleanup debounce timers on unsubscribe', () => {
      const mockCallback = jest.fn();
      mockAblyService.subscribe.mockReturnValue(() => {});

      const unsubscribe = arrangementSync.subscribeToArrangementUpdates('participant1', mockCallback);

      // Start a debounced update
      const updateHandler = mockAblyService.subscribe.mock.calls[0][3];
      updateHandler({
        data: {
          participantId: 'participant1',
          participantName: 'John',
          revealType: 'top8',
          cardPositions: [],
          timestamp: Date.now()
        }
      });

      // Unsubscribe should clean up timer
      unsubscribe();

      // Advancing time should not trigger callback
      jest.advanceTimersByTime(200);
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('arrangement publishing', () => {
    beforeEach(async () => {
      await arrangementSync.initializeForSession('TEST123');
    });

    it('should publish arrangement updates', async () => {
      const arrangement: ArrangementViewData = {
        participantId: 'participant1',
        participantName: 'John Doe',
        revealType: 'top8',
        cardPositions: [
          { cardId: 'card1', x: 100, y: 200, pile: 'top8' },
          { cardId: 'card2', x: 300, y: 400, pile: 'top8' }
        ],
        lastUpdated: Date.now()
      };

      await arrangementSync.publishArrangementUpdate(arrangement);

      expect(mockChannel.publish).toHaveBeenCalledWith('arrangement-updated', {
        participantId: 'participant1',
        participantName: 'John Doe',
        revealType: 'top8',
        cardPositions: arrangement.cardPositions,
        timestamp: arrangement.lastUpdated
      });
    });

    it('should throw error when publishing without initialization', async () => {
      resetArrangementSync();
      arrangementSync = getArrangementSync();

      const arrangement: ArrangementViewData = {
        participantId: 'participant1',
        participantName: 'John',
        revealType: 'top8',
        cardPositions: [],
        lastUpdated: Date.now()
      };

      await expect(arrangementSync.publishArrangementUpdate(arrangement))
        .rejects.toThrow('ArrangementSync not initialized');
    });
  });

  describe('animation helpers', () => {
    beforeEach(async () => {
      await arrangementSync.initializeForSession('TEST123');
    });

    it('should animate card to new position', () => {
      const mockElement = {
        style: {}
      };

      (document.getElementById as jest.Mock).mockReturnValue(mockElement);

      arrangementSync.animateCardTo('card1', { x: 100, y: 200 });

      expect(document.getElementById).toHaveBeenCalledWith('card1');
      expect(mockElement.style).toEqual({
        transition: 'transform 300ms ease-out',
        transform: 'translate(100px, 200px)'
      });
    });

    it('should handle missing card element gracefully', () => {
      (document.getElementById as jest.Mock).mockReturnValue(null);

      // Should not throw
      arrangementSync.animateCardTo('missing-card', { x: 100, y: 200 });
    });

    it('should highlight recent changes', () => {
      const mockElement = {
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        }
      };

      (document.getElementById as jest.Mock).mockReturnValue(mockElement);

      const recentTimestamp = Date.now() - 1000; // 1 second ago (within threshold)
      arrangementSync.highlightRecentChanges(
        [{ cardId: 'card1' }, { cardId: 'card2' }],
        recentTimestamp
      );

      expect(mockElement.classList.add).toHaveBeenCalledWith('viewer-highlight');

      // Advance time to trigger highlight removal
      jest.advanceTimersByTime(300); // highlight duration

      expect(mockElement.classList.remove).toHaveBeenCalledWith('viewer-highlight');
    });

    it('should not highlight old changes', () => {
      const mockElement = {
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        }
      };

      (document.getElementById as jest.Mock).mockReturnValue(mockElement);

      const oldTimestamp = Date.now() - 5000; // 5 seconds ago (outside threshold)
      arrangementSync.highlightRecentChanges([{ cardId: 'card1' }], oldTimestamp);

      expect(mockElement.classList.add).not.toHaveBeenCalled();
    });
  });

  describe('current arrangement retrieval', () => {
    beforeEach(async () => {
      await arrangementSync.initializeForSession('TEST123');
    });

    it('should return null for current arrangement (not implemented)', async () => {
      const result = await arrangementSync.getCurrentArrangement('participant1');
      expect(result).toBeNull();
    });

    it('should return null when not initialized', async () => {
      resetArrangementSync();
      arrangementSync = getArrangementSync();

      const result = await arrangementSync.getCurrentArrangement('participant1');
      expect(result).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should clean up all timers and state', async () => {
      await arrangementSync.initializeForSession('TEST123');

      const mockCallback = jest.fn();
      arrangementSync.subscribeToArrangementUpdates('participant1', mockCallback);

      // Start a debounced operation
      const updateHandler = mockAblyService.subscribe.mock.calls[0][3];
      updateHandler({
        data: {
          participantId: 'participant1',
          participantName: 'John',
          revealType: 'top8',
          cardPositions: [],
          timestamp: Date.now()
        }
      });

      await arrangementSync.cleanup();

      expect(arrangementSync.currentSessionCode).toBeNull();

      // Advancing time should not trigger callbacks after cleanup
      jest.advanceTimersByTime(200);
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});