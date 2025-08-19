import { SESSION_CODE_LENGTH } from '../constants';

export function generateSessionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  // Use crypto.getRandomValues for cryptographically secure random generation
  const array = new Uint8Array(SESSION_CODE_LENGTH);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else if (typeof require !== 'undefined') {
    try {
      // Node.js environment fallback
      const nodeCrypto = require('crypto');
      const bytes = nodeCrypto.randomBytes(SESSION_CODE_LENGTH);
      for (let i = 0; i < SESSION_CODE_LENGTH; i++) {
        array[i] = bytes[i];
      }
    } catch (error) {
      throw new Error('Secure random number generation not available');
    }
  } else {
    throw new Error('Secure random number generation not available');
  }
  
  return Array.from(array, byte => chars[byte % chars.length]).join('');
}

export function generateCardId(valueName: string, index?: number): string {
  const sanitized = valueName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const suffix = index !== undefined ? `-${index}` : '';
  return `card-${sanitized}${suffix}`;
}

export function generateUniqueId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}-${timestamp}-${random}`;
}

export function createTimestamp(): string {
  return new Date().toISOString();
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}
