/**
 * Session code generation utilities
 */

/**
 * Generate a random 6-character session code
 * Uses A-Z and 0-9 characters for easy sharing
 */
export function generateSessionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Generate a unique session code that doesn't conflict with existing sessions
 * Checks against active sessions and retries if collision occurs
 */
export async function generateUniqueSessionCode(): Promise<string> {
  const maxAttempts = 10;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateSessionCode();
    
    try {
      // Check if session exists by attempting to fetch it
      const response = await fetch(`/api/sessions/${code}`, {
        method: 'GET',
      });
      
      // If session doesn't exist (404), this code is available
      if (response.status === 404) {
        return code;
      }
      
      // If session exists, try again
      continue;
    } catch {
      // Network error - assume code is available
      return code;
    }
  }
  
  // Fallback: generate code with timestamp suffix
  const timestamp = Date.now().toString().slice(-2);
  return generateSessionCode().slice(0, 4) + timestamp;
}

/**
 * Validate session code format
 */
export function isValidSessionCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}