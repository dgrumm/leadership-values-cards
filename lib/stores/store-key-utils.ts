/**
 * Store Key Utilities for Session-Scoped State Management
 * Generates and validates keys for participant store isolation
 */

/**
 * Generates a unique store key for session and participant isolation
 * Format: ${sessionCode}:${participantId}
 * Example: "ABC123:user-uuid-456"
 */
export function generateStoreKey(sessionCode: string, participantId: string): string {
  if (!validateSessionCode(sessionCode)) {
    throw new Error(`Invalid session code format: ${sessionCode}. Must be 6 uppercase alphanumeric characters.`);
  }
  
  if (!validateParticipantId(participantId)) {
    throw new Error(`Invalid participant ID format: ${participantId}. Must be non-empty alphanumeric with hyphens/underscores.`);
  }
  
  return `${sessionCode}:${participantId}`;
}

/**
 * Validates session code format (ABC123)
 */
export function validateSessionCode(sessionCode: string): boolean {
  if (!sessionCode || typeof sessionCode !== 'string') {
    return false;
  }
  
  // Must be exactly 6 characters, uppercase A-Z and 0-9
  return /^[A-Z0-9]{6}$/.test(sessionCode);
}

/**
 * Validates participant ID format
 */
export function validateParticipantId(participantId: string): boolean {
  if (!participantId || typeof participantId !== 'string') {
    return false;
  }
  
  // Must be non-empty, alphanumeric with allowed special characters
  return /^[a-zA-Z0-9_-]+$/.test(participantId);
}

/**
 * Validates complete store key format
 */
export function validateStoreKey(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  const parts = key.split(':');
  if (parts.length !== 2) {
    return false;
  }
  
  const [sessionCode, participantId] = parts;
  return validateSessionCode(sessionCode) && validateParticipantId(participantId);
}

/**
 * Extracts session code from store key
 */
export function extractSessionCode(key: string): string {
  if (!validateStoreKey(key)) {
    throw new Error(`Invalid store key format: ${key}`);
  }
  
  return key.split(':')[0];
}

/**
 * Extracts participant ID from store key
 */
export function extractParticipantId(key: string): string {
  if (!validateStoreKey(key)) {
    throw new Error(`Invalid store key format: ${key}`);
  }
  
  return key.split(':')[1];
}

/**
 * Gets all participant keys for a session
 */
export function getSessionParticipantKeys(allKeys: string[], sessionCode: string): string[] {
  if (!validateSessionCode(sessionCode)) {
    throw new Error(`Invalid session code: ${sessionCode}`);
  }
  
  const sessionPrefix = `${sessionCode}:`;
  return allKeys.filter(key => key.startsWith(sessionPrefix) && validateStoreKey(key));
}