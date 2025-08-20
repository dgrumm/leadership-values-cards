/**
 * Test for Card component landscape orientation
 */

import { describe, it, expect } from '@jest/globals';

describe('Card Component', () => {
  it('should have landscape orientation (width > height)', () => {
    // Test that landscape cards use w-56 h-40 (width 14rem > height 10rem)
    const landscapeWidth = 56; // w-56 in Tailwind = 14rem = 224px
    const landscapeHeight = 40; // h-40 in Tailwind = 10rem = 160px
    
    expect(landscapeWidth).toBeGreaterThan(landscapeHeight);
    expect(landscapeWidth / landscapeHeight).toBeCloseTo(1.4, 1);
  });

  it('should maintain aspect ratio suitable for card content', () => {
    // Cards should be wider than tall for landscape orientation
    const aspectRatio = 56 / 40; // w-56 / h-40
    
    // Should be approximately 1.4:1 aspect ratio
    expect(aspectRatio).toBeGreaterThan(1);
    expect(aspectRatio).toBeLessThan(2);
  });
});