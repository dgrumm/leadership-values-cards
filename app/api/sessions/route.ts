import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '@/lib/session/session-manager';
import { SessionConfig } from '@/lib/types';
import { getRateLimiter, getClientIP, RATE_LIMIT_CONFIGS } from '@/lib/utils/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientIP = getClientIP(request);
    const rateLimiter = getRateLimiter();
    const limitResult = rateLimiter.checkLimit(clientIP, RATE_LIMIT_CONFIGS.CREATE_SESSION);
    
    if (!limitResult.allowed) {
      return NextResponse.json({
        error: 'Rate limit exceeded. Too many session creation requests.',
        retryAfter: Math.ceil((limitResult.resetTime - Date.now()) / 1000)
      }, { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((limitResult.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': RATE_LIMIT_CONFIGS.CREATE_SESSION.maxRequests.toString(),
          'X-RateLimit-Remaining': limitResult.remaining.toString(),
          'X-RateLimit-Reset': limitResult.resetTime.toString()
        }
      });
    }
    
    const sessionManager = getSessionManager();
    const body = await request.json().catch(() => ({}));
    
    // Extract optional session config from request body
    const config: Partial<SessionConfig> = {};
    if (body.maxParticipants) config.maxParticipants = body.maxParticipants;
    if (body.timeoutMinutes) config.timeoutMinutes = body.timeoutMinutes;
    if (body.deckType) config.deckType = body.deckType;

    // Check if this is a join-or-create request (atomic operation to prevent race conditions)
    if (body.participantName && body.sessionCode) {
      const result = await sessionManager.joinOrCreateSession(
        body.sessionCode,
        body.participantName,
        config
      );

      if (result.success && result.session && result.participant) {
        return NextResponse.json({
          sessionCode: result.session.sessionCode,
          session: result.session,
          participant: result.participant
        }, { status: 201 });
      } else {
        return NextResponse.json({
          error: result.error || 'Failed to join or create session'
        }, { status: 400 });
      }
    }

    // Check if this is a create-with-creator request (for simplified flow)
    if (body.creatorName) {
      const result = await sessionManager.createSessionWithCreator(
        body.creatorName,
        config,
        body.customCode
      );

      if (result.success && result.session && result.participant) {
        return NextResponse.json({
          sessionCode: result.session.sessionCode,
          session: result.session,
          participant: result.participant
        }, { status: 201 });
      } else {
        return NextResponse.json({
          error: result.error || 'Failed to create session'
        }, { status: 500 });
      }
    }

    // Traditional session creation (no immediate participant)
    const result = await sessionManager.createSession(config, body.customCode);

    if (result.success && result.session) {
      return NextResponse.json({
        sessionCode: result.session.sessionCode,
        session: result.session
      }, { status: 201 });
    } else {
      return NextResponse.json({
        error: result.error || 'Failed to create session'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sessionManager = getSessionManager();
    const expiredSessions = await sessionManager.cleanupExpiredSessions();
    
    return NextResponse.json({
      message: 'Session cleanup completed',
      expiredSessions
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}