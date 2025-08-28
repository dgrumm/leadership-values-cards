import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ParticipantList } from '../../../../components/collaboration/ParticipantList';
import type { PresenceData } from '../../../../lib/presence/types';

// Mock child components
jest.mock('../../../../components/collaboration/ParticipantCard', () => {
  return {
    ParticipantCard: ({ participant, onViewReveal }: any) => (
      <div data-testid={`participant-card-${participant.participantId}`}>
        <span data-testid="participant-name">{participant.name}</span>
        <span data-testid="participant-status">{participant.status}</span>
        <span data-testid="participant-step">Step {participant.currentStep}</span>
        {(participant.status === 'revealed-8' || participant.status === 'revealed-3') && (
          <button 
            onClick={() => onViewReveal(participant.participantId, participant.status)}
            data-testid="view-reveal-button"
          >
            View {participant.name}'s Cards
          </button>
        )}
      </div>
    )
  };
});

describe('ParticipantList', () => {
  const mockCurrentUserId = 'current-user-123';
  const mockOnViewReveal = jest.fn();

  const createMockParticipant = (overrides: Partial<PresenceData> = {}): PresenceData => ({
    participantId: 'participant-1',
    name: 'Test User',
    emoji: '😊',
    color: '#FF6B6B',
    currentStep: 1,
    status: 'sorting',
    cursor: { x: 0, y: 0, timestamp: Date.now() },
    lastActive: Date.now(),
    isViewing: null,
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render empty list when no participants', () => {
      render(
        <ParticipantList
          participants={new Map()}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      expect(screen.getByText('No other participants yet')).toBeInTheDocument();
    });

    it('should render participant count', () => {
      const participants = new Map([
        ['user-1', createMockParticipant({ participantId: 'user-1', name: 'User 1' })],
        ['user-2', createMockParticipant({ participantId: 'user-2', name: 'User 2' })],
        ['user-3', createMockParticipant({ participantId: 'user-3', name: 'User 3' })]
      ]);

      render(
        <ParticipantList
          participants={participants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      expect(screen.getByText('3 Participants')).toBeInTheDocument();
    });

    it('should render singular participant count', () => {
      const participants = new Map([
        ['user-1', createMockParticipant({ participantId: 'user-1', name: 'User 1' })]
      ]);

      render(
        <ParticipantList
          participants={participants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      expect(screen.getByText('1 Participant')).toBeInTheDocument();
    });

    it('should exclude current user from participant list', () => {
      const participants = new Map([
        ['current-user-123', createMockParticipant({ participantId: 'current-user-123', name: 'Current User' })],
        ['other-user', createMockParticipant({ participantId: 'other-user', name: 'Other User' })]
      ]);

      render(
        <ParticipantList
          participants={participants}
          currentUserId="current-user-123"
          onViewReveal={mockOnViewReveal}
        />
      );

      expect(screen.queryByTestId('participant-card-current-user-123')).not.toBeInTheDocument();
      expect(screen.getByTestId('participant-card-other-user')).toBeInTheDocument();
      expect(screen.getByText('1 Participant')).toBeInTheDocument();
    });

    it('should render participant cards for each participant', () => {
      const participants = new Map([
        ['user-1', createMockParticipant({ 
          participantId: 'user-1', 
          name: 'Alice',
          status: 'sorting',
          currentStep: 1
        })],
        ['user-2', createMockParticipant({ 
          participantId: 'user-2', 
          name: 'Bob',
          status: 'revealed-8',
          currentStep: 2
        })]
      ]);

      render(
        <ParticipantList
          participants={participants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      expect(screen.getByTestId('participant-card-user-1')).toBeInTheDocument();
      expect(screen.getByTestId('participant-card-user-2')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  describe('participant status display', () => {
    it('should display different status types', () => {
      const statuses: Array<PresenceData['status']> = [
        'sorting',
        'revealed-8', 
        'revealed-3',
        'completed'
      ];

      statuses.forEach((status, index) => {
        const participants = new Map([
          [`user-${index}`, createMockParticipant({ 
            participantId: `user-${index}`,
            name: `User ${index}`,
            status
          })]
        ]);

        const { unmount } = render(
          <ParticipantList
            participants={participants}
            currentUserId={mockCurrentUserId}
            onViewReveal={mockOnViewReveal}
          />
        );

        expect(screen.getByText(status)).toBeInTheDocument();
        unmount();
      });
    });

    it('should display step progression correctly', () => {
      const steps = [1, 2, 3] as const;
      
      steps.forEach((step) => {
        const participants = new Map([
          [`user-step-${step}`, createMockParticipant({ 
            participantId: `user-step-${step}`,
            name: `Step ${step} User`,
            currentStep: step
          })]
        ]);

        const { unmount } = render(
          <ParticipantList
            participants={participants}
            currentUserId={mockCurrentUserId}
            onViewReveal={mockOnViewReveal}
          />
        );

        expect(screen.getByText(`Step ${step}`)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('reveal functionality', () => {
    it('should show view buttons for revealed participants', () => {
      const participants = new Map([
        ['revealed-user', createMockParticipant({ 
          participantId: 'revealed-user',
          name: 'Revealed User',
          status: 'revealed-8'
        })],
        ['sorting-user', createMockParticipant({ 
          participantId: 'sorting-user',
          name: 'Sorting User',
          status: 'sorting'
        })]
      ]);

      render(
        <ParticipantList
          participants={participants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      const viewButtons = screen.getAllByTestId('view-reveal-button');
      expect(viewButtons).toHaveLength(1);
      expect(viewButtons[0]).toHaveTextContent("View Revealed User's Cards");
    });

    it('should call onViewReveal when view button clicked', () => {
      const participants = new Map([
        ['revealed-user', createMockParticipant({ 
          participantId: 'revealed-user',
          name: 'Alice',
          status: 'revealed-8'
        })]
      ]);

      render(
        <ParticipantList
          participants={participants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      const viewButton = screen.getByTestId('view-reveal-button');
      fireEvent.click(viewButton);

      expect(mockOnViewReveal).toHaveBeenCalledWith('revealed-user', 'revealed-8');
    });

    it('should handle multiple revealed participants', () => {
      const participants = new Map([
        ['revealed-8-user', createMockParticipant({ 
          participantId: 'revealed-8-user',
          name: 'Top 8 User',
          status: 'revealed-8'
        })],
        ['revealed-3-user', createMockParticipant({ 
          participantId: 'revealed-3-user',
          name: 'Top 3 User', 
          status: 'revealed-3'
        })]
      ]);

      render(
        <ParticipantList
          participants={participants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      const viewButtons = screen.getAllByTestId('view-reveal-button');
      expect(viewButtons).toHaveLength(2);

      fireEvent.click(viewButtons[0]);
      fireEvent.click(viewButtons[1]);

      // Participants are sorted by name, so "Top 3 User" comes before "Top 8 User"
      expect(mockOnViewReveal).toHaveBeenNthCalledWith(1, 'revealed-3-user', 'revealed-3');
      expect(mockOnViewReveal).toHaveBeenNthCalledWith(2, 'revealed-8-user', 'revealed-8');
    });
  });

  describe('grid layout', () => {
    it('should use responsive grid layout', () => {
      const participants = new Map();
      for (let i = 0; i < 8; i++) {
        participants.set(`user-${i}`, createMockParticipant({ 
          participantId: `user-${i}`,
          name: `User ${i}`
        }));
      }

      const { container } = render(
        <ParticipantList
          participants={participants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass('grid-cols-1');
      expect(gridContainer).toHaveClass('md:grid-cols-2');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });

    it('should handle large numbers of participants', () => {
      const participants = new Map();
      // Create 20 participants to test grid behavior
      for (let i = 0; i < 20; i++) {
        participants.set(`user-${i}`, createMockParticipant({ 
          participantId: `user-${i}`,
          name: `User ${i}`,
          emoji: `🎯`,
          color: '#FF6B6B'
        }));
      }

      render(
        <ParticipantList
          participants={participants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      expect(screen.getByText('20 Participants')).toBeInTheDocument();
      
      // Should render all participant cards
      for (let i = 0; i < 20; i++) {
        expect(screen.getByTestId(`participant-card-user-${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('real-time updates', () => {
    it('should update when participants map changes', async () => {
      const initialParticipants = new Map([
        ['user-1', createMockParticipant({ 
          participantId: 'user-1',
          name: 'User 1',
          status: 'sorting'
        })]
      ]);

      const { rerender } = render(
        <ParticipantList
          participants={initialParticipants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      expect(screen.getByText('sorting')).toBeInTheDocument();

      // Update participant status
      const updatedParticipants = new Map([
        ['user-1', createMockParticipant({ 
          participantId: 'user-1',
          name: 'User 1',
          status: 'revealed-8'
        })]
      ]);

      rerender(
        <ParticipantList
          participants={updatedParticipants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('revealed-8')).toBeInTheDocument();
      });
    });

    it('should handle participants joining', () => {
      const initialParticipants = new Map([
        ['user-1', createMockParticipant({ participantId: 'user-1', name: 'User 1' })]
      ]);

      const { rerender } = render(
        <ParticipantList
          participants={initialParticipants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      expect(screen.getByText('1 Participant')).toBeInTheDocument();

      // Add new participant
      const updatedParticipants = new Map([
        ['user-1', createMockParticipant({ participantId: 'user-1', name: 'User 1' })],
        ['user-2', createMockParticipant({ participantId: 'user-2', name: 'User 2' })]
      ]);

      rerender(
        <ParticipantList
          participants={updatedParticipants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      expect(screen.getByText('2 Participants')).toBeInTheDocument();
      expect(screen.getByTestId('participant-card-user-2')).toBeInTheDocument();
    });

    it('should handle participants leaving', () => {
      const initialParticipants = new Map([
        ['user-1', createMockParticipant({ participantId: 'user-1', name: 'User 1' })],
        ['user-2', createMockParticipant({ participantId: 'user-2', name: 'User 2' })]
      ]);

      const { rerender } = render(
        <ParticipantList
          participants={initialParticipants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      expect(screen.getByText('2 Participants')).toBeInTheDocument();

      // Remove participant
      const updatedParticipants = new Map([
        ['user-1', createMockParticipant({ participantId: 'user-1', name: 'User 1' })]
      ]);

      rerender(
        <ParticipantList
          participants={updatedParticipants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      expect(screen.getByText('1 Participant')).toBeInTheDocument();
      expect(screen.queryByTestId('participant-card-user-2')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      const participants = new Map([
        ['user-1', createMockParticipant({ 
          participantId: 'user-1',
          name: 'Alice',
          status: 'sorting'
        })]
      ]);

      const { container } = render(
        <ParticipantList
          participants={participants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      const participantsList = container.querySelector('[role="region"]');
      expect(participantsList).toHaveAttribute('aria-label', 'Participant list');
    });

    it('should announce participant count for screen readers', () => {
      const participants = new Map([
        ['user-1', createMockParticipant({ participantId: 'user-1', name: 'User 1' })],
        ['user-2', createMockParticipant({ participantId: 'user-2', name: 'User 2' })]
      ]);

      render(
        <ParticipantList
          participants={participants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      const countElement = screen.getByText('2 Participants');
      expect(countElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should have accessible participant cards', () => {
      const participants = new Map([
        ['user-1', createMockParticipant({ 
          participantId: 'user-1',
          name: 'Alice',
          status: 'revealed-8'
        })]
      ]);

      render(
        <ParticipantList
          participants={participants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      const viewButton = screen.getByTestId('view-reveal-button');
      expect(viewButton).toBeInTheDocument();
      expect(viewButton).toBeEnabled();
    });
  });

  describe('error handling', () => {
    it('should handle malformed participant data', () => {
      const participants = new Map([
        ['bad-user', createMockParticipant({ participantId: 'bad-user' })]
      ]);

      expect(() => {
        render(
          <ParticipantList
            participants={participants}
            currentUserId={mockCurrentUserId}
            onViewReveal={mockOnViewReveal}
          />
        );
      }).not.toThrow();
    });

    it('should handle missing onViewReveal callback gracefully', () => {
      const participants = new Map([
        ['user-1', createMockParticipant({ 
          participantId: 'user-1',
          name: 'User 1',
          status: 'revealed-8'
        })]
      ]);

      expect(() => {
        render(
          <ParticipantList
            participants={participants}
            currentUserId={mockCurrentUserId}
            // @ts-ignore - Testing error handling
            onViewReveal={undefined}
          />
        );
      }).not.toThrow();
    });

    it('should handle empty participant ID gracefully', () => {
      const participants = new Map([
        ['', createMockParticipant({ participantId: '', name: 'Empty ID User' })]
      ]);

      expect(() => {
        render(
          <ParticipantList
            participants={participants}
            currentUserId={mockCurrentUserId}
            onViewReveal={mockOnViewReveal}
          />
        );
      }).not.toThrow();
    });
  });

  describe('performance', () => {
    it('should render efficiently with many participants', () => {
      const participants = new Map();
      
      // Create 50 participants (max limit)
      for (let i = 0; i < 50; i++) {
        participants.set(`user-${i}`, createMockParticipant({ 
          participantId: `user-${i}`,
          name: `User ${i}`,
          emoji: `🎯`,
          status: i % 4 === 0 ? 'revealed-8' : 'sorting'
        }));
      }

      const startTime = performance.now();
      
      render(
        <ParticipantList
          participants={participants}
          currentUserId={mockCurrentUserId}
          onViewReveal={mockOnViewReveal}
        />
      );

      const endTime = performance.now();
      
      // Should render quickly even with max participants
      expect(endTime - startTime).toBeLessThan(100); // Under 100ms
      expect(screen.getByText('50 Participants')).toBeInTheDocument();
    });
  });
});