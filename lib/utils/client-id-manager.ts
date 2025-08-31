import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Client ID Manager for persistent participant identity across browser sessions
 * Uses secure HTTP-only cookies to prevent participant duplication
 */

const CLIENT_ID_COOKIE_NAME = 'lvc_client_id';
const CLIENT_ID_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

export interface ClientIdCookieOptions {
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Generate a new client ID using crypto.randomUUID()
 */
export function generateClientId(): string {
  return crypto.randomUUID();
}

/**
 * Server-side: Get client ID from request cookies
 */
export async function getClientIdFromRequest(request: NextRequest): Promise<string | null> {
  try {
    const cookieStore = request.cookies;
    const clientIdCookie = cookieStore.get(CLIENT_ID_COOKIE_NAME);
    return clientIdCookie?.value || null;
  } catch (error) {
    console.error('Failed to get client ID from request:', error);
    return null;
  }
}

/**
 * Server-side: Get client ID from cookies() (App Router)
 */
export async function getClientIdFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const clientIdCookie = cookieStore.get(CLIENT_ID_COOKIE_NAME);
    return clientIdCookie?.value || null;
  } catch (error) {
    console.error('Failed to get client ID from cookies:', error);
    return null;
  }
}

/**
 * Server-side: Set client ID cookie in response headers
 */
export function setClientIdCookie(
  response: NextResponse, 
  clientId: string, 
  options: Partial<ClientIdCookieOptions> = {}
): void {
  try {
    const cookieOptions = {
      maxAge: CLIENT_ID_COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict' as const,
      path: '/',
      ...options
    };

    // Set cookie using response headers
    response.cookies.set(CLIENT_ID_COOKIE_NAME, clientId, cookieOptions);
    
    console.log(`🍪 Set client ID cookie: ${clientId.substring(0, 8)}...`);
  } catch (error) {
    console.error('Failed to set client ID cookie:', error);
  }
}

/**
 * Server-side: Clear client ID cookie
 */
export function clearClientIdCookie(response: NextResponse): void {
  try {
    response.cookies.set(CLIENT_ID_COOKIE_NAME, '', {
      maxAge: 0,
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict',
      path: '/'
    });
    
    console.log('🍪 Cleared client ID cookie');
  } catch (error) {
    console.error('Failed to clear client ID cookie:', error);
  }
}

/**
 * Get or create client ID for a request
 * If no existing client ID, generates a new one
 */
export async function getOrCreateClientId(request: NextRequest): Promise<{
  clientId: string;
  isNew: boolean;
}> {
  const existingClientId = await getClientIdFromRequest(request);
  
  if (existingClientId) {
    return {
      clientId: existingClientId,
      isNew: false
    };
  }
  
  const newClientId = generateClientId();
  return {
    clientId: newClientId,
    isNew: true
  };
}

/**
 * Validate client ID format (UUID v4)
 */
export function isValidClientId(clientId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(clientId);
}

/**
 * Clean up invalid client IDs
 */
export function sanitizeClientId(clientId: string | null | undefined): string | null {
  if (!clientId || typeof clientId !== 'string') {
    return null;
  }
  
  const trimmed = clientId.trim();
  return isValidClientId(trimmed) ? trimmed : null;
}