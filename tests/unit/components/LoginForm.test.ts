import { validateName, validateSessionCode } from '@/lib/utils/validation';

describe('LoginForm Validation Logic', () => {
  describe('Form validation behavior', () => {
    it('should validate name correctly', () => {
      // Valid names
      expect(validateName('John')).toEqual({ isValid: true });
      expect(validateName('Jane Doe')).toEqual({ isValid: true });
      expect(validateName('Jean-Claude')).toEqual({ isValid: true });
      
      // Invalid names
      expect(validateName('')).toEqual({ 
        isValid: false, 
        error: 'Please enter your name' 
      });
      expect(validateName('   ')).toEqual({ 
        isValid: false, 
        error: 'Please enter your name' 
      });
    });

    it('should validate session code correctly', () => {
      // Valid session codes
      expect(validateSessionCode('ABC123')).toEqual({ isValid: true });
      expect(validateSessionCode('XYZ789')).toEqual({ isValid: true });
      
      // Invalid session codes
      expect(validateSessionCode('')).toEqual({ 
        isValid: false, 
        error: 'Please enter a session code' 
      });
      expect(validateSessionCode('ABC')).toEqual({ 
        isValid: false, 
        error: 'Session code must be exactly 6 characters' 
      });
      expect(validateSessionCode('ABC12345')).toEqual({ 
        isValid: false, 
        error: 'Session code must be exactly 6 characters' 
      });
    });
  });

  describe('Form submission flow', () => {
    it('should prevent submission with invalid data', () => {
      const nameValidation = validateName('');
      const codeValidation = validateSessionCode('');
      
      const isFormValid = nameValidation.isValid && codeValidation.isValid;
      
      expect(isFormValid).toBe(false);
      expect(nameValidation.error).toBeDefined();
      expect(codeValidation.error).toBeDefined();
    });

    it('should allow submission with valid data', () => {
      const nameValidation = validateName('John Doe');
      const codeValidation = validateSessionCode('ABC123');
      
      const isFormValid = nameValidation.isValid && codeValidation.isValid;
      
      expect(isFormValid).toBe(true);
      expect(nameValidation.error).toBeUndefined();
      expect(codeValidation.error).toBeUndefined();
    });
  });
});