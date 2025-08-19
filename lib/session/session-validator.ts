import { 
  SESSION_CODE_PATTERN, 
  PARTICIPANT_NAME_MIN_LENGTH, 
  PARTICIPANT_NAME_MAX_LENGTH 
} from '../constants';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface SessionValidationErrors {
  INVALID_SESSION_CODE: string;
  SESSION_NOT_FOUND: string;
  SESSION_EXPIRED: string;
  SESSION_FULL: string;
  INVALID_PARTICIPANT_NAME: string;
  DUPLICATE_PARTICIPANT_NAME: string;
  CONNECTION_LOST: string;
}

export const SESSION_VALIDATION_ERRORS: SessionValidationErrors = {
  INVALID_SESSION_CODE: 'Session code must be exactly 6 alphanumeric characters',
  SESSION_NOT_FOUND: 'Session not found. Check the code or start a new session.',
  SESSION_EXPIRED: 'This session has ended. Start a new session?',
  SESSION_FULL: 'Session is full (50 participants max). Try another code.',
  INVALID_PARTICIPANT_NAME: 'Name must be 1-50 characters, alphanumeric characters, spaces, and hyphens only',
  DUPLICATE_PARTICIPANT_NAME: 'This name is already taken in this session',
  CONNECTION_LOST: 'Connection lost. Attempting to reconnect...'
};

export function validateSessionCode(sessionCode: string): ValidationResult {
  if (!sessionCode) {
    return { isValid: false, error: SESSION_VALIDATION_ERRORS.INVALID_SESSION_CODE };
  }
  
  if (!SESSION_CODE_PATTERN.test(sessionCode)) {
    return { isValid: false, error: SESSION_VALIDATION_ERRORS.INVALID_SESSION_CODE };
  }
  
  return { isValid: true };
}

export function validateParticipantName(name: string): ValidationResult {
  if (!name || name.length < PARTICIPANT_NAME_MIN_LENGTH || name.length > PARTICIPANT_NAME_MAX_LENGTH) {
    return { isValid: false, error: SESSION_VALIDATION_ERRORS.INVALID_PARTICIPANT_NAME };
  }
  
  // Allow alphanumeric, spaces, hyphens, and underscores
  const namePattern = /^[a-zA-Z0-9\s\-_]+$/;
  if (!namePattern.test(name)) {
    return { isValid: false, error: SESSION_VALIDATION_ERRORS.INVALID_PARTICIPANT_NAME };
  }
  
  return { isValid: true };
}

export function resolveNameConflict(desiredName: string, existingNames: Set<string>): string {
  if (!existingNames.has(desiredName)) {
    return desiredName;
  }
  
  // Try appending numbers: John -> John-2 -> John-3, etc.
  let counter = 2;
  let resolvedName: string;
  
  do {
    resolvedName = `${desiredName}-${counter}`;
    counter++;
  } while (existingNames.has(resolvedName) && counter <= 100); // Prevent infinite loops
  
  if (counter > 100) {
    // Fallback to timestamp-based suffix
    const timestamp = Date.now().toString().slice(-4);
    resolvedName = `${desiredName}-${timestamp}`;
  }
  
  return resolvedName;
}

export function sanitizeParticipantName(name: string): string {
  // Trim whitespace and normalize spaces
  return name.trim().replace(/\s+/g, ' ');
}