// Event validation utilities (extracted from types.ts for better organization)

export const EVENT_ID_REGEX = /^evt_[a-z0-9]+$/;
export const SESSION_CODE_REGEX = /^[A-Z0-9]{6}$/;
export const VALID_STEPS = [1, 2, 3] as const;

export class EventValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'EventValidationError';
  }
}

export function validateSessionCode(sessionCode: string, fieldName = 'sessionCode'): void {
  if (!SESSION_CODE_REGEX.test(sessionCode)) {
    throw new EventValidationError('Invalid session code format', fieldName);
  }
}

export function validateEventId(id: string): void {
  if (!EVENT_ID_REGEX.test(id)) {
    throw new EventValidationError('Invalid event ID format', 'id');
  }
}

export function validateTimestamp(timestamp: number): void {
  if (typeof timestamp !== 'number' || timestamp < 0) {
    throw new EventValidationError('Invalid timestamp', 'timestamp');
  }

  const now = Date.now();
  const maxFutureTolerance = 30000; // 30 seconds
  
  if (timestamp > now + maxFutureTolerance) {
    throw new EventValidationError('Timestamp too far in future', 'timestamp');
  }
}

export function validateStepValue(step: number, fieldName: string): void {
  if (!VALID_STEPS.includes(step as 1 | 2 | 3)) {
    throw new EventValidationError(`Invalid step value`, fieldName);
  }
}

export function validateRequiredString(value: unknown, fieldName: string): void {
  if (!value || typeof value !== 'string' || value.trim() === '') {
    if (fieldName === 'participant.name') {
      throw new EventValidationError('Invalid participant name', fieldName);
    } else if (fieldName === 'participantName') {
      throw new EventValidationError('Invalid participant name', fieldName);
    }
    throw new EventValidationError(`Invalid ${fieldName}`, fieldName);
  }
}

export function validateRequiredFields(obj: unknown, requiredFields: string[]): void {
  if (typeof obj !== 'object' || obj === null) {
    throw new EventValidationError('Invalid event structure');
  }
  const missingFields = requiredFields.filter(field => (obj as Record<string, unknown>)[field] === undefined);
  
  if (missingFields.length > 0) {
    if (missingFields.length === 1) {
      throw new EventValidationError(`Missing required field: ${missingFields[0]}`);
    } else {
      throw new EventValidationError(`Invalid event structure`);
    }
  }
}