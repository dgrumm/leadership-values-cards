import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RevealEducationModal } from '../../../../components/reveals/RevealEducationModal';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock Button component
jest.mock('../../../../components/ui/Button', () => ({
  Button: ({ children, onClick, variant, className, ...props }: any) => (
    <button
      onClick={onClick}
      className={className}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  )
}));

describe('RevealEducationModal', () => {
  const mockOnContinue = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    isOpen: true,
    step: 'top8' as const,
    onContinue: mockOnContinue,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should not render when isOpen is false', () => {
      render(
        <RevealEducationModal
          {...defaultProps}
          isOpen={false}
        />
      );

      expect(screen.queryByText(/About Revealing Your/)).not.toBeInTheDocument();
    });

    test('should render modal when isOpen is true', () => {
      render(<RevealEducationModal {...defaultProps} />);

      expect(screen.getByText('About Revealing Your Top 8')).toBeInTheDocument();
      expect(screen.getByText('Let others see your eight most important leadership values')).toBeInTheDocument();
    });

    test('should render correct content for Top 8 step', () => {
      render(
        <RevealEducationModal
          {...defaultProps}
          step="top8"
        />
      );

      // Header
      expect(screen.getByText('About Revealing Your Top 8')).toBeInTheDocument();
      expect(screen.getByText('Let others see your eight most important leadership values')).toBeInTheDocument();

      // Main description
      expect(screen.getByText(/other participants will be able to see the cards you've placed in your Most Important pile/)).toBeInTheDocument();

      // Info boxes
      expect(screen.getByText('What others will see')).toBeInTheDocument();
      expect(screen.getByText(/Your eight most important values, their arrangement/)).toBeInTheDocument();

      expect(screen.getByText('You\'re in control')).toBeInTheDocument();
      expect(screen.getByText(/You can toggle this on and off anytime/)).toBeInTheDocument();

      expect(screen.getByText('Great for discussion')).toBeInTheDocument();
      expect(screen.getByText(/Sharing your values helps facilitate meaningful conversations/)).toBeInTheDocument();

      // Buttons
      expect(screen.getByText('Maybe Later')).toBeInTheDocument();
      expect(screen.getByText('Got it! Reveal My Top 8')).toBeInTheDocument();
    });

    test('should render correct content for Top 3 step', () => {
      render(
        <RevealEducationModal
          {...defaultProps}
          step="top3"
        />
      );

      // Header
      expect(screen.getByText('About Revealing Your Top 3')).toBeInTheDocument();
      expect(screen.getByText('Let others see your three most important leadership values')).toBeInTheDocument();

      // Info boxes should reflect Top 3 content
      expect(screen.getByText(/Your three most important values, their arrangement/)).toBeInTheDocument();

      // Button
      expect(screen.getByText('Got it! Reveal My Top 3')).toBeInTheDocument();
    });

    test('should display appropriate emoji icons', () => {
      render(<RevealEducationModal {...defaultProps} />);

      // Header emoji
      expect(screen.getByText('💡')).toBeInTheDocument();

      // Info box emojis
      expect(screen.getByText('👥')).toBeInTheDocument();
      expect(screen.getByText('🔄')).toBeInTheDocument();
      expect(screen.getByText('✨')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    test('should call onContinue when continue button is clicked', () => {
      render(<RevealEducationModal {...defaultProps} />);

      const continueButton = screen.getByText('Got it! Reveal My Top 8');
      fireEvent.click(continueButton);

      expect(mockOnContinue).toHaveBeenCalledTimes(1);
    });

    test('should call onCancel when cancel button is clicked', () => {
      render(<RevealEducationModal {...defaultProps} />);

      const cancelButton = screen.getByText('Maybe Later');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    test('should call onCancel when backdrop is clicked', () => {
      render(<RevealEducationModal {...defaultProps} />);

      // Find the backdrop by its class (backdrop has fixed positioning and dark bg)
      const backdrop = document.querySelector('.fixed.inset-0.bg-black.bg-opacity-50');
      expect(backdrop).toBeTruthy();
      
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
      }
    });

    test('should not call onCancel when modal content is clicked', () => {
      render(<RevealEducationModal {...defaultProps} />);

      // Click on modal content
      const modalContent = screen.getByText('About Revealing Your Top 8');
      fireEvent.click(modalContent);

      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });

  describe('Button styling', () => {
    test('should apply correct styling to buttons', () => {
      render(<RevealEducationModal {...defaultProps} />);

      const cancelButton = screen.getByText('Maybe Later');
      const continueButton = screen.getByText('Got it! Reveal My Top 8');

      expect(cancelButton).toHaveAttribute('data-variant', 'outline');
      expect(continueButton).toHaveClass('bg-indigo-600', 'hover:bg-indigo-700', 'text-white');
    });
  });

  describe('Content validation', () => {
    test('should include key educational points', () => {
      render(<RevealEducationModal {...defaultProps} />);

      // Key educational messages
      expect(screen.getByText(/other participants will be able to see the cards you've placed in your Most Important pile/)).toBeInTheDocument();
      expect(screen.getByText(/You can toggle this on and off anytime using the Reveal button/)).toBeInTheDocument();
      expect(screen.getByText(/Hide your selection whenever you want privacy/)).toBeInTheDocument();
      expect(screen.getByText(/Sharing your values helps facilitate meaningful conversations/)).toBeInTheDocument();
    });

    test('should emphasize privacy control', () => {
      render(<RevealEducationModal {...defaultProps} />);

      // Privacy and control messaging
      expect(screen.getByText('You\'re in control')).toBeInTheDocument();
      expect(screen.getByText(/Hide your selection whenever you want privacy/)).toBeInTheDocument();
    });

    test('should explain the collaborative benefit', () => {
      render(<RevealEducationModal {...defaultProps} />);

      // Collaboration messaging
      expect(screen.getByText('Great for discussion')).toBeInTheDocument();
      expect(screen.getByText(/facilitate meaningful conversations about leadership priorities/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have accessible button labels', () => {
      render(<RevealEducationModal {...defaultProps} />);

      const continueButton = screen.getByRole('button', { name: 'Got it! Reveal My Top 8' });
      const cancelButton = screen.getByRole('button', { name: 'Maybe Later' });

      expect(continueButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });

    test('should have appropriate heading structure', () => {
      render(<RevealEducationModal {...defaultProps} />);

      // Main heading
      expect(screen.getByRole('heading', { level: 2, name: 'About Revealing Your Top 8' })).toBeInTheDocument();

      // Section headings
      expect(screen.getByRole('heading', { level: 4, name: 'What others will see' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: 'You\'re in control' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 4, name: 'Great for discussion' })).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    test('should apply custom className when provided', () => {
      render(
        <RevealEducationModal
          {...defaultProps}
          className="custom-modal-class"
        />
      );

      // The modal container should have the custom class - find by the unique modal structure
      const modalContainer = document.querySelector('.custom-modal-class');
      expect(modalContainer).toBeTruthy();
      expect(modalContainer).toHaveClass('fixed', 'left-1/2', 'top-1/2', 'z-50', 'custom-modal-class');
    });
  });
});