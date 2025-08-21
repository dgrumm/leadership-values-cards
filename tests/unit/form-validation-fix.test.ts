import { validateName, validateSessionCode } from '@/lib/utils/validation';

describe('Form Validation Fix - Core Logic', () => {
  it('should validate correctly for successful form submission', () => {
    const name = 'John Doe';
    const sessionCode = 'ABC123';

    // Simulate the validateAll logic from useFormValidation
    const nameValidation = validateName(name);
    const sessionCodeValidation = validateSessionCode(sessionCode);
    
    const validation = {
      name: nameValidation,
      sessionCode: sessionCodeValidation,
      isFormValid: nameValidation.isValid && sessionCodeValidation.isValid
    };

    // Should be valid
    expect(validation.isFormValid).toBe(true);
    expect(validation.name.isValid).toBe(true);
    expect(validation.sessionCode.isValid).toBe(true);
    expect(validation.name.error).toBeUndefined();
    expect(validation.sessionCode.error).toBeUndefined();

    // Since validation passed, hasInteracted should remain false
    const shouldMarkAsInteracted = !validation.isFormValid;
    expect(shouldMarkAsInteracted).toBe(false);
  });

  it('should validate correctly for failed form submission', () => {
    const name = '';
    const sessionCode = 'ABC';

    // Simulate the validateAll logic from useFormValidation
    const nameValidation = validateName(name);
    const sessionCodeValidation = validateSessionCode(sessionCode);
    
    const validation = {
      name: nameValidation,
      sessionCode: sessionCodeValidation,
      isFormValid: nameValidation.isValid && sessionCodeValidation.isValid
    };

    // Should be invalid
    expect(validation.isFormValid).toBe(false);
    expect(validation.name.isValid).toBe(false);
    expect(validation.sessionCode.isValid).toBe(false);
    expect(validation.name.error).toBe('Please enter your name');
    expect(validation.sessionCode.error).toBe('Session code must be exactly 6 characters');

    // Since validation failed, hasInteracted should be set to true
    const shouldMarkAsInteracted = !validation.isFormValid;
    expect(shouldMarkAsInteracted).toBe(true);
  });

  it('should handle edge cases correctly', () => {
    // Valid name, invalid code
    let nameValidation = validateName('John');
    let codeValidation = validateSessionCode('AB');
    let isValid = nameValidation.isValid && codeValidation.isValid;
    
    expect(isValid).toBe(false);
    expect(nameValidation.error).toBeUndefined();
    expect(codeValidation.error).toBe('Session code must be exactly 6 characters');

    // Invalid name, valid code  
    nameValidation = validateName('');
    codeValidation = validateSessionCode('ABC123');
    isValid = nameValidation.isValid && codeValidation.isValid;
    
    expect(isValid).toBe(false);
    expect(nameValidation.error).toBe('Please enter your name');
    expect(codeValidation.error).toBeUndefined();
  });
});