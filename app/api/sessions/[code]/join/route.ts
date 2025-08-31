import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '@/lib/session/session-manager';
import { getSessionLifecycle } from '@/lib/session/session-lifecycle';
import { getRateLimiter, getClientIP, RATE_LIMIT_CONFIGS } from '@/lib/utils/rate-limiter';
import { sanitizeSessionCode, sanitizeParticipantName } from '@/lib/session/session-validator';
import { getOrCreateClientId, setClientIdCookie } from '@/lib/utils/client-id-manager';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    // Apply rate limiting
    const clientIP = getClientIP(request);
    const rateLimiter = getRateLimiter();
    const limitResult = rateLimiter.checkLimit(clientIP, RATE_LIMIT_CONFIGS.JOIN_SESSION);
    
    if (!limitResult.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded. Too many join requests.',
        retryAfter: Math.ceil((limitResult.resetTime - Date.now()) / 1000)
      }, { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((limitResult.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': RATE_LIMIT_CONFIGS.JOIN_SESSION.maxRequests.toString(),
          'X-RateLimit-Remaining': limitResult.remaining.toString(),
          'X-RateLimit-Reset': limitResult.resetTime.toString()
        }
      });
    }
    
    const params = await context.params;
    const sessionCode = sanitizeSessionCode(params.code);
    const body = await request.json();
    const participantName = sanitizeParticipantName(body.participantName || '');

    if (!participantName) {
      return NextResponse.json({
        error: 'Participant name is required'
      }, { status: 400 });
    }

    // Get or create client ID for persistent identity
    const { clientId, isNew } = await getOrCreateClientId(request);
    console.log(`🍪 ${isNew ? 'Generated new' : 'Found existing'} client ID: ${clientId.substring(0, 8)}... for participant ${participantName}`);

    const sessionManager = getSessionManager();
    const result = await sessionManager.joinSession(sessionCode, participantName, clientId);

    if (result.success && result.session && result.participant) {
      // Start monitoring the session for timeouts
      const sessionLifecycle = getSessionLifecycle();
      sessionLifecycle.monitorSession(sessionCode);

      // Create response with cookie
      const response = NextResponse.json({
        session: result.session,
        participant: result.participant,
        message: 'Successfully joined session'
      }, { status: 200 });

      // Set client ID cookie for future requests
      setClientIdCookie(response, clientId);

      return response;
    } else {
      // Determine appropriate status code based on error type
      let status = 400;
      if (result.error?.includes('Session not found')) {
        status = 404;
      } else if (result.error?.includes('session has ended')) {
        status = 410; // Gone
      } else if (result.error?.includes('Session is full')) {
        status = 403; // Forbidden
      }

      return NextResponse.json({
        error: result.error || 'Failed to join session'
      }, { status });
    }
  } catch (error) {
    console.error('Error joining session:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}