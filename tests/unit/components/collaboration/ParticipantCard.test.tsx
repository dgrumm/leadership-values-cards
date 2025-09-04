import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParticipantCard } from '../../../../components/collaboration/ParticipantCard';
import type { ParticipantDisplayData } from '../../../../lib/types/participant-display';
import type { ViewerArrangement } from '../../../../lib/collaboration/viewer-sync';

// Mock UI components
jest.mock('../../../../components/ui/Button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  )
}));

jest.mock('../../../../components/ui/StatusBadge', () => ({
  StatusBadge: ({ status, currentStep }: any) => (
    <span data-testid="status-badge">{status} (Step {currentStep})</span>
  )
}));

// Mock useViewerSync hook
const mockGetArrangement = jest.fn();
jest.mock('../../../../hooks/collaboration/useViewerSync', () => ({
  useViewerSync: () => ({
    getArrangement: mockGetArrangement,
    arrangements: [],
    revealArrangement: jest.fn(),
    updateArrangement: jest.fn(),
    hideArrangement: jest.fn(),
    isReady: true,
    error: null
  })
}));

describe('ParticipantCard', () => {
  const mockOnViewReveal = jest.fn();

  const createMockParticipant = (overrides: Partial<ParticipantDisplayData> = {}): ParticipantDisplayData => ({
    participantId: 'test-participant-123',
    name: 'Test User',
    emoji: '🎯',
    color: '#3B82F6',
    currentStep: 2,
    status: 'sorting',
    lastActive: Date.now(),
    isViewing: null,
    isCurrentUser: false,
    joinedAt: new Date().toISOString(),
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetArrangement.mockReturnValue(null); // Default: no arrangement
  });

  describe('Self-view exclusion', () => {
    test('should NOT show view button for current user with revealed status', () => {
      const participant = createMockParticipant({
        participantId: 'current-user-123',
        status: 'revealed-8',
        isCurrentUser: true
      });

      // Mock arrangement for current user
      const arrangement: ViewerArrangement = {
        participantId: 'current-user-123',
        participantName: 'Test User',
        step: 'step2',
        cards: [],
        isRevealed: true,
        lastUpdated: Date.now()
      };
      mockGetArrangement.mockReturnValue(arrangement);

      render(
        <ParticipantCard
          participant={participant}
          sessionCode="TEST01"
          onViewReveal={mockOnViewReveal}
        />
      );

      // Should show status badge
      expect(screen.getByTestId('status-badge')).toHaveTextContent('revealed-8');
      
      // Should show "(You)" indicator - check for separate elements
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('(You)')).toBeInTheDocument();

      // Should NOT show view button for current user
      expect(screen.queryByRole('button', { name: /See Top 8/i })).not.toBeInTheDocument();
      expect(screen.queryByText('👁️')).not.toBeInTheDocument();
    });

    test('should show view button for OTHER user with revealed status', () => {
      const participant = createMockParticipant({
        participantId: 'other-user-123',
        status: 'revealed-8',
        isCurrentUser: false
      });

      // Mock arrangement for other user
      const arrangement: ViewerArrangement = {
        participantId: 'other-user-123',
        participantName: 'Test User',
        step: 'step2',
        cards: [],
        isRevealed: true,
        lastUpdated: Date.now()
      };
      mockGetArrangement.mockReturnValue(arrangement);

      render(
        <ParticipantCard
          participant={participant}
          sessionCode="TEST01"
          onViewReveal={mockOnViewReveal}
        />
      );

      // Should show status badge
      expect(screen.getByTestId('status-badge')).toHaveTextContent('revealed-8');

      // Should show view button for other user - check for the text content
      const viewButtonText = screen.getByText(/See Top 8/);
      expect(viewButtonText).toBeInTheDocument();
      
      // Check for emoji within the button
      const viewButton = viewButtonText.closest('button');
      expect(viewButton).toBeInTheDocument();
      expect(viewButton).toHaveTextContent('👁️');
    });

    test('should handle revealed-3 status for current user', () => {
      const participant = createMockParticipant({
        participantId: 'current-user-123',
        status: 'revealed-3',
        currentStep: 3,
        isCurrentUser: true
      });

      // Mock arrangement for current user (step 3)
      const arrangement: ViewerArrangement = {
        participantId: 'current-user-123',
        participantName: 'Test User',
        step: 'step3',
        cards: [],
        isRevealed: true,
        lastUpdated: Date.now()
      };
      mockGetArrangement.mockReturnValue(arrangement);

      render(
        <ParticipantCard
          participant={participant}
          sessionCode="TEST01"
          onViewReveal={mockOnViewReveal}
        />
      );

      // Should show status badge
      expect(screen.getByTestId('status-badge')).toHaveTextContent('revealed-3');

      // Should NOT show view button for current user
      expect(screen.queryByRole('button', { name: /See Top 3/i })).not.toBeInTheDocument();
    });

    test('should handle revealed-3 status for other user', () => {
      const participant = createMockParticipant({
        participantId: 'other-user-123',
        status: 'revealed-3',
        currentStep: 3,
        isCurrentUser: false
      });

      // Mock arrangement for other user (step 3)
      const arrangement: ViewerArrangement = {
        participantId: 'other-user-123',
        participantName: 'Test User',
        step: 'step3',
        cards: [],
        isRevealed: true,
        lastUpdated: Date.now()
      };
      mockGetArrangement.mockReturnValue(arrangement);

      render(
        <ParticipantCard
          participant={participant}
          sessionCode="TEST01"
          onViewReveal={mockOnViewReveal}
        />
      );

      // Should show view button for other user - use more specific selector
      const viewButton = screen.getByText(/See Top 3/);
      expect(viewButton).toBeInTheDocument();
      
      // Test click functionality - click the parent button
      const buttonElement = viewButton.closest('button');
      expect(buttonElement).toBeInTheDocument();
      
      fireEvent.click(buttonElement!);
      expect(mockOnViewReveal).toHaveBeenCalledWith('other-user-123', 'revealed-3');
    });

    test('should NOT show view button for non-revealed status regardless of user', () => {
      const participantSorting = createMockParticipant({
        status: 'sorting',
        isCurrentUser: false
      });

      render(
        <ParticipantCard
          participant={participantSorting}
          sessionCode="TEST01"
          onViewReveal={mockOnViewReveal}
        />
      );

      expect(screen.queryByRole('button', { name: /See/i })).not.toBeInTheDocument();
      expect(screen.getByText('Still sorting cards...')).toBeInTheDocument();
    });

    test('should show completed status correctly', () => {
      const participant = createMockParticipant({
        status: 'completed',
        currentStep: 3,
        isCurrentUser: false
      });

      render(
        <ParticipantCard
          participant={participant}
          sessionCode="TEST01"
          onViewReveal={mockOnViewReveal}
        />
      );

      expect(screen.getByText('Exercise completed! 🎉')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /See/i })).not.toBeInTheDocument();
    });
  });

  describe('Backward compatibility', () => {
    test('should work with legacy currentUserId prop', () => {
      const participant = createMockParticipant({
        participantId: 'legacy-user-123',
        status: 'revealed-8',
        isCurrentUser: false // This should be overridden by currentUserId
      });

      render(
        <ParticipantCard
          participant={participant}
          sessionCode="TEST01"
          currentUserId="legacy-user-123" // Legacy prop indicating current user
          onViewReveal={mockOnViewReveal}
        />
      );

      // Should show "(You)" indicator due to currentUserId match
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('(You)')).toBeInTheDocument();

      // Should NOT show view button due to legacy currentUserId logic
      expect(screen.queryByRole('button', { name: /See Top 8/i })).not.toBeInTheDocument();
    });
  });

  describe('Activity indicators', () => {
    test('should show active indicator for recently active user', () => {
      const participant = createMockParticipant({
        lastActive: Date.now() - 1000 // 1 second ago
      });

      render(
        <ParticipantCard
          participant={participant}
          sessionCode="TEST01"
          onViewReveal={mockOnViewReveal}
        />
      );

      const indicator = screen.getByTitle('Active now');
      expect(indicator).toHaveClass('bg-green-400', 'animate-pulse');
    });

    test('should show idle indicator for somewhat inactive user', () => {
      const participant = createMockParticipant({
        lastActive: Date.now() - 60000 // 1 minute ago
      });

      render(
        <ParticipantCard
          participant={participant}
          sessionCode="TEST01"
          onViewReveal={mockOnViewReveal}
        />
      );

      const indicator = screen.getByTitle('Recently active');
      expect(indicator).toHaveClass('bg-yellow-400');
    });

    test('should show inactive indicator for long inactive user', () => {
      const participant = createMockParticipant({
        lastActive: Date.now() - 600000 // 10 minutes ago
      });

      render(
        <ParticipantCard
          participant={participant}
          sessionCode="TEST01"
          onViewReveal={mockOnViewReveal}
        />
      );

      const indicator = screen.getByTitle('Inactive');
      expect(indicator).toHaveClass('bg-gray-300');
    });
  });
});