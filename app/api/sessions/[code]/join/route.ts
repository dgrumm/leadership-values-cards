import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '@/lib/session/session-manager';
import { getSessionLifecycle } from '@/lib/session/session-lifecycle';

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const sessionCode = params.code;
    const { participantName } = await request.json();

    if (!participantName || typeof participantName !== 'string') {
      return NextResponse.json({
        error: 'Participant name is required'
      }, { status: 400 });
    }

    const sessionManager = getSessionManager();
    const result = await sessionManager.joinSession(sessionCode, participantName);

    if (result.success && result.session && result.participant) {
      // Start monitoring the session for timeouts
      const sessionLifecycle = getSessionLifecycle();
      sessionLifecycle.monitorSession(sessionCode);

      return NextResponse.json({
        session: result.session,
        participant: result.participant,
        message: 'Successfully joined session'
      }, { status: 200 });
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