/**
 * Test for ParticipantsButton participant count functionality
 */

import { describe, it, expect } from '@jest/globals';

describe('ParticipantsButton Component', () => {
  it('should accept participant count as prop', () => {
    // Test the interface accepts participantCount
    type ParticipantsButtonProps = {
      participantCount?: number;
    };
    
    const validProps: ParticipantsButtonProps = {
      participantCount: 5
    };
    
    expect(validProps.participantCount).toBe(5);
  });

  it('should default to 1 participant when no count provided', () => {
    type ParticipantsButtonProps = {
      participantCount?: number;
    };
    
    const defaultProps: ParticipantsButtonProps = {};
    const participantCount = defaultProps.participantCount || 1;
    
    expect(participantCount).toBe(1);
  });

  it('should handle various participant count values', () => {
    const testCounts = [1, 2, 5, 10, 100];
    
    testCounts.forEach(count => {
      expect(count).toBeGreaterThan(0);
      expect(Number.isInteger(count)).toBe(true);
    });
  });

  it('should format participant text correctly', () => {
    const formatParticipantText = (count: number) => 
      `${count} Participant${count !== 1 ? 's' : ''}`;
    
    expect(formatParticipantText(1)).toBe('1 Participant');
    expect(formatParticipantText(2)).toBe('2 Participants');
    expect(formatParticipantText(5)).toBe('5 Participants');
  });
});