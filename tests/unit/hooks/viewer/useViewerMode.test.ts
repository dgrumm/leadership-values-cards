import { renderHook, waitFor } from '@testing-library/react';
import { useViewerMode } from '@/hooks/viewer/useViewerMode';
import { getArrangementSync } from '@/lib/viewer/arrangement-sync';
import type { ArrangementViewData } from '@/types/viewer';
import type { ParticipantDisplayData } from '@/lib/types/participant-display';

// Mock EventDrivenSessionContext
const mockParticipantsForDisplay = new Map<string, ParticipantDisplayData>();
const mockCurrentUser = {
  id: 'currentUser',
  name: 'Current User',
  emoji: '👤',
  color: 'blue'
};

jest.mock('@/contexts/EventDrivenSessionContext', () => ({
  useEventDrivenSession: () => ({
    participantsForDisplay: mockParticipantsForDisplay,
    currentUser: mockCurrentUser
  })
}));

// Mock ArrangementSync
const mockArrangementSync = {
  initializeForSession: jest.fn(),
  subscribeToArrangementUpdates: jest.fn(),
  getCurrentArrangement: jest.fn()
};

jest.mock('@/lib/viewer/arrangement-sync', () => ({
  getArrangementSync: () => mockArrangementSync,
  resetArrangementSync: jest.fn()
}));

describe('useViewerMode', () => {
  const sessionCode = 'TEST123';
  const participantId = 'participant1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockParticipantsForDisplay.clear();
    
    // Reset mocks
    mockArrangementSync.initializeForSession.mockResolvedValue(undefined);
    mockArrangementSync.subscribeToArrangementUpdates.mockReturnValue(() => {});
    mockArrangementSync.getCurrentArrangement.mockResolvedValue(null);
  });

  describe('initialization', () => {
    it('should initialize arrangement sync on mount', async () => {
      renderHook(() => useViewerMode(sessionCode, participantId));

      await waitFor(() => {
        expect(mockArrangementSync.initializeForSession).toHaveBeenCalledWith(sessionCode);
      });
    });

    it('should handle initialization errors', async () => {
      mockArrangementSync.initializeForSession.mockRejectedValue(new Error('Init failed'));

      const { result } = renderHook(() => useViewerMode(sessionCode, participantId));

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to initialize viewer mode');
      });
    });
  });

  describe('participant validation', () => {
    it('should detect valid target participant', () => {
      const participant: ParticipantDisplayData = {
        participantId: 'participant1',
        name: 'Target User',
        emoji: '👥',
        color: 'green',
        currentStep: 2,
        status: 'revealed-8',
        lastActive: Date.now(),
        isViewing: null,
        isCurrentUser: false,
        joinedAt: new Date().toISOString()
      };

      mockParticipantsForDisplay.set('participant1', participant);

      const { result } = renderHook(() => useViewerMode(sessionCode, participantId));

      expect(result.current.participant).toEqual(participant);
      expect(result.current.isValidTarget).toBe(true);
      expect(result.current.isRevealed).toBe(true);
    });

    it('should detect invalid target participant', () => {
      // No participant in map

      const { result } = renderHook(() => useViewerMode(sessionCode, participantId));

      expect(result.current.participant).toBeNull();
      expect(result.current.isValidTarget).toBe(false);
      expect(result.current.isRevealed).toBe(false);
      expect(result.current.error).toBe('Participant not found');
    });

    it('should prevent viewing own arrangement', () => {
      const selfParticipant: ParticipantDisplayData = {
        participantId: 'currentUser', // Same as mockCurrentUser.id
        name: 'Current User',
        emoji: '👤',
        color: 'blue',
        currentStep: 2,
        status: 'revealed-8',
        lastActive: Date.now(),
        isViewing: null,
        isCurrentUser: true,
        joinedAt: new Date().toISOString()
      };

      mockParticipantsForDisplay.set('currentUser', selfParticipant);

      const { result } = renderHook(() => useViewerMode(sessionCode, 'currentUser'));

      expect(result.current.participant).toEqual(selfParticipant);
      expect(result.current.isValidTarget).toBe(false);
      expect(result.current.error).toBe('Cannot view your own arrangement');
    });

    it('should detect unrevealed participant', () => {
      const unrevealedParticipant: ParticipantDisplayData = {
        participantId: 'participant1',
        name: 'Target User',
        emoji: '👥',
        color: 'green',
        currentStep: 1,
        status: 'sorting', // Not revealed
        lastActive: Date.now(),
        isViewing: null,
        isCurrentUser: false,
        joinedAt: new Date().toISOString()
      };

      mockParticipantsForDisplay.set('participant1', unrevealedParticipant);

      const { result } = renderHook(() => useViewerMode(sessionCode, participantId));

      expect(result.current.participant).toEqual(unrevealedParticipant);
      expect(result.current.isValidTarget).toBe(true); // Participant exists, so target is valid
      expect(result.current.isRevealed).toBe(false); // But not revealed
      expect(result.current.error).toBe('Participant has not revealed their selection');
    });
  });

  describe('arrangement subscription', () => {
    beforeEach(() => {
      const participant: ParticipantDisplayData = {
        participantId: 'participant1',
        name: 'Target User',
        emoji: '👥',
        color: 'green',
        currentStep: 2,
        status: 'revealed-8',
        lastActive: Date.now(),
        isViewing: null,
        isCurrentUser: false,
        joinedAt: new Date().toISOString()
      };

      mockParticipantsForDisplay.set('participant1', participant);
    });

    it('should subscribe to arrangement updates for valid revealed participant', async () => {
      const { result } = renderHook(() => useViewerMode(sessionCode, participantId));

      await waitFor(() => {
        expect(mockArrangementSync.subscribeToArrangementUpdates).toHaveBeenCalledWith(
          participantId,
          expect.any(Function)
        );
      });
    });

    it('should update arrangement when subscription receives data', async () => {
      let updateCallback: ((arrangement: ArrangementViewData) => void) | undefined;

      mockArrangementSync.subscribeToArrangementUpdates.mockImplementation(
        (participantId, callback) => {
          updateCallback = callback;
          return () => {};
        }
      );

      const { result } = renderHook(() => useViewerMode(sessionCode, participantId));

      await waitFor(() => {
        expect(updateCallback).toBeDefined();
      });

      const mockArrangement: ArrangementViewData = {
        participantId: 'participant1',
        participantName: 'Target User',
        revealType: 'top8',
        cardPositions: [
          { cardId: 'card1', x: 100, y: 200, pile: 'top8' }
        ],
        lastUpdated: Date.now()
      };

      updateCallback!(mockArrangement);

      await waitFor(() => {
        expect(result.current.arrangement).toEqual(mockArrangement);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should not subscribe for truly invalid participants (non-existent)', async () => {
      // No participant in map
      renderHook(() => useViewerMode(sessionCode, 'nonexistent'));

      await waitFor(() => {
        expect(mockArrangementSync.subscribeToArrangementUpdates).not.toHaveBeenCalled();
      });
    });

    it('should not subscribe for unrevealed participants', async () => {
      const unrevealedParticipant: ParticipantDisplayData = {
        participantId: 'participant1',
        name: 'Target User',
        emoji: '👥',
        color: 'green',
        currentStep: 1,
        status: 'sorting',
        lastActive: Date.now(),
        isViewing: null,
        isCurrentUser: false,
        joinedAt: new Date().toISOString()
      };

      mockParticipantsForDisplay.set('participant1', unrevealedParticipant);

      renderHook(() => useViewerMode(sessionCode, participantId));

      await waitFor(() => {
        expect(mockArrangementSync.subscribeToArrangementUpdates).not.toHaveBeenCalled();
      });
    });

    it('should not subscribe for self viewing', async () => {
      renderHook(() => useViewerMode(sessionCode, 'currentUser'));

      await waitFor(() => {
        expect(mockArrangementSync.subscribeToArrangementUpdates).not.toHaveBeenCalled();
      });
    });

    it('should try to get current arrangement on subscription', async () => {
      renderHook(() => useViewerMode(sessionCode, participantId));

      await waitFor(() => {
        expect(mockArrangementSync.getCurrentArrangement).toHaveBeenCalledWith(participantId);
      });
    });

    it('should set arrangement from getCurrentArrangement if available', async () => {
      const existingArrangement: ArrangementViewData = {
        participantId: 'participant1',
        participantName: 'Target User',
        revealType: 'top8',
        cardPositions: [],
        lastUpdated: Date.now() - 5000 // 5 seconds ago
      };

      mockArrangementSync.getCurrentArrangement.mockResolvedValue(existingArrangement);

      const { result } = renderHook(() => useViewerMode(sessionCode, participantId));

      await waitFor(() => {
        expect(result.current.arrangement).toEqual(existingArrangement);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle getCurrentArrangement errors gracefully', async () => {
      mockArrangementSync.getCurrentArrangement.mockRejectedValue(new Error('Failed to get'));

      const { result } = renderHook(() => useViewerMode(sessionCode, participantId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull(); // Should not set error for this failure
      });
    });

    it('should unsubscribe on unmount', () => {
      const mockUnsubscribe = jest.fn();
      mockArrangementSync.subscribeToArrangementUpdates.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useViewerMode(sessionCode, participantId));

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('loading states', () => {
    it('should start in loading state for valid targets', () => {
      const participant: ParticipantDisplayData = {
        participantId: 'participant1',
        name: 'Target User',
        emoji: '👥',
        color: 'green',
        currentStep: 2,
        status: 'revealed-8',
        lastActive: Date.now(),
        isViewing: null,
        isCurrentUser: false,
        joinedAt: new Date().toISOString()
      };

      mockParticipantsForDisplay.set('participant1', participant);

      const { result } = renderHook(() => useViewerMode(sessionCode, participantId));

      expect(result.current.isLoading).toBe(true);
    });

    it('should set loading false for invalid targets', async () => {
      // No participant
      const { result } = renderHook(() => useViewerMode(sessionCode, participantId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set loading false after subscription setup', async () => {
      const participant: ParticipantDisplayData = {
        participantId: 'participant1',
        name: 'Target User',
        emoji: '👥',
        color: 'green',
        currentStep: 2,
        status: 'revealed-8',
        lastActive: Date.now(),
        isViewing: null,
        isCurrentUser: false,
        joinedAt: new Date().toISOString()
      };

      mockParticipantsForDisplay.set('participant1', participant);

      const { result } = renderHook(() => useViewerMode(sessionCode, participantId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });
});