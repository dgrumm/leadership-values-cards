import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '@/lib/session/session-manager';
import { SessionConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const sessionManager = getSessionManager();
    const body = await request.json().catch(() => ({}));
    
    // Extract optional session config from request body
    const config: Partial<SessionConfig> = {};
    if (body.maxParticipants) config.maxParticipants = body.maxParticipants;
    if (body.timeoutMinutes) config.timeoutMinutes = body.timeoutMinutes;
    if (body.deckType) config.deckType = body.deckType;

    const result = await sessionManager.createSession(config);

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