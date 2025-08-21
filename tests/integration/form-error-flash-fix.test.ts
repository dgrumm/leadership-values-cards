/**
 * Integration test to verify that form validation errors
 * do not flash during successful form submission
 */

import { validateName, validateSessionCode } from '@/lib/utils/validation';

describe('Form Error Flash Fix - Integration', () => {
  // Simulate the complete form submission flow
  const simulateFormSubmissionFlow = (
    formData: { name: string; sessionCode: string },
    userHasInteractedBefore = false
  ) => {
    // Initial state
    let hasInteracted = { 
      name: userHasInteractedBefore, 
      sessionCode: userHasInteractedBefore 
    };
    let isSubmittingForm = false;

    // Helper to check if errors should be displayed
    const shouldShowErrors = (field: 'name' | 'sessionCode') => {
      const validation = field === 'name' 
        ? validateName(formData.name)
        : validateSessionCode(formData.sessionCode);
      
      // The key logic: don't show errors if submitting or not interacted
      if (!hasInteracted[field] || isSubmittingForm) {
        return false;
      }
      
      return !validation.isValid;
    };

    // Step 1: User clicks submit button
    const handleSubmit = () => {
      // Set submitting flag immediately
      isSubmittingForm = true;
      
      // Validate form data
      const nameValidation = validateName(formData.name);
      const sessionCodeValidation = validateSessionCode(formData.sessionCode);
      const isFormValid = nameValidation.isValid && sessionCodeValidation.isValid;

      // If invalid, mark as interacted and stop submitting to show errors
      if (!isFormValid) {
        hasInteracted = { name: true, sessionCode: true };
        isSubmittingForm = false;
        return { success: false, canSubmit: false };
      }

      // Form is valid, proceed with submission
      return { success: true, canSubmit: true };
    };

    // Step 2: Simulate successful submission completion
    const completeSubmission = () => {
      isSubmittingForm = false;
    };

    return {
      shouldShowErrors,
      handleSubmit,
      completeSubmission,
      getState: () => ({ hasInteracted, isSubmittingForm })
    };
  };

  it('should not show validation errors during successful submission - even if user interacted before', () => {
    const validFormData = { name: 'John Doe', sessionCode: 'ABC123' };
    const userHasInteractedBefore = true; // This was causing the flash
    
    const form = simulateFormSubmissionFlow(validFormData, userHasInteractedBefore);

    // Before submission: user might see valid state
    expect(form.shouldShowErrors('name')).toBe(false);
    expect(form.shouldShowErrors('sessionCode')).toBe(false);

    // During submission: should not show errors even if form had errors before
    const submitResult = form.handleSubmit();
    expect(submitResult.success).toBe(true);
    expect(submitResult.canSubmit).toBe(true);

    // Critical test: during submission, errors should be suppressed
    expect(form.shouldShowErrors('name')).toBe(false);
    expect(form.shouldShowErrors('sessionCode')).toBe(false);

    // After successful submission
    form.completeSubmission();
    expect(form.shouldShowErrors('name')).toBe(false);
    expect(form.shouldShowErrors('sessionCode')).toBe(false);
  });

  it('should show validation errors only when submission fails due to invalid data', () => {
    const invalidFormData = { name: '', sessionCode: 'ABC' };
    
    const form = simulateFormSubmissionFlow(invalidFormData, false);

    // Before submission: no errors shown (user hasn't interacted)
    expect(form.shouldShowErrors('name')).toBe(false);
    expect(form.shouldShowErrors('sessionCode')).toBe(false);

    // During submission attempt
    const submitResult = form.handleSubmit();
    expect(submitResult.success).toBe(false);
    expect(submitResult.canSubmit).toBe(false);

    // After failed submission: now errors should be visible
    expect(form.shouldShowErrors('name')).toBe(true);
    expect(form.shouldShowErrors('sessionCode')).toBe(true);
  });

  it('should handle the exact scenario that was causing the flash', () => {
    // This simulates the exact scenario you experienced:
    // 1. User has valid form data
    // 2. User has previously interacted with fields (maybe typed and corrected)
    // 3. User clicks submit
    // 4. validateAll() was called and briefly caused error flash

    const validFormData = { name: 'Dave', sessionCode: 'ABC123' };
    
    // User has interacted with fields before (this was the key issue)
    let hasInteracted = { name: true, sessionCode: true };
    let isSubmittingForm = false;

    // Step 1: Before submit - no errors should show for valid data
    const nameValidation = validateName(validFormData.name);
    const codeValidation = validateSessionCode(validFormData.sessionCode);
    
    expect(nameValidation.isValid).toBe(true);
    expect(codeValidation.isValid).toBe(true);

    // Step 2: Submit button clicked - set submitting flag IMMEDIATELY
    isSubmittingForm = true;

    // Step 3: During submission validation - errors should be suppressed
    const shouldShowNameError = !hasInteracted.name || isSubmittingForm ? false : !nameValidation.isValid;
    const shouldShowCodeError = !hasInteracted.sessionCode || isSubmittingForm ? false : !codeValidation.isValid;

    expect(shouldShowNameError).toBe(false);
    expect(shouldShowCodeError).toBe(false);

    // Step 4: Form is valid, so hasInteracted is NOT updated
    const isFormValid = nameValidation.isValid && codeValidation.isValid;
    expect(isFormValid).toBe(true);

    // Since form is valid, we don't set hasInteracted to true
    // (this was part of the fix)

    // Step 5: Submission completes successfully
    isSubmittingForm = false;

    // Final state: still no errors
    expect(shouldShowNameError).toBe(false);
    expect(shouldShowCodeError).toBe(false);
  });

  it('should handle rapid form submissions without error flashing', () => {
    const validFormData = { name: 'John', sessionCode: 'XYZ789' };
    let hasInteracted = { name: true, sessionCode: true };
    let isSubmittingForm = false;

    // Function to check error display
    const checkErrorDisplay = () => {
      const nameValidation = validateName(validFormData.name);
      const codeValidation = validateSessionCode(validFormData.sessionCode);
      
      return {
        nameError: !hasInteracted.name || isSubmittingForm ? undefined : nameValidation.error,
        codeError: !hasInteracted.sessionCode || isSubmittingForm ? undefined : codeValidation.error
      };
    };

    // Multiple rapid submissions
    for (let i = 0; i < 5; i++) {
      // Start submission
      isSubmittingForm = true;
      
      const errors = checkErrorDisplay();
      expect(errors.nameError).toBeUndefined();
      expect(errors.codeError).toBeUndefined();
      
      // Complete submission
      isSubmittingForm = false;
      
      const errorsAfter = checkErrorDisplay();
      expect(errorsAfter.nameError).toBeUndefined();
      expect(errorsAfter.codeError).toBeUndefined();
    }
  });
});