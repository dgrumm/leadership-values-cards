'use client';

import { useState, useEffect } from 'react';
import { validateName, validateSessionCode, ValidationResult } from '@/lib/utils/validation';

export interface FormValidation {
  name: ValidationResult;
  sessionCode: ValidationResult;
  isFormValid: boolean;
}

export interface UseFormValidationProps {
  name: string;
  sessionCode: string;
  realTimeValidation?: boolean;
}

/**
 * Custom hook for real-time form validation
 */
export function useFormValidation({ 
  name, 
  sessionCode, 
  realTimeValidation = true 
}: UseFormValidationProps) {
  const [validation, setValidation] = useState<FormValidation>({
    name: { isValid: true },
    sessionCode: { isValid: true },
    isFormValid: false
  });

  const [hasInteracted, setHasInteracted] = useState({
    name: false,
    sessionCode: false
  });

  // Validate form whenever inputs change
  useEffect(() => {
    const nameValidation = validateName(name);
    const sessionCodeValidation = validateSessionCode(sessionCode);
    
    const newValidation: FormValidation = {
      name: nameValidation,
      sessionCode: sessionCodeValidation,
      isFormValid: nameValidation.isValid && sessionCodeValidation.isValid
    };

    setValidation(newValidation);
  }, [name, sessionCode]);

  // Mark field as interacted with for validation display
  const markInteracted = (field: 'name' | 'sessionCode') => {
    setHasInteracted(prev => ({ ...prev, [field]: true }));
  };

  // Get validation error to display (only show if field has been interacted with)
  const getFieldError = (field: 'name' | 'sessionCode'): string | undefined => {
    if (!realTimeValidation || !hasInteracted[field]) {
      return undefined;
    }
    
    return validation[field].error;
  };

  // Get field validation state for styling
  const getFieldState = (field: 'name' | 'sessionCode'): 'valid' | 'invalid' | 'neutral' => {
    if (!hasInteracted[field]) {
      return 'neutral';
    }
    
    return validation[field].isValid ? 'valid' : 'invalid';
  };

  // Force validation of all fields (for form submission)
  const validateAll = (): FormValidation => {
    setHasInteracted({ name: true, sessionCode: true });
    return validation;
  };

  return {
    validation,
    markInteracted,
    getFieldError,
    getFieldState,
    validateAll,
    hasInteracted
  };
}