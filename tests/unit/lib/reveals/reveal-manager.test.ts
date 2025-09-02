import { RevealManager, RevealState, CardPosition } from '@/lib/reveals/reveal-manager';
import { EventBus } from '@/lib/events/event-bus';
import { EVENT_TYPES, createBaseEvent } from '@/lib/events/types';

// Mock EventBus
const mockEventBus = {
  publishEvent: jest.fn(),
  subscribeToEventType: jest.fn(),
  cleanup: jest.fn(),
};

describe('RevealManager', () => {
  let revealManager: RevealManager;
  const sessionCode = 'ABC123';
  const participantId = 'user-123';
  const participantName = 'Alice';

  const mockCardPositions: CardPosition[] = [
    { cardId: 'card-1', x: 100, y: 200, pile: 'top8' },
    { cardId: 'card-2', x: 150, y: 200, pile: 'top8' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockEventBus.subscribeToEventType.mockReturnValue(() => {});
    revealManager = new RevealManager(
      mockEventBus as unknown as EventBus,
      sessionCode,
      participantId,
      participantName
    );
  });

  afterEach(() => {
    revealManager.cleanup();
  });

  describe('initialization', () => {
    it('should initialize with correct parameters', () => {
      expect(revealManager).toBeDefined();
      expect(revealManager.isRevealed()).toBe(false);
      expect(revealManager.getRevealedParticipants()).toEqual([]);
    });

    it('should set up event listeners', () => {
      expect(mockEventBus.subscribeToEventType).toHaveBeenCalledTimes(5);
      expect(mockEventBus.subscribeToEventType).toHaveBeenCalledWith(
        EVENT_TYPES.SELECTION_REVEALED,
        expect.any(Function)
      );
      expect(mockEventBus.subscribeToEventType).toHaveBeenCalledWith(
        EVENT_TYPES.SELECTION_UNREVEALED,
        expect.any(Function)
      );
      expect(mockEventBus.subscribeToEventType).toHaveBeenCalledWith(
        EVENT_TYPES.ARRANGEMENT_UPDATED,
        expect.any(Function)
      );
      expect(mockEventBus.subscribeToEventType).toHaveBeenCalledWith(
        EVENT_TYPES.VIEWER_JOINED,
        expect.any(Function)
      );
      expect(mockEventBus.subscribeToEventType).toHaveBeenCalledWith(
        EVENT_TYPES.VIEWER_LEFT,
        expect.any(Function)
      );
    });
  });

  describe('revealSelection', () => {
    it('should publish reveal event and update local state', async () => {
      mockEventBus.publishEvent.mockResolvedValue(undefined);

      await revealManager.revealSelection('top8', mockCardPositions);

      expect(mockEventBus.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENT_TYPES.SELECTION_REVEALED,
          sessionCode,
          participantId,
          payload: {
            revealType: 'top8',
            cardPositions: mockCardPositions,
            participantName
          }
        })
      );

      expect(revealManager.isRevealed('top8')).toBe(true);
      expect(revealManager.isRevealed('top3')).toBe(false);
    });

    it('should handle reveal failures', async () => {
      const error = new Error('Publish failed');
      mockEventBus.publishEvent.mockRejectedValue(error);

      await expect(revealManager.revealSelection('top8', mockCardPositions))
        .rejects.toThrow('Publish failed');

      // Local state should not be updated on failure
      expect(revealManager.isRevealed()).toBe(false);
    });

    it('should throw error when cleaned up', async () => {
      revealManager.cleanup();

      await expect(revealManager.revealSelection('top8', mockCardPositions))
        .rejects.toThrow('RevealManager has been cleaned up');
    });
  });

  describe('unrevealSelection', () => {
    beforeEach(async () => {
      mockEventBus.publishEvent.mockResolvedValue(undefined);
      await revealManager.revealSelection('top8', mockCardPositions);
      jest.clearAllMocks();
    });

    it('should publish unreveal event and update local state', async () => {
      await revealManager.unrevealSelection('top8');

      expect(mockEventBus.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENT_TYPES.SELECTION_UNREVEALED,
          sessionCode,
          participantId,
          payload: {
            revealType: 'top8',
            participantName
          }
        })
      );

      expect(revealManager.isRevealed()).toBe(false);
    });
  });

  describe('updateArrangement', () => {
    const updatedPositions: CardPosition[] = [
      { cardId: 'card-1', x: 200, y: 300, pile: 'top8' },
      { cardId: 'card-2', x: 250, y: 300, pile: 'top8' },
    ];

    beforeEach(async () => {
      mockEventBus.publishEvent.mockResolvedValue(undefined);
      await revealManager.revealSelection('top8', mockCardPositions);
      jest.clearAllMocks();
    });

    it('should update arrangement when revealed', async () => {
      await revealManager.updateArrangement('top8', updatedPositions);

      expect(mockEventBus.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENT_TYPES.ARRANGEMENT_UPDATED,
          sessionCode,
          participantId,
          payload: {
            revealType: 'top8',
            cardPositions: updatedPositions,
            participantName
          }
        })
      );
    });

    it('should throw error when not revealed', async () => {
      await revealManager.unrevealSelection('top8');

      await expect(revealManager.updateArrangement('top8', updatedPositions))
        .rejects.toThrow('Cannot update arrangement - not currently revealed');
    });

    it('should throw error for wrong reveal type', async () => {
      await expect(revealManager.updateArrangement('top3', updatedPositions))
        .rejects.toThrow('Cannot update arrangement - not currently revealed');
    });
  });

  describe('viewer management', () => {
    beforeEach(async () => {
      mockEventBus.publishEvent.mockResolvedValue(undefined);
      await revealManager.revealSelection('top8', mockCardPositions);
      jest.clearAllMocks();
    });

    it('should allow joining as viewer', async () => {
      const targetParticipantId = 'other-user';

      // Simulate other user being revealed
      const otherReveal: RevealState = {
        participantId: targetParticipantId,
        sessionCode,
        revealType: 'top8',
        isRevealed: true,
        cardPositions: mockCardPositions,
        lastUpdated: Date.now(),
        viewerCount: 0
      };
      (revealManager as any).revealed.set(targetParticipantId, otherReveal);

      await revealManager.joinViewer(targetParticipantId);

      expect(mockEventBus.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENT_TYPES.VIEWER_JOINED,
          sessionCode,
          participantId,
          payload: {
            targetParticipantId,
            viewerName: participantName
          }
        })
      );
    });

    it('should throw error when joining viewer for non-revealed participant', async () => {
      const targetParticipantId = 'other-user';

      await expect(revealManager.joinViewer(targetParticipantId))
        .rejects.toThrow('Target participant has not revealed their selection');
    });

    it('should allow leaving as viewer', async () => {
      const targetParticipantId = 'other-user';

      await revealManager.leaveViewer(targetParticipantId);

      expect(mockEventBus.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: EVENT_TYPES.VIEWER_LEFT,
          sessionCode,
          participantId,
          payload: {
            targetParticipantId,
            viewerName: participantName
          }
        })
      );
    });
  });

  describe('event handling', () => {
    let revealEventHandler: any;
    let unrevealEventHandler: any;
    let viewerJoinedHandler: any;
    let viewerLeftHandler: any;

    beforeEach(() => {
      // Extract the event handlers from the mock calls
      const calls = mockEventBus.subscribeToEventType.mock.calls;
      revealEventHandler = calls.find(call => call[0] === EVENT_TYPES.SELECTION_REVEALED)?.[1];
      unrevealEventHandler = calls.find(call => call[0] === EVENT_TYPES.SELECTION_UNREVEALED)?.[1];
      viewerJoinedHandler = calls.find(call => call[0] === EVENT_TYPES.VIEWER_JOINED)?.[1];
      viewerLeftHandler = calls.find(call => call[0] === EVENT_TYPES.VIEWER_LEFT)?.[1];
    });

    it('should handle reveal events from other participants', () => {
      const otherParticipantId = 'other-user';
      const revealEvent = {
        ...createBaseEvent({
          type: EVENT_TYPES.SELECTION_REVEALED,
          sessionCode,
          participantId: otherParticipantId
        }),
        payload: {
          revealType: 'top8' as const,
          cardPositions: mockCardPositions,
          participantName: 'Bob'
        }
      };

      revealEventHandler(revealEvent);

      const revealState = revealManager.getRevealState(otherParticipantId);
      expect(revealState).toBeDefined();
      expect(revealState!.isRevealed).toBe(true);
      expect(revealState!.revealType).toBe('top8');
      expect(revealState!.cardPositions).toEqual(mockCardPositions);
    });

    it('should handle unreveal events from other participants', () => {
      const otherParticipantId = 'other-user';
      
      // First reveal
      const revealEvent = {
        ...createBaseEvent({
          type: EVENT_TYPES.SELECTION_REVEALED,
          sessionCode,
          participantId: otherParticipantId
        }),
        payload: {
          revealType: 'top8' as const,
          cardPositions: mockCardPositions,
          participantName: 'Bob'
        }
      };
      revealEventHandler(revealEvent);

      // Then unreveal
      const unrevealEvent = {
        ...createBaseEvent({
          type: EVENT_TYPES.SELECTION_UNREVEALED,
          sessionCode,
          participantId: otherParticipantId
        }),
        payload: {
          revealType: 'top8' as const,
          participantName: 'Bob'
        }
      };
      unrevealEventHandler(unrevealEvent);

      const revealState = revealManager.getRevealState(otherParticipantId);
      expect(revealState).toBeUndefined();
    });

    it('should handle viewer joined events', () => {
      const viewerEvent = {
        ...createBaseEvent({
          type: EVENT_TYPES.VIEWER_JOINED,
          sessionCode,
          participantId: 'viewer-123'
        }),
        payload: {
          targetParticipantId: participantId,
          viewerName: 'Charlie'
        }
      };

      viewerJoinedHandler(viewerEvent);

      expect(revealManager.getViewerCount(participantId)).toBe(1);
      expect(revealManager.getViewers(participantId)).toEqual(['viewer-123']);
    });

    it('should handle viewer left events', () => {
      const viewerId = 'viewer-123';
      
      // First join
      const joinEvent = {
        ...createBaseEvent({
          type: EVENT_TYPES.VIEWER_JOINED,
          sessionCode,
          participantId: viewerId
        }),
        payload: {
          targetParticipantId: participantId,
          viewerName: 'Charlie'
        }
      };
      viewerJoinedHandler(joinEvent);

      // Then leave
      const leaveEvent = {
        ...createBaseEvent({
          type: EVENT_TYPES.VIEWER_LEFT,
          sessionCode,
          participantId: viewerId
        }),
        payload: {
          targetParticipantId: participantId,
          viewerName: 'Charlie'
        }
      };
      viewerLeftHandler(leaveEvent);

      expect(revealManager.getViewerCount(participantId)).toBe(0);
      expect(revealManager.getViewers(participantId)).toEqual([]);
    });
  });

  describe('state queries', () => {
    beforeEach(async () => {
      mockEventBus.publishEvent.mockResolvedValue(undefined);
      await revealManager.revealSelection('top8', mockCardPositions);
    });

    it('should return correct reveal state', () => {
      const state = revealManager.getRevealState(participantId);
      
      expect(state).toBeDefined();
      expect(state!.participantId).toBe(participantId);
      expect(state!.revealType).toBe('top8');
      expect(state!.isRevealed).toBe(true);
      expect(state!.cardPositions).toEqual(mockCardPositions);
    });

    it('should return revealed participants', () => {
      const revealed = revealManager.getRevealedParticipants();
      
      expect(revealed).toHaveLength(1);
      expect(revealed[0].participantId).toBe(participantId);
    });

    it('should check reveal status correctly', () => {
      expect(revealManager.isRevealed()).toBe(true);
      expect(revealManager.isRevealed('top8')).toBe(true);
      expect(revealManager.isRevealed('top3')).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should clean up properly', () => {
      const unsubscribeMock = jest.fn();
      mockEventBus.subscribeToEventType.mockReturnValue(unsubscribeMock);
      
      // Create new instance to test cleanup
      const manager = new RevealManager(
        mockEventBus as unknown as EventBus,
        sessionCode,
        participantId,
        participantName
      );
      
      manager.cleanup();

      // Should call unsubscribe for all event types
      expect(unsubscribeMock).toHaveBeenCalledTimes(5);
      
      // Should prevent further operations
      expect(manager.revealSelection('top8', mockCardPositions))
        .rejects.toThrow('RevealManager has been cleaned up');
    });
  });
});