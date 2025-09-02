import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RevealButtonToast } from '../../../../components/reveals/RevealButtonToast';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Info: ({ className }: any) => <div className={className} data-testid="info-icon">ℹ️</div>,
  X: ({ className }: any) => <div className={className} data-testid="x-icon">✕</div>
}));

describe('RevealButtonToast', () => {
  const mockOnDismiss = jest.fn();

  const defaultProps = {
    isVisible: true,
    step: 'step2' as const,
    onDismiss: mockOnDismiss,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    test('should not render when isVisible is false', () => {
      render(
        <RevealButtonToast
          {...defaultProps}
          isVisible={false}
        />
      );

      expect(screen.queryByText(/You can now share your/)).not.toBeInTheDocument();
    });

    test('should render toast when isVisible is true', () => {
      render(<RevealButtonToast {...defaultProps} />);

      expect(screen.getByText(/You can now share your Top 8 selection with the group!/)).toBeInTheDocument();
      expect(screen.getByText('8 cards in Most Important pile')).toBeInTheDocument();
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });

    test('should render correct content for step2', () => {
      render(
        <RevealButtonToast
          {...defaultProps}
          step="step2"
        />
      );

      expect(screen.getByText(/You can now share your Top 8 selection with the group!/)).toBeInTheDocument();
      expect(screen.getByText('8 cards in Most Important pile')).toBeInTheDocument();
    });

    test('should render correct content for step3', () => {
      render(
        <RevealButtonToast
          {...defaultProps}
          step="step3"
        />
      );

      expect(screen.getByText(/You can now share your Top 3 selection with the group!/)).toBeInTheDocument();
      expect(screen.getByText('3 cards in Most Important pile')).toBeInTheDocument();
    });

    test('should apply custom position when provided', () => {
      const customPosition = {
        top: '100px',
        left: '200px'
      };

      render(
        <RevealButtonToast
          {...defaultProps}
          position={customPosition}
        />
      );

      const toast = screen.getByRole('alert');
      expect(toast).toHaveStyle({
        top: '100px',
        left: '200px'
      });
    });

    test('should apply default position when no position provided', () => {
      render(<RevealButtonToast {...defaultProps} />);

      const toast = screen.getByRole('alert');
      expect(toast).toHaveStyle({
        top: '4rem',
        left: '50%',
        transform: 'translateX(-50%)'
      });
    });

    test('should apply custom className when provided', () => {
      render(
        <RevealButtonToast
          {...defaultProps}
          className="custom-toast-class"
        />
      );

      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('custom-toast-class');
    });
  });

  describe('Auto-dismiss behavior', () => {
    test('should auto-dismiss after 4 seconds', async () => {
      render(<RevealButtonToast {...defaultProps} />);

      expect(screen.getByText(/You can now share your/)).toBeInTheDocument();

      // Fast-forward 4 seconds
      jest.advanceTimersByTime(4000);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    test('should not auto-dismiss if already dismissed', () => {
      render(<RevealButtonToast {...defaultProps} />);

      // Manually dismiss
      const dismissButton = screen.getByLabelText('Dismiss notification');
      fireEvent.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);

      // Fast-forward 4 seconds
      jest.advanceTimersByTime(4000);

      // Should not be called again
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    test('should clear timer when component unmounts', () => {
      const { unmount } = render(<RevealButtonToast {...defaultProps} />);

      // Unmount before timer completes
      unmount();

      // Fast-forward past timer duration
      jest.advanceTimersByTime(5000);

      // Should not call onDismiss after unmount
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Manual dismiss', () => {
    test('should call onDismiss when dismiss button is clicked', () => {
      render(<RevealButtonToast {...defaultProps} />);

      const dismissButton = screen.getByLabelText('Dismiss notification');
      fireEvent.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    test('should show dismiss button with correct icon', () => {
      render(<RevealButtonToast {...defaultProps} />);

      const dismissButton = screen.getByLabelText('Dismiss notification');
      expect(dismissButton).toBeInTheDocument();
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', () => {
      render(<RevealButtonToast {...defaultProps} />);

      const toast = screen.getByRole('alert');
      expect(toast).toHaveAttribute('aria-live', 'polite');
      expect(toast).toHaveAttribute('aria-atomic', 'true');
    });

    test('should have accessible dismiss button', () => {
      render(<RevealButtonToast {...defaultProps} />);

      const dismissButton = screen.getByRole('button', { name: 'Dismiss notification' });
      expect(dismissButton).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    test('should apply blue theme styling', () => {
      render(<RevealButtonToast {...defaultProps} />);

      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-blue-50', 'border-l-4', 'border-blue-500', 'text-blue-800');
    });

    test('should have tooltip arrow element', () => {
      render(<RevealButtonToast {...defaultProps} />);

      // The arrow should have specific styling classes
      const arrow = document.querySelector('.absolute.-top-2.left-6');
      expect(arrow).toBeInTheDocument();
      expect(arrow).toHaveClass('bg-blue-50', 'border-l-4', 'border-t-4', 'border-blue-500');
    });

    test('should include progress bar for auto-dismiss visualization', () => {
      render(<RevealButtonToast {...defaultProps} />);

      const progressBar = document.querySelector('.absolute.bottom-0.left-0.h-1');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveClass('bg-blue-600', 'opacity-30');
    });
  });

  describe('Content validation', () => {
    test('should display correct message and card count for each step', () => {
      // Test step2
      render(
        <RevealButtonToast
          {...defaultProps}
          step="step2"
        />
      );

      expect(screen.getByText(/You can now share your Top 8 selection with the group!/)).toBeInTheDocument();
      expect(screen.getByText('8 cards in Most Important pile')).toBeInTheDocument();

      // Test step3
      render(
        <RevealButtonToast
          {...defaultProps}
          step="step3"
        />
      );

      expect(screen.getByText(/You can now share your Top 3 selection with the group!/)).toBeInTheDocument();
      expect(screen.getByText('3 cards in Most Important pile')).toBeInTheDocument();
    });

    test('should include informative sub-text about card count', () => {
      render(<RevealButtonToast {...defaultProps} />);

      // Should show helpful context about threshold reached
      expect(screen.getByText(/8 cards in Most Important pile/)).toBeInTheDocument();
    });
  });

  describe('Component lifecycle', () => {
    test('should handle multiple show/hide cycles', () => {
      const { rerender } = render(<RevealButtonToast {...defaultProps} isVisible={false} />);

      expect(screen.queryByText(/You can now share your/)).not.toBeInTheDocument();

      // Show toast
      rerender(<RevealButtonToast {...defaultProps} isVisible={true} />);
      expect(screen.getByText(/You can now share your/)).toBeInTheDocument();

      // Hide toast
      rerender(<RevealButtonToast {...defaultProps} isVisible={false} />);
      expect(screen.queryByText(/You can now share your/)).not.toBeInTheDocument();
    });

    test('should reset timer on visibility change', () => {
      const { rerender } = render(<RevealButtonToast {...defaultProps} isVisible={true} />);

      // Fast-forward 2 seconds
      jest.advanceTimersByTime(2000);
      expect(mockOnDismiss).not.toHaveBeenCalled();

      // Hide and show again (should reset timer)
      rerender(<RevealButtonToast {...defaultProps} isVisible={false} />);
      rerender(<RevealButtonToast {...defaultProps} isVisible={true} />);

      // Fast-forward another 2 seconds (total would be 4, but timer reset)
      jest.advanceTimersByTime(2000);
      expect(mockOnDismiss).not.toHaveBeenCalled();

      // Fast-forward 2 more seconds to complete the new 4-second cycle
      jest.advanceTimersByTime(2000);
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });
});