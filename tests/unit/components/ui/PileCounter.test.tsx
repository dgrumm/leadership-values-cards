/**
 * Unit tests for PileCounter component
 */

import { render, screen } from '@testing-library/react';
import { PileCounter, CompactPileCounter, PileBadgeCounter } from '@/components/ui/PileCounter';
import { PileState } from '@/lib/constraints/types';

const mockPileState: PileState = {
  pile: 'top8',
  count: 5,
  isValid: true,
  isApproaching: false,
  isAtLimit: false,
  isOverLimit: false,
  visualState: 'default'
};

describe('PileCounter', () => {
  it('should render with default props', () => {
    render(<PileCounter pileState={mockPileState} />);
    
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should display custom text when provided', () => {
    render(<PileCounter pileState={mockPileState} displayText="5/8" />);
    
    expect(screen.getByText('5/8')).toBeInTheDocument();
  });

  it('should apply correct styling for visual states', () => {
    const errorState: PileState = {
      ...mockPileState,
      visualState: 'error',
      isOverLimit: true
    };

    render(<PileCounter pileState={errorState} />);
    
    const counter = screen.getByRole('status');
    expect(counter).toHaveClass('bg-red-100', 'text-red-700', 'border-red-300');
  });

  it('should show error indicator for over limit state', () => {
    const overLimitState: PileState = {
      ...mockPileState,
      visualState: 'error',
      isOverLimit: true
    };

    render(<PileCounter pileState={overLimitState} />);
    
    // Check for error indicator dot
    const indicator = screen.getByTitle('Pile limit exceeded');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-red-500');
  });

  it('should show warning indicator for approaching limit state', () => {
    const approachingState: PileState = {
      ...mockPileState,
      visualState: 'warning',
      isApproaching: true
    };

    render(<PileCounter pileState={approachingState} />);
    
    const indicator = screen.getByTitle('Approaching pile limit');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveClass('bg-orange-500');
  });

  it('should apply correct size classes', () => {
    render(<PileCounter pileState={mockPileState} size="sm" />);
    
    const counter = screen.getByRole('status');
    expect(counter).toHaveClass('text-xs', 'px-1.5', 'py-0.5');
  });

  it('should handle large size', () => {
    render(<PileCounter pileState={mockPileState} size="lg" />);
    
    const counter = screen.getByRole('status');
    expect(counter).toHaveClass('text-base', 'px-2.5', 'py-1.5');
  });

  it('should provide accessible status information', () => {
    const warningState: PileState = {
      ...mockPileState,
      visualState: 'warning',
      isApproaching: true
    };

    render(<PileCounter pileState={warningState} />);
    
    const counter = screen.getByRole('status');
    expect(counter).toHaveAttribute('aria-label', 
      expect.stringContaining('Approaching limit')
    );
  });

  it('should disable animation when requested', () => {
    const atLimitState: PileState = {
      ...mockPileState,
      isAtLimit: true
    };

    render(<PileCounter pileState={atLimitState} showAnimation={false} />);
    
    // Component should still render but without bounce animation
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should display valid state styling correctly', () => {
    const validState: PileState = {
      ...mockPileState,
      visualState: 'valid',
      isAtLimit: true
    };

    render(<PileCounter pileState={validState} />);
    
    const counter = screen.getByRole('status');
    expect(counter).toHaveClass('bg-green-100', 'text-green-700', 'border-green-300');
  });
});

describe('CompactPileCounter', () => {
  it('should render in compact mode', () => {
    render(<CompactPileCounter pileState={mockPileState} />);
    
    const counter = screen.getByRole('status');
    expect(counter).toHaveClass('absolute', 'top-2', 'right-2');
    expect(counter).toHaveClass('text-xs'); // Small size
  });

  it('should apply custom className', () => {
    render(<CompactPileCounter pileState={mockPileState} className="custom-class" />);
    
    const counter = screen.getByRole('status');
    expect(counter).toHaveClass('custom-class');
  });

  it('should not animate in compact mode', () => {
    const atLimitState: PileState = {
      ...mockPileState,
      isAtLimit: true
    };

    render(<CompactPileCounter pileState={atLimitState} />);
    
    // Should render but without animation
    expect(screen.getByText('5')).toBeInTheDocument();
  });
});

describe('PileBadgeCounter', () => {
  it('should render with label', () => {
    render(<PileBadgeCounter pileState={mockPileState} label="Cards" />);
    
    expect(screen.getByText('Cards')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render without label', () => {
    render(<PileBadgeCounter pileState={mockPileState} />);
    
    expect(screen.queryByText('Cards')).not.toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should apply custom className to container', () => {
    render(<PileBadgeCounter pileState={mockPileState} className="badge-custom" />);
    
    const container = screen.getByText('5').closest('div')?.parentElement;
    expect(container).toHaveClass('badge-custom');
  });

  it('should use medium size for badge counter', () => {
    render(<PileBadgeCounter pileState={mockPileState} />);
    
    const counter = screen.getByRole('status');
    expect(counter).toHaveClass('text-sm'); // Medium size
  });
});

describe('PileCounter accessibility', () => {
  it('should provide descriptive aria labels for different states', () => {
    const testStates = [
      {
        state: { ...mockPileState, isOverLimit: true, visualState: 'error' as const },
        expectedLabel: 'Over limit'
      },
      {
        state: { ...mockPileState, isAtLimit: true, visualState: 'valid' as const },
        expectedLabel: 'At limit'
      },
      {
        state: { ...mockPileState, isApproaching: true, visualState: 'warning' as const },
        expectedLabel: 'Approaching limit'
      },
      {
        state: { ...mockPileState, visualState: 'default' as const },
        expectedLabel: 'Within limits'
      }
    ];

    testStates.forEach(({ state, expectedLabel }) => {
      const { unmount } = render(<PileCounter pileState={state} />);
      
      const counter = screen.getByRole('status');
      expect(counter).toHaveAttribute('aria-label', 
        expect.stringContaining(expectedLabel)
      );
      
      unmount();
    });
  });

  it('should include pile count in aria label', () => {
    const stateWith7Cards: PileState = {
      ...mockPileState,
      count: 7
    };

    render(<PileCounter pileState={stateWith7Cards} />);
    
    const counter = screen.getByRole('status');
    expect(counter).toHaveAttribute('aria-label', 
      expect.stringContaining('Pile has 7 cards')
    );
  });

  it('should handle singular vs plural card labels', () => {
    const stateWithOneCard: PileState = {
      ...mockPileState,
      count: 1
    };

    render(<PileCounter pileState={stateWithOneCard} />);
    
    const counter = screen.getByRole('status');
    expect(counter).toHaveAttribute('aria-label', 
      expect.stringContaining('Pile has 1 cards')
    );
  });
});