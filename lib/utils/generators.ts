import { SESSION_CODE_LENGTH } from '../constants';

export function generateSessionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < SESSION_CODE_LENGTH; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
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
