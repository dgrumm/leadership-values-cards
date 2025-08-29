/**
 * Unit tests for participant constants (simplified - random assignment)
 */

import {
  PARTICIPANT_EMOJIS,
  PARTICIPANT_COLORS
} from '@/lib/constants/participants';

describe('Participant Constants', () => {
  describe('PARTICIPANT_EMOJIS', () => {
    it('should contain a reasonable number of emojis', () => {
      expect(PARTICIPANT_EMOJIS.length).toBeGreaterThan(30);
      expect(PARTICIPANT_EMOJIS.length).toBeLessThan(100);
    });

    it('should contain only unique emojis', () => {
      const uniqueEmojis = new Set(PARTICIPANT_EMOJIS);
      expect(uniqueEmojis.size).toBe(PARTICIPANT_EMOJIS.length);
    });

    it('should contain valid emoji characters', () => {
      PARTICIPANT_EMOJIS.forEach(emoji => {
        expect(emoji).toMatch(/^[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}]+$/u);
        expect(emoji.length).toBeGreaterThan(0);
        expect(emoji.length).toBeLessThan(10); // Reasonable emoji length limit
      });
    });
  });

  describe('PARTICIPANT_COLORS', () => {
    it('should contain a reasonable number of colors', () => {
      expect(PARTICIPANT_COLORS.length).toBeGreaterThan(30);
      expect(PARTICIPANT_COLORS.length).toBeLessThan(100);
    });

    it('should contain only unique colors', () => {
      const uniqueColors = new Set(PARTICIPANT_COLORS);
      expect(uniqueColors.size).toBe(PARTICIPANT_COLORS.length);
    });

    it('should contain valid hex color codes', () => {
      PARTICIPANT_COLORS.forEach(color => {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('should have sufficient contrast between colors', () => {
      // Simple test: ensure colors are not too similar (basic luminance check)
      const getLuminance = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        // Simple luminance calculation
        return (0.299 * r + 0.587 * g + 0.114 * b);
      };

      const luminances = PARTICIPANT_COLORS.map(getLuminance);
      const uniqueLuminances = new Set(luminances.map(l => Math.round(l / 10) * 10));
      
      // Should have reasonable variation in luminance (not all dark or all light)
      expect(uniqueLuminances.size).toBeGreaterThanOrEqual(PARTICIPANT_COLORS.length * 0.3);
    });
  });

  describe('Random Assignment Support', () => {
    it('should have enough emojis and colors for random selection', () => {
      // With random assignment, we just need reasonable variety
      expect(PARTICIPANT_EMOJIS.length).toBeGreaterThanOrEqual(40);
      expect(PARTICIPANT_COLORS.length).toBeGreaterThanOrEqual(40);
    });

    it('should enable Math.random() selection from arrays', () => {
      // Test that random selection works
      const randomEmojiIndex = Math.floor(Math.random() * PARTICIPANT_EMOJIS.length);
      const randomColorIndex = Math.floor(Math.random() * PARTICIPANT_COLORS.length);
      
      const selectedEmoji = PARTICIPANT_EMOJIS[randomEmojiIndex];
      const selectedColor = PARTICIPANT_COLORS[randomColorIndex];
      
      expect(typeof selectedEmoji).toBe('string');
      expect(typeof selectedColor).toBe('string');
      expect(selectedEmoji.length).toBeGreaterThan(0);
      expect(selectedColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});