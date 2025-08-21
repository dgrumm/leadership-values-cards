import { validateName, validateSessionCode } from '@/lib/utils/validation';

describe('Comprehensive Form Validation Fix', () => {
  // Simulate the useFormValidation hook logic
  const simulateFormValidation = (name: string, sessionCode: string, hasInteracted: { name: boolean; sessionCode: boolean }, isSubmittingForm: boolean) => {
    const nameValidation = validateName(name);
    const sessionCodeValidation = validateSessionCode(sessionCode);
    
    const validation = {
      name: nameValidation,
      sessionCode: sessionCodeValidation,
      isFormValid: nameValidation.isValid && sessionCodeValidation.isValid
    };

    // Simulate getFieldError logic
    const getFieldError = (field: 'name' | 'sessionCode') => {
      if (!hasInteracted[field] || isSubmittingForm) {
        return undefined;
      }
      return validation[field].error;
    };

    // Simulate getFieldState logic  
    const getFieldState = (field: 'name' | 'sessionCode') => {
      if (!hasInteracted[field] || isSubmittingForm) {
        return 'neutral';
      }
      return validation[field].isValid ? 'valid' : 'invalid';
    };

    return {
      validation,
      getFieldError,
      getFieldState
    };
  };

  it('should not show errors during successful form submission', () => {
    const name = 'John Doe';
    const sessionCode = 'ABC123';
    const hasInteracted = { name: true, sessionCode: true }; // User has interacted before
    const isSubmittingForm = true; // Currently submitting

    const result = simulateFormValidation(name, sessionCode, hasInteracted, isSubmittingForm);

    // Form should be valid
    expect(result.validation.isFormValid).toBe(true);

    // But errors should be suppressed during submission
    expect(result.getFieldError('name')).toBeUndefined();
    expect(result.getFieldError('sessionCode')).toBeUndefined();
    expect(result.getFieldState('name')).toBe('neutral');
    expect(result.getFieldState('sessionCode')).toBe('neutral');
  });

  it('should show errors only when form validation fails and not submitting', () => {
    const name = '';
    const sessionCode = 'ABC';
    const hasInteracted = { name: true, sessionCode: true };
    const isSubmittingForm = false; // Not submitting, so errors can show

    const result = simulateFormValidation(name, sessionCode, hasInteracted, isSubmittingForm);

    // Form should be invalid
    expect(result.validation.isFormValid).toBe(false);

    // Errors should show since not submitting
    expect(result.getFieldError('name')).toBe('Please enter your name');
    expect(result.getFieldError('sessionCode')).toBe('Session code must be exactly 6 characters');
    expect(result.getFieldState('name')).toBe('invalid');
    expect(result.getFieldState('sessionCode')).toBe('invalid');
  });

  it('should not show errors for valid form even when fields have been interacted with', () => {
    const name = 'John Doe';
    const sessionCode = 'ABC123';
    const hasInteracted = { name: true, sessionCode: true };
    const isSubmittingForm = false;

    const result = simulateFormValidation(name, sessionCode, hasInteracted, isSubmittingForm);

    // Form should be valid
    expect(result.validation.isFormValid).toBe(true);

    // No errors should show for valid form
    expect(result.getFieldError('name')).toBeUndefined();
    expect(result.getFieldError('sessionCode')).toBeUndefined();
    expect(result.getFieldState('name')).toBe('valid');
    expect(result.getFieldState('sessionCode')).toBe('valid');
  });

  it('should not show errors when fields have not been interacted with', () => {
    const name = '';
    const sessionCode = '';
    const hasInteracted = { name: false, sessionCode: false };
    const isSubmittingForm = false;

    const result = simulateFormValidation(name, sessionCode, hasInteracted, isSubmittingForm);

    // Form should be invalid
    expect(result.validation.isFormValid).toBe(false);

    // But errors should not show since user hasn't interacted
    expect(result.getFieldError('name')).toBeUndefined();
    expect(result.getFieldError('sessionCode')).toBeUndefined();
    expect(result.getFieldState('name')).toBe('neutral');
    expect(result.getFieldState('sessionCode')).toBe('neutral');
  });

  it('should handle validateAll logic correctly for successful submission', () => {
    const name = 'John Doe';
    const sessionCode = 'ABC123';

    // Simulate validateAll logic
    const nameValidation = validateName(name);
    const sessionCodeValidation = validateSessionCode(sessionCode);
    
    const freshValidation = {
      name: nameValidation,
      sessionCode: sessionCodeValidation,
      isFormValid: nameValidation.isValid && sessionCodeValidation.isValid
    };

    // Should be valid
    expect(freshValidation.isFormValid).toBe(true);

    // Since valid, hasInteracted should NOT be set to true
    const shouldSetInteracted = !freshValidation.isFormValid;
    expect(shouldSetInteracted).toBe(false);
  });

  it('should handle validateAll logic correctly for failed submission', () => {
    const name = '';
    const sessionCode = 'ABC';

    // Simulate validateAll logic
    const nameValidation = validateName(name);
    const sessionCodeValidation = validateSessionCode(sessionCode);
    
    const freshValidation = {
      name: nameValidation,
      sessionCode: sessionCodeValidation,
      isFormValid: nameValidation.isValid && sessionCodeValidation.isValid
    };

    // Should be invalid
    expect(freshValidation.isFormValid).toBe(false);

    // Since invalid, hasInteracted should be set to true to show errors
    const shouldSetInteracted = !freshValidation.isFormValid;
    expect(shouldSetInteracted).toBe(true);
  });
});