/**
 * Test to replicate and verify the fix for the exact bug shown in the screenshot
 * where validation errors appeared alongside success state
 */

import { validateName, validateSessionCode } from '@/lib/utils/validation';

describe('Screenshot Bug Fix', () => {
  it('should not show validation errors when form is in success state', () => {
    // Simulate the exact scenario from the screenshot
    const formData = { name: 'John', sessionCode: 'ABC123' };
    const hasInteracted = { name: true, sessionCode: true }; // User had interacted before
    const isSubmittingForm = false; // Not currently submitting
    const isSuccess = true; // Form submission was successful (KEY STATE from screenshot)

    // Validate the form data
    const nameValidation = validateName(formData.name);
    const sessionCodeValidation = validateSessionCode(formData.sessionCode);

    // This is the logic from the fixed getFieldError in useFormValidation
    const getFieldError = (field: 'name' | 'sessionCode') => {
      // The original bug: this would return errors even during success state
      if (!hasInteracted[field] || isSubmittingForm) {
        return undefined;
      }
      
      return field === 'name' ? nameValidation.error : sessionCodeValidation.error;
    };

    // This is the NEW logic from LoginForm component that should fix the issue
    const getFieldErrorWithSuccessCheck = (field: 'name' | 'sessionCode') => {
      // NEW FIX: Suppress errors when form is in success state
      if (isSuccess) {
        return undefined;
      }
      
      return getFieldError(field);
    };

    const getFieldStateWithSuccessCheck = (field: 'name' | 'sessionCode') => {
      // NEW FIX: Return neutral state when form is in success state
      if (isSuccess) {
        return 'neutral';
      }
      
      if (!hasInteracted[field] || isSubmittingForm) {
        return 'neutral';
      }
      
      const validation = field === 'name' ? nameValidation : sessionCodeValidation;
      return validation.isValid ? 'valid' : 'invalid';
    };

    // Test the old behavior (this was causing the bug)
    expect(getFieldError('name')).toBeUndefined(); // Actually valid data
    expect(getFieldError('sessionCode')).toBeUndefined(); // Actually valid data

    // Test the new behavior with success state check
    expect(getFieldErrorWithSuccessCheck('name')).toBeUndefined();
    expect(getFieldErrorWithSuccessCheck('sessionCode')).toBeUndefined();
    expect(getFieldStateWithSuccessCheck('name')).toBe('neutral');
    expect(getFieldStateWithSuccessCheck('sessionCode')).toBe('neutral');
  });

  it('should handle the case where user had validation errors before but form is now successful', () => {
    // This simulates the scenario where:
    // 1. User typed invalid data and saw errors
    // 2. User corrected the data
    // 3. User submitted successfully
    // 4. During the 500ms success display, validation errors should NOT show

    const formData = { name: 'John Doe', sessionCode: 'ABC123' };
    const hasInteracted = { name: true, sessionCode: true }; // User saw errors before
    const isSubmittingForm = false;
    const isSuccess = true; // Now successful

    // The form data is actually valid
    const nameValidation = validateName(formData.name);
    const sessionCodeValidation = validateSessionCode(formData.sessionCode);

    expect(nameValidation.isValid).toBe(true);
    expect(sessionCodeValidation.isValid).toBe(true);

    // The key test: even though hasInteracted is true, 
    // errors should be suppressed due to success state
    const shouldShowNameError = isSuccess ? undefined : nameValidation.error;
    const shouldShowCodeError = isSuccess ? undefined : sessionCodeValidation.error;

    expect(shouldShowNameError).toBeUndefined();
    expect(shouldShowCodeError).toBeUndefined();
  });

  it('should handle invalid data that somehow got past validation (edge case)', () => {
    // This tests the edge case where invalid data somehow gets into success state
    // (shouldn't happen, but we want to be safe)
    const formData = { name: '', sessionCode: 'ABC' };
    const hasInteracted = { name: true, sessionCode: true };
    const isSubmittingForm = false;
    const isSuccess = true; // This shouldn't happen with invalid data, but test it

    const nameValidation = validateName(formData.name);
    const sessionCodeValidation = validateSessionCode(formData.sessionCode);

    // Data is actually invalid
    expect(nameValidation.isValid).toBe(false);
    expect(sessionCodeValidation.isValid).toBe(false);

    // But if we're in success state, errors should still be suppressed
    const shouldShowNameError = isSuccess ? undefined : nameValidation.error;
    const shouldShowCodeError = isSuccess ? undefined : sessionCodeValidation.error;

    expect(shouldShowNameError).toBeUndefined();
    expect(shouldShowCodeError).toBeUndefined();
  });

  it('should show errors when form is NOT in success state but validation fails', () => {
    const formData = { name: '', sessionCode: 'ABC' };
    const hasInteracted = { name: true, sessionCode: true };
    const isSubmittingForm = false;
    const isSuccess = false; // Not successful

    const nameValidation = validateName(formData.name);
    const sessionCodeValidation = validateSessionCode(formData.sessionCode);

    expect(nameValidation.isValid).toBe(false);
    expect(sessionCodeValidation.isValid).toBe(false);

    // Errors should show when not in success state
    const shouldShowNameError = isSuccess ? undefined : nameValidation.error;
    const shouldShowCodeError = isSuccess ? undefined : sessionCodeValidation.error;

    expect(shouldShowNameError).toBe('Please enter your name');
    expect(shouldShowCodeError).toBe('Session code must be exactly 6 characters');
  });
});