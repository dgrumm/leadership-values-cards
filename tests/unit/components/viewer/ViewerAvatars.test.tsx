import { render, screen } from '@testing-library/react';
import { ViewerAvatars } from '@/components/viewer/ViewerAvatars';
import type { ViewerData } from '@/types/viewer';

describe('ViewerAvatars', () => {
  const createMockViewer = (
    id: string, 
    name: string, 
    emoji: string, 
    color: string, 
    isActive = true
  ): ViewerData => ({
    participantId: id,
    name,
    emoji,
    color,
    joinedAt: Date.now(),
    isActive
  });

  describe('empty state', () => {
    it('should render nothing when no viewers', () => {
      const { container } = render(<ViewerAvatars viewers={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('single viewer', () => {
    it('should render single viewer avatar', () => {
      const viewers = [createMockViewer('viewer1', 'John Doe', '👨', '#4A90E2')];
      
      render(<ViewerAvatars viewers={viewers} />);

      expect(screen.getByText('👨')).toBeInTheDocument();
      expect(screen.getByText('1 viewer')).toBeInTheDocument();
      expect(screen.getByTitle('John Doe is viewing')).toBeInTheDocument();
    });

    it('should show active indicator for active viewer', () => {
      const viewers = [createMockViewer('viewer1', 'Active User', '👤', '#4A90E2', true)];
      
      render(<ViewerAvatars viewers={viewers} />);

      expect(screen.getByLabelText('Active viewer')).toBeInTheDocument();
    });

    it('should not show active indicator for inactive viewer', () => {
      const viewers = [createMockViewer('viewer1', 'Inactive User', '👤', '#4A90E2', false)];
      
      render(<ViewerAvatars viewers={viewers} />);

      expect(screen.queryByLabelText('Active viewer')).not.toBeInTheDocument();
    });
  });

  describe('multiple viewers', () => {
    it('should render multiple viewer avatars', () => {
      const viewers = [
        createMockViewer('viewer1', 'John Doe', '👨', '#4A90E2'),
        createMockViewer('viewer2', 'Jane Smith', '👩', '#E24A4A'),
        createMockViewer('viewer3', 'Bob Wilson', '🧑', '#4AE24A')
      ];
      
      render(<ViewerAvatars viewers={viewers} />);

      expect(screen.getByText('👨')).toBeInTheDocument();
      expect(screen.getByText('👩')).toBeInTheDocument();
      expect(screen.getByText('🧑')).toBeInTheDocument();
      expect(screen.getByText('3 viewers')).toBeInTheDocument(); // Plural
    });

    it('should limit visible avatars to 5', () => {
      const viewers = Array.from({ length: 6 }, (_, i) => 
        createMockViewer(`viewer${i}`, `User ${i}`, '👤', '#4A90E2')
      );
      
      render(<ViewerAvatars viewers={viewers} />);

      // Should only show 5 avatar emojis
      const avatars = screen.getAllByText('👤');
      expect(avatars).toHaveLength(5);

      // Should show overflow indicator
      expect(screen.getByText('+1')).toBeInTheDocument();
      expect(screen.getByTitle('+1 other viewing')).toBeInTheDocument();
    });

    it('should handle large overflow correctly', () => {
      const viewers = Array.from({ length: 15 }, (_, i) => 
        createMockViewer(`viewer${i}`, `User ${i}`, '👤', '#4A90E2')
      );
      
      render(<ViewerAvatars viewers={viewers} />);

      expect(screen.getByText('+10')).toBeInTheDocument();
      expect(screen.getByTitle('+10 others viewing')).toBeInTheDocument(); // Plural
      expect(screen.getByText('15 viewers')).toBeInTheDocument();
    });
  });

  describe('avatar styling', () => {
    it('should apply correct colors and styles', () => {
      const viewers = [createMockViewer('viewer1', 'John Doe', '👨', '#FF5733')];
      
      render(<ViewerAvatars viewers={viewers} />);

      const avatar = screen.getByText('👨').closest('div');
      expect(avatar).toHaveStyle({
        backgroundColor: '#FF573320',
        color: '#FF5733'
      });
    });

    it('should apply active styling for active viewers', () => {
      const viewers = [createMockViewer('viewer1', 'Active User', '👤', '#4A90E2', true)];
      
      render(<ViewerAvatars viewers={viewers} />);

      const avatar = screen.getByText('👤').closest('div');
      expect(avatar).toHaveClass('ring-2', 'ring-green-400');
    });

    it('should not apply active styling for inactive viewers', () => {
      const viewers = [createMockViewer('viewer1', 'Inactive User', '👤', '#4A90E2', false)];
      
      render(<ViewerAvatars viewers={viewers} />);

      const avatar = screen.getByText('👤').closest('div');
      expect(avatar).not.toHaveClass('ring-2', 'ring-green-400');
    });

    it('should apply correct z-index stacking', () => {
      const viewers = [
        createMockViewer('viewer1', 'First', '1️⃣', '#FF0000'),
        createMockViewer('viewer2', 'Second', '2️⃣', '#00FF00'),
        createMockViewer('viewer3', 'Third', '3️⃣', '#0000FF')
      ];
      
      render(<ViewerAvatars viewers={viewers} />);

      const firstAvatar = screen.getByText('1️⃣').closest('div');
      const secondAvatar = screen.getByText('2️⃣').closest('div');
      const thirdAvatar = screen.getByText('3️⃣').closest('div');

      expect(firstAvatar).toHaveStyle({ zIndex: '50' }); // 50 - 0
      expect(secondAvatar).toHaveStyle({ zIndex: '49' }); // 50 - 1
      expect(thirdAvatar).toHaveStyle({ zIndex: '48' }); // 50 - 2
    });
  });

  describe('accessibility', () => {
    it('should provide meaningful tooltips', () => {
      const viewers = [
        createMockViewer('viewer1', 'John Doe', '👨', '#4A90E2'),
        createMockViewer('viewer2', 'Jane Smith', '👩', '#E24A4A')
      ];
      
      render(<ViewerAvatars viewers={viewers} />);

      expect(screen.getByTitle('John Doe is viewing')).toBeInTheDocument();
      expect(screen.getByTitle('Jane Smith is viewing')).toBeInTheDocument();
    });

    it('should provide accessible labels for indicators', () => {
      const viewers = [createMockViewer('viewer1', 'Active User', '👤', '#4A90E2', true)];
      
      render(<ViewerAvatars viewers={viewers} />);

      expect(screen.getByLabelText('Active viewer')).toBeInTheDocument();
    });

    it('should provide meaningful overflow tooltip', () => {
      const viewers = Array.from({ length: 7 }, (_, i) => 
        createMockViewer(`viewer${i}`, `User ${i}`, '👤', '#4A90E2')
      );
      
      render(<ViewerAvatars viewers={viewers} />);

      expect(screen.getByTitle('+2 others viewing')).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const viewers = [createMockViewer('viewer1', 'Test User', '👤', '#4A90E2')];
      
      const { container } = render(
        <ViewerAvatars viewers={viewers} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('edge cases', () => {
    it('should handle exactly 5 viewers without overflow', () => {
      const viewers = Array.from({ length: 5 }, (_, i) => 
        createMockViewer(`viewer${i}`, `User ${i}`, '👤', '#4A90E2')
      );
      
      render(<ViewerAvatars viewers={viewers} />);

      const avatars = screen.getAllByText('👤');
      expect(avatars).toHaveLength(5);
      expect(screen.queryByText('+0')).not.toBeInTheDocument();
    });

    it('should handle mixed active/inactive viewers', () => {
      const viewers = [
        createMockViewer('viewer1', 'Active', '👨', '#4A90E2', true),
        createMockViewer('viewer2', 'Inactive', '👩', '#E24A4A', false),
        createMockViewer('viewer3', 'Active', '🧑', '#4AE24A', true)
      ];
      
      render(<ViewerAvatars viewers={viewers} />);

      const activeIndicators = screen.getAllByLabelText('Active viewer');
      expect(activeIndicators).toHaveLength(2); // Only 2 active viewers
    });
  });
});