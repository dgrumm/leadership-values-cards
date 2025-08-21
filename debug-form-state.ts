/**
 * Debug utility to help troubleshoot form validation issues
 * This can be imported and used in LoginForm component during development
 */

export const debugFormState = (
  formData: { name: string; sessionCode: string },
  validation: any,
  hasInteracted: { name: boolean; sessionCode: boolean },
  isLoading: boolean,
  isSuccess: boolean,
  isSubmitting?: boolean
) => {
  console.group('🐛 Form State Debug');
  console.log('📝 Form Data:', formData);
  console.log('✅ Validation:', {
    name: validation.name,
    sessionCode: validation.sessionCode,
    isFormValid: validation.isFormValid
  });
  console.log('👆 Has Interacted:', hasInteracted);
  console.log('⏳ States:', {
    isLoading,
    isSuccess,
    isSubmitting: isSubmitting || false
  });
  
  // Show what errors would be displayed
  const wouldShowNameError = isSuccess ? 'SUPPRESSED by success' : (
    hasInteracted.name ? (validation.name.error || 'none') : 'not interacted'
  );
  const wouldShowCodeError = isSuccess ? 'SUPPRESSED by success' : (
    hasInteracted.sessionCode ? (validation.sessionCode.error || 'none') : 'not interacted'
  );
  
  console.log('❌ Would Show Errors:', {
    name: wouldShowNameError,
    sessionCode: wouldShowCodeError
  });
  
  console.groupEnd();
};

// Usage in LoginForm component:
// import { debugFormState } from './debug-form-state';
// 
// // Add this line in the render method
// debugFormState(formData, validation, hasInteracted, isLoading, isSuccess);