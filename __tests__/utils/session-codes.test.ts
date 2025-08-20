import { generateSessionCode, isValidSessionCodeFormat } from '@/lib/utils/session-codes';

// Mock fetch for testing
global.fetch = jest.fn();

describe('generateSessionCode', () => {
  it('generates 6-character codes', () => {
    const code = generateSessionCode();
    expect(code).toHaveLength(6);
  });

  it('uses only valid characters', () => {
    const code = generateSessionCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('generates different codes', () => {
    const codes = Array.from({ length: 10 }, () => generateSessionCode());
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBeGreaterThan(1);
  });
});

describe('isValidSessionCodeFormat', () => {
  it('validates correct formats', () => {
    expect(isValidSessionCodeFormat('ABC123')).toBe(true);
    expect(isValidSessionCodeFormat('XYZ999')).toBe(true);
    expect(isValidSessionCodeFormat('123456')).toBe(true);
    expect(isValidSessionCodeFormat('ABCDEF')).toBe(true);
  });

  it('rejects incorrect formats', () => {
    expect(isValidSessionCodeFormat('abc123')).toBe(false); // lowercase
    expect(isValidSessionCodeFormat('ABC12')).toBe(false); // too short
    expect(isValidSessionCodeFormat('ABC1234')).toBe(false); // too long
    expect(isValidSessionCodeFormat('ABC-12')).toBe(false); // invalid character
    expect(isValidSessionCodeFormat('')).toBe(false); // empty
  });
});