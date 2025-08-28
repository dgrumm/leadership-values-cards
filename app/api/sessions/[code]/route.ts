import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '@/lib/session/session-manager';
import { getSessionLifecycle } from '@/lib/session/session-lifecycle';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const params = await context.params;
    const sessionCode = params.code;
    const sessionManager = getSessionManager();
    
    const session = await sessionManager.getSession(sessionCode);
    
    if (!session) {
      return NextResponse.json({
        error: 'Session not found or expired'
      }, { status: 404 });
    }

    // Get timeout information
    const sessionLifecycle = getSessionLifecycle();
    const timeoutInfo = await sessionLifecycle.checkSessionTimeout(sessionCode);

    return NextResponse.json({
      session,
      timeoutInfo
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const params = await context.params;
    const sessionCode = params.code;
    const body = await request.json();
    const { participantId, currentStep } = body;

    const sessionManager = getSessionManager();
    
    if (participantId) {
      const success = await sessionManager.updateParticipantActivity(
        sessionCode, 
        participantId, 
        currentStep
      );
      
      if (!success) {
        return NextResponse.json({
          error: 'Failed to update participant activity'
        }, { status: 400 });
      }
    }

    // Extend session activity
    const sessionLifecycle = getSessionLifecycle();
    await sessionLifecycle.extendSession(sessionCode);

    const session = await sessionManager.getSession(sessionCode);
    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const params = await context.params;
    const sessionCode = params.code;
    
    let participantId: string;
    try {
      const body = await request.json();
      participantId = body.participantId;
    } catch {
      // Handle empty or malformed JSON body
      return NextResponse.json({
        error: 'Request body must contain participantId'
      }, { status: 400 });
    }
    
    if (!participantId) {
      return NextResponse.json({
        error: 'participantId is required'
      }, { status: 400 });
    }

    const sessionManager = getSessionManager();
    const result = await sessionManager.leaveSession(sessionCode, participantId);

    if (result.success) {
      return NextResponse.json({
        message: result.sessionDeleted ? 'Session deleted' : 'Participant removed',
        sessionDeleted: result.sessionDeleted
      });
    } else {
      return NextResponse.json({
        error: result.error || 'Failed to leave session'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error leaving session:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}