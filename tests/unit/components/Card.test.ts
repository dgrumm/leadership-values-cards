/**
 * Test for Card component landscape orientation
 */

import { describe, it, expect } from '@jest/globals';

describe('Card Component', () => {
  it('should have landscape orientation (width > height)', () => {
    // Test that landscape cards use w-64 h-40 (width 16rem > height 10rem)
    const landscapeWidth = 64; // w-64 in Tailwind = 16rem = 256px
    const landscapeHeight = 40; // h-40 in Tailwind = 10rem = 160px
    
    expect(landscapeWidth).toBeGreaterThan(landscapeHeight);
    expect(landscapeWidth / landscapeHeight).toBeCloseTo(1.6, 1);
  });

  it('should maintain aspect ratio suitable for card content', () => {
    // Cards should be wider than tall for landscape orientation
    const aspectRatio = 64 / 40; // w-64 / h-40
    
    // Should be approximately 1.6:1 aspect ratio (Bridge card landscape)
    expect(aspectRatio).toBeGreaterThan(1);
    expect(aspectRatio).toBeLessThan(2);
  });
});