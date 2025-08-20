import { validateName, validateSessionCode, formatSessionCode, formatName } from '@/lib/utils/validation';

describe('validateName', () => {
  it('validates correct names', () => {
    expect(validateName('John')).toEqual({ isValid: true });
    expect(validateName('John Doe')).toEqual({ isValid: true });
    expect(validateName('Mary-Jane')).toEqual({ isValid: true });
    expect(validateName('O\'Connor')).toEqual({ isValid: true });
    expect(validateName('Dr. Smith')).toEqual({ isValid: true });
  });

  it('trims whitespace', () => {
    expect(validateName('  John  ')).toEqual({ isValid: true });
  });

  it('rejects empty names', () => {
    expect(validateName('')).toEqual({
      isValid: false,
      error: 'Please enter your name'
    });
    expect(validateName('   ')).toEqual({
      isValid: false,
      error: 'Please enter your name'
    });
  });

  it('rejects names that are too long', () => {
    const longName = 'a'.repeat(51);
    expect(validateName(longName)).toEqual({
      isValid: false,
      error: 'Name must be 50 characters or less'
    });
  });

  it('rejects invalid characters', () => {
    expect(validateName('John@Doe')).toEqual({
      isValid: false,
      error: 'Name can only contain letters, numbers, spaces, and hyphens'
    });
  });
});

describe('validateSessionCode', () => {
  it('validates correct session codes', () => {
    expect(validateSessionCode('ABC123')).toEqual({ isValid: true });
    expect(validateSessionCode('XYZ999')).toEqual({ isValid: true });
    expect(validateSessionCode('123456')).toEqual({ isValid: true });
    expect(validateSessionCode('ABCDEF')).toEqual({ isValid: true });
  });

  it('auto-uppercases codes', () => {
    expect(validateSessionCode('abc123')).toEqual({ isValid: true });
  });

  it('rejects empty codes', () => {
    expect(validateSessionCode('')).toEqual({
      isValid: false,
      error: 'Please enter a session code'
    });
  });

  it('rejects wrong length codes', () => {
    expect(validateSessionCode('ABC12')).toEqual({
      isValid: false,
      error: 'Session code must be exactly 6 characters'
    });
    expect(validateSessionCode('ABC1234')).toEqual({
      isValid: false,
      error: 'Session code must be exactly 6 characters'
    });
  });

  it('rejects invalid characters', () => {
    expect(validateSessionCode('ABC12@')).toEqual({
      isValid: false,
      error: 'Session code must contain only letters and numbers'
    });
    expect(validateSessionCode('ABC-12')).toEqual({
      isValid: false,
      error: 'Session code must contain only letters and numbers'
    });
  });
});

describe('formatSessionCode', () => {
  it('formats codes correctly', () => {
    expect(formatSessionCode('abc123')).toBe('ABC123');
    expect(formatSessionCode('abc-123')).toBe('ABC123');
    expect(formatSessionCode('abc123extra')).toBe('ABC123');
    expect(formatSessionCode('ab@c12#3')).toBe('ABC123');
  });
});

describe('formatName', () => {
  it('formats names correctly', () => {
    expect(formatName('John Doe')).toBe('John Doe');
    expect(formatName('John@Doe')).toBe('JohnDoe');
    expect(formatName('John-Mary O\'Connor')).toBe('John-Mary O\'Connor');
    expect(formatName('a'.repeat(60))).toBe('a'.repeat(50));
  });
});