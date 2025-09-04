import { ArrangementSyncService } from '@/lib/viewer/arrangement-sync-service';
import { EVENT_TYPES, SelectionRevealedEvent, ArrangementUpdatedEvent, createBaseEvent } from '@/lib/events/types';
import type { ArrangementViewData } from '@/types/viewer';

// Mock AblyService
const mockChannel = {
  subscribe: jest.fn()
};

const mockAblyService = {
  getChannel: jest.fn().mockResolvedValue(mockChannel),
  init: jest.fn().mockResolvedValue(undefined),
  destroy: jest.fn().mockResolvedValue(undefined)
};

describe('ArrangementSyncService', () => {
  let service: ArrangementSyncService;
  const sessionCode = 'TEST123';
  const participantId = 'participant-456';
  const participantName = 'Dave';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ArrangementSyncService(mockAblyService as any, sessionCode);
  });

  describe('initialization', () => {
    it('should subscribe to correct events on events channel', async () => {
      await service.initialize();

      expect(mockAblyService.getChannel).toHaveBeenCalledWith(sessionCode, 'events');
      expect(mockChannel.subscribe).toHaveBeenCalledWith(
        EVENT_TYPES.SELECTION_REVEALED,
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalledWith(
        EVENT_TYPES.ARRANGEMENT_UPDATED,
        expect.any(Function)
      );
    });
  });

  describe('selection revealed event handling', () => {
    let updateCallback: jest.Mock;
    let selectionRevealedHandler: (message: { data: SelectionRevealedEvent }) => void;

    beforeEach(async () => {
      updateCallback = jest.fn();
      
      // Initialize and capture event handlers
      await service.initialize();
      
      // Get the SELECTION_REVEALED handler
      const revealedCall = (mockChannel.subscribe as jest.Mock).mock.calls.find(
        call => call[0] === EVENT_TYPES.SELECTION_REVEALED
      );
      selectionRevealedHandler = revealedCall[1];

      // Subscribe to participant
      service.subscribeToParticipant(participantId, updateCallback);
    });

    it('should handle SELECTION_REVEALED events and create arrangement data', () => {
      const revealEvent: SelectionRevealedEvent = {
        ...createBaseEvent({
          type: EVENT_TYPES.SELECTION_REVEALED,
          sessionCode,
          participantId
        }),
        payload: {
          revealType: 'top8',
          participantName,
          cardPositions: [
            { cardId: 'card1', x: 100, y: 200, pile: 'top8' },
            { cardId: 'card2', x: 300, y: 200, pile: 'top8' }
          ]
        }
      };

      // Simulate receiving the event
      selectionRevealedHandler({ data: revealEvent });

      // Verify callback was called with correct arrangement data
      expect(updateCallback).toHaveBeenCalledWith({
        participantId,
        participantName,
        revealType: 'top8',
        cardPositions: [
          { cardId: 'card1', x: 100, y: 200, pile: 'top8' },
          { cardId: 'card2', x: 300, y: 200, pile: 'top8' }
        ],
        lastUpdated: revealEvent.timestamp
      });
    });

    it('should ignore events for non-subscribed participants', () => {
      const revealEvent: SelectionRevealedEvent = {
        ...createBaseEvent({
          type: EVENT_TYPES.SELECTION_REVEALED,
          sessionCode,
          participantId: 'different-participant'
        }),
        payload: {
          revealType: 'top8',
          participantName: 'Other Person',
          cardPositions: []
        }
      };

      selectionRevealedHandler({ data: revealEvent });

      expect(updateCallback).not.toHaveBeenCalled();
    });

    it('should handle top3 reveals correctly', () => {
      const revealEvent: SelectionRevealedEvent = {
        ...createBaseEvent({
          type: EVENT_TYPES.SELECTION_REVEALED,
          sessionCode,
          participantId
        }),
        payload: {
          revealType: 'top3',
          participantName,
          cardPositions: [
            { cardId: 'card1', x: 100, y: 200, pile: 'top3' },
            { cardId: 'card2', x: 300, y: 200, pile: 'top3' },
            { cardId: 'card3', x: 500, y: 200, pile: 'top3' }
          ]
        }
      };

      selectionRevealedHandler({ data: revealEvent });

      expect(updateCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          revealType: 'top3',
          cardPositions: expect.arrayContaining([
            expect.objectContaining({ pile: 'top3' })
          ])
        })
      );
    });
  });

  describe('arrangement update event handling', () => {
    let updateCallback: jest.Mock;
    let arrangementUpdatedHandler: (message: { data: ArrangementUpdatedEvent }) => void;

    beforeEach(async () => {
      updateCallback = jest.fn();
      
      await service.initialize();
      
      // Get the ARRANGEMENT_UPDATED handler
      const updateCall = (mockChannel.subscribe as jest.Mock).mock.calls.find(
        call => call[0] === EVENT_TYPES.ARRANGEMENT_UPDATED
      );
      arrangementUpdatedHandler = updateCall[1];

      service.subscribeToParticipant(participantId, updateCallback);

      // Clear the initial callback from subscription setup
      updateCallback.mockClear();
    });

    it('should handle ARRANGEMENT_UPDATED events with debouncing', (done) => {
      const updateEvent: ArrangementUpdatedEvent = {
        ...createBaseEvent({
          type: EVENT_TYPES.ARRANGEMENT_UPDATED,
          sessionCode,
          participantId
        }),
        payload: {
          revealType: 'top8',
          participantName,
          cardPositions: [
            { cardId: 'card1', x: 150, y: 250, pile: 'top8' } // Moved position
          ]
        }
      };

      arrangementUpdatedHandler({ data: updateEvent });

      // Should be debounced - not called immediately
      expect(updateCallback).not.toHaveBeenCalled();

      // Wait for debounce (200ms)
      setTimeout(() => {
        expect(updateCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            participantId,
            participantName,
            cardPositions: [
              { cardId: 'card1', x: 150, y: 250, pile: 'top8' }
            ]
          })
        );
        done();
      }, 250);
    });

    it('should debounce multiple rapid updates', (done) => {
      const updateEvent1: ArrangementUpdatedEvent = {
        ...createBaseEvent({
          type: EVENT_TYPES.ARRANGEMENT_UPDATED,
          sessionCode,
          participantId
        }),
        payload: {
          revealType: 'top8',
          participantName,
          cardPositions: [{ cardId: 'card1', x: 100, y: 100, pile: 'top8' }]
        }
      };

      const updateEvent2: ArrangementUpdatedEvent = {
        ...createBaseEvent({
          type: EVENT_TYPES.ARRANGEMENT_UPDATED,
          sessionCode,
          participantId
        }),
        payload: {
          revealType: 'top8',
          participantName,
          cardPositions: [{ cardId: 'card1', x: 200, y: 200, pile: 'top8' }]
        }
      };

      // Send two updates rapidly
      arrangementUpdatedHandler({ data: updateEvent1 });
      setTimeout(() => arrangementUpdatedHandler({ data: updateEvent2 }), 50);

      // Wait for debounce
      setTimeout(() => {
        // Should only be called once with the latest data
        expect(updateCallback).toHaveBeenCalledTimes(1);
        expect(updateCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            cardPositions: [{ cardId: 'card1', x: 200, y: 200, pile: 'top8' }]
          })
        );
        done();
      }, 300);
    });
  });

  describe('getCurrentArrangement', () => {
    it('should return cached arrangement if available', async () => {
      // First, simulate a reveal to cache data
      await service.initialize();
      const updateCallback = jest.fn();
      service.subscribeToParticipant(participantId, updateCallback);

      // Simulate receiving a reveal event
      const revealCall = (mockChannel.subscribe as jest.Mock).mock.calls.find(
        call => call[0] === EVENT_TYPES.SELECTION_REVEALED
      );
      const handler = revealCall[1];
      
      const revealEvent: SelectionRevealedEvent = {
        ...createBaseEvent({
          type: EVENT_TYPES.SELECTION_REVEALED,
          sessionCode,
          participantId
        }),
        payload: {
          revealType: 'top8',
          participantName,
          cardPositions: [{ cardId: 'card1', x: 100, y: 200, pile: 'top8' }]
        }
      };

      handler({ data: revealEvent });

      // Now check getCurrentArrangement
      const arrangement = await service.getCurrentArrangement(participantId);

      expect(arrangement).toEqual({
        participantId,
        participantName,
        revealType: 'top8',
        cardPositions: [{ cardId: 'card1', x: 100, y: 200, pile: 'top8' }],
        lastUpdated: revealEvent.timestamp
      });
    });

    it('should return null for non-existent arrangements', async () => {
      await service.initialize();
      const arrangement = await service.getCurrentArrangement('non-existent');
      expect(arrangement).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should clear all timers and subscriptions', () => {
      const mockClearTimeout = jest.spyOn(global, 'clearTimeout');
      
      service.cleanup();
      
      expect(mockClearTimeout).toHaveBeenCalled();
      mockClearTimeout.mockRestore();
    });
  });
});