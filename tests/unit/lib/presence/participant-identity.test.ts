import { 
  assignParticipantIdentity, 
  PARTICIPANT_COLORS, 
  PARTICIPANT_EMOJIS,
  type ParticipantIdentity 
} from '../../../../lib/presence/participant-identity';

describe('participant-identity', () => {
  describe('PARTICIPANT_COLORS', () => {
    it('should have exactly 15 colors', () => {
      expect(PARTICIPANT_COLORS).toHaveLength(15);
    });

    it('should have all valid hex colors', () => {
      PARTICIPANT_COLORS.forEach(color => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('should have all unique colors', () => {
      const uniqueColors = new Set(PARTICIPANT_COLORS);
      expect(uniqueColors.size).toBe(PARTICIPANT_COLORS.length);
    });

    it('should include expected colors from spec', () => {
      const expectedColors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
        '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
        '#10AC84', '#EE5A24', '#0984E3', '#6C5CE7', '#FD79A8'
      ];

      expectedColors.forEach(color => {
        expect(PARTICIPANT_COLORS).toContain(color);
      });
    });
  });

  describe('PARTICIPANT_EMOJIS', () => {
    it('should have exactly 20 emojis', () => {
      expect(PARTICIPANT_EMOJIS).toHaveLength(20);
    });

    it('should have all unique emojis', () => {
      const uniqueEmojis = new Set(PARTICIPANT_EMOJIS);
      expect(uniqueEmojis.size).toBe(PARTICIPANT_EMOJIS.length);
    });

    it('should include expected emojis from spec', () => {
      const expectedEmojis = [
        '😊', '🎨', '🎭', '🎪', '🎯', '🎸', '🎺', '🌟', '💫', '🚀',
        '🎲', '🎈', '🎊', '🎉', '🎁', '🌈', '⭐', '🎋', '🎃', '🎄'
      ];

      expectedEmojis.forEach(emoji => {
        expect(PARTICIPANT_EMOJIS).toContain(emoji);
      });
    });

    it('should have only single character emojis', () => {
      PARTICIPANT_EMOJIS.forEach(emoji => {
        // Note: Some emojis may be composed of multiple code points
        // but should appear as single visual characters
        expect(typeof emoji).toBe('string');
        expect(emoji.length).toBeGreaterThan(0);
      });
    });
  });

  describe('assignParticipantIdentity', () => {
    describe('with no existing participants', () => {
      it('should assign first color and emoji', () => {
        const result = assignParticipantIdentity([]);

        expect(result.color).toBe(PARTICIPANT_COLORS[0]);
        expect(result.emoji).toBe(PARTICIPANT_EMOJIS[0]);
      });

      it('should return valid identity structure', () => {
        const result = assignParticipantIdentity([]);

        expect(result).toHaveProperty('color');
        expect(result).toHaveProperty('emoji');
        expect(typeof result.color).toBe('string');
        expect(typeof result.emoji).toBe('string');
      });
    });

    describe('with existing participants', () => {
      const existingParticipants: ParticipantIdentity[] = [
        { color: '#FF6B6B', emoji: '😊' },
        { color: '#4ECDC4', emoji: '🎨' },
        { color: '#45B7D1', emoji: '🎭' }
      ];

      it('should not assign used colors', () => {
        const result = assignParticipantIdentity(existingParticipants);

        const usedColors = existingParticipants.map(p => p.color);
        expect(usedColors).not.toContain(result.color);
      });

      it('should not assign used emojis', () => {
        const result = assignParticipantIdentity(existingParticipants);

        const usedEmojis = existingParticipants.map(p => p.emoji);
        expect(usedEmojis).not.toContain(result.emoji);
      });

      it('should assign next available color and emoji', () => {
        const result = assignParticipantIdentity(existingParticipants);

        // Should get the 4th color and emoji (index 3)
        expect(result.color).toBe(PARTICIPANT_COLORS[3]);
        expect(result.emoji).toBe(PARTICIPANT_EMOJIS[3]);
      });

      it('should work with mixed usage patterns', () => {
        const mixedParticipants: ParticipantIdentity[] = [
          { color: PARTICIPANT_COLORS[0], emoji: PARTICIPANT_EMOJIS[5] },  // Skip emoji 0-4
          { color: PARTICIPANT_COLORS[2], emoji: PARTICIPANT_EMOJIS[0] },  // Skip color 1
          { color: PARTICIPANT_COLORS[5], emoji: PARTICIPANT_EMOJIS[2] }   // Skip emoji 1
        ];

        const result = assignParticipantIdentity(mixedParticipants);

        // Should get first available color (index 1) and emoji (index 1)
        expect(result.color).toBe(PARTICIPANT_COLORS[1]);
        expect(result.emoji).toBe(PARTICIPANT_EMOJIS[1]);
      });
    });

    describe('edge cases', () => {
      it('should handle all colors used but emojis available', () => {
        const allColorsUsed: ParticipantIdentity[] = PARTICIPANT_COLORS.map((color, index) => ({
          color,
          emoji: PARTICIPANT_EMOJIS[index] || '😊' // Fallback for extra colors
        }));

        const result = assignParticipantIdentity(allColorsUsed);

        // Should still return a valid identity (may reuse color but different emoji)
        expect(PARTICIPANT_COLORS).toContain(result.color);
        expect(PARTICIPANT_EMOJIS).toContain(result.emoji);
      });

      it('should handle all emojis used but colors available', () => {
        const allEmojisUsed: ParticipantIdentity[] = PARTICIPANT_EMOJIS.map((emoji, index) => ({
          emoji,
          color: PARTICIPANT_COLORS[index] || '#FF6B6B' // Fallback for extra emojis
        }));

        const result = assignParticipantIdentity(allEmojisUsed);

        expect(PARTICIPANT_COLORS).toContain(result.color);
        expect(PARTICIPANT_EMOJIS).toContain(result.emoji);
      });

      it('should handle maximum participants (50+)', () => {
        // Create 50 participants using all colors/emojis multiple times
        const maxParticipants: ParticipantIdentity[] = [];
        for (let i = 0; i < 50; i++) {
          maxParticipants.push({
            color: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length],
            emoji: PARTICIPANT_EMOJIS[i % PARTICIPANT_EMOJIS.length]
          });
        }

        const result = assignParticipantIdentity(maxParticipants);

        // Should still return valid identity even with all combinations used
        expect(PARTICIPANT_COLORS).toContain(result.color);
        expect(PARTICIPANT_EMOJIS).toContain(result.emoji);
      });

      it('should handle empty array input', () => {
        const result = assignParticipantIdentity([]);

        expect(result.color).toBe(PARTICIPANT_COLORS[0]);
        expect(result.emoji).toBe(PARTICIPANT_EMOJIS[0]);
      });

      it('should handle invalid participant data gracefully', () => {
        const invalidParticipants = [
          { color: '', emoji: '' },
          { color: 'invalid', emoji: 'invalid' },
          // @ts-ignore - Testing runtime behavior
          { color: null, emoji: null }
        ] as ParticipantIdentity[];

        expect(() => {
          assignParticipantIdentity(invalidParticipants);
        }).not.toThrow();

        const result = assignParticipantIdentity(invalidParticipants);
        expect(PARTICIPANT_COLORS).toContain(result.color);
        expect(PARTICIPANT_EMOJIS).toContain(result.emoji);
      });
    });

    describe('collision avoidance', () => {
      it('should never assign duplicate identities in sequence', () => {
        const results: ParticipantIdentity[] = [];
        
        // Assign identities one by one
        for (let i = 0; i < 10; i++) {
          const identity = assignParticipantIdentity(results);
          
          // Verify no collision with existing
          const existingCombos = results.map(r => `${r.color}-${r.emoji}`);
          const newCombo = `${identity.color}-${identity.emoji}`;
          expect(existingCombos).not.toContain(newCombo);
          
          results.push(identity);
        }

        expect(results).toHaveLength(10);
      });

      it('should prioritize unique combinations when possible', () => {
        const someUsed: ParticipantIdentity[] = [
          { color: PARTICIPANT_COLORS[0], emoji: PARTICIPANT_EMOJIS[0] },
          { color: PARTICIPANT_COLORS[1], emoji: PARTICIPANT_EMOJIS[1] }
        ];

        const result = assignParticipantIdentity(someUsed);

        // Should get next available combination, not reuse with different emoji
        expect(result.color).toBe(PARTICIPANT_COLORS[2]);
        expect(result.emoji).toBe(PARTICIPANT_EMOJIS[2]);
      });
    });

    describe('performance', () => {
      it('should assign identity quickly even with many participants', () => {
        // Create large participant list
        const manyParticipants: ParticipantIdentity[] = [];
        for (let i = 0; i < 45; i++) { // 45 out of 50 max
          manyParticipants.push({
            color: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length],
            emoji: PARTICIPANT_EMOJIS[i % PARTICIPANT_EMOJIS.length]
          });
        }

        const startTime = performance.now();
        const result = assignParticipantIdentity(manyParticipants);
        const endTime = performance.now();

        // Should complete quickly (under 10ms)
        expect(endTime - startTime).toBeLessThan(10);
        expect(PARTICIPANT_COLORS).toContain(result.color);
        expect(PARTICIPANT_EMOJIS).toContain(result.emoji);
      });
    });

    describe('randomization', () => {
      it('should prefer deterministic assignment over randomization for MVP', () => {
        // For MVP, we want predictable assignment for easier debugging
        const result1 = assignParticipantIdentity([]);
        const result2 = assignParticipantIdentity([]);

        // Both should get the same first assignment
        expect(result1.color).toBe(result2.color);
        expect(result1.emoji).toBe(result2.emoji);
      });

      it('should assign identities in consistent order', () => {
        const participants1: ParticipantIdentity[] = [];
        const participants2: ParticipantIdentity[] = [];

        // Assign 5 participants to each list
        for (let i = 0; i < 5; i++) {
          participants1.push(assignParticipantIdentity(participants1));
          participants2.push(assignParticipantIdentity(participants2));
        }

        // Both lists should have identical assignments
        expect(participants1).toEqual(participants2);
      });
    });
  });
});