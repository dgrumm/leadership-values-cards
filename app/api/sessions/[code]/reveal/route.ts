import { NextRequest, NextResponse } from 'next/server';
import { getSessionManager } from '@/lib/session/session-manager';
import { getSessionLifecycle } from '@/lib/session/session-lifecycle';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const params = await context.params;
    const sessionCode = params.code;
    const body = await request.json();
    const { participantId, type, cards, revealed, status, cardStates, unrevel } = body;

    const sessionManager = getSessionManager();
    
    // Get current session
    const session = await sessionManager.getSession(sessionCode);
    if (!session) {
      return NextResponse.json({
        error: 'Session not found'
      }, { status: 404 });
    }

    // Find participant
    const participantIndex = session.participants.findIndex(p => p.id === participantId);
    if (participantIndex === -1) {
      return NextResponse.json({
        error: 'Participant not found in session'
      }, { status: 404 });
    }

    console.log(`🔧 PUT /api/sessions/${sessionCode}/reveal:`);
    console.log(`   📝 ParticipantId: ${participantId}`);
    console.log(`   📝 Type: ${type}`);
    console.log(`   📝 Unrevel: ${unrevel}`);

    // Determine status based on reveal state
    let newStatus = status;
    if (unrevel) {
      const participant = session.participants[participantIndex];
      // Update status if no longer revealing anything
      if (!participant.revealed.top8 && !participant.revealed.top3) {
        newStatus = 'sorting';
      } else if (type === 'top8' && participant.revealed.top3) {
        newStatus = 'revealed-3';
      } else if (type === 'top3' && participant.revealed.top8) {
        newStatus = 'revealed-8';
      }
    }

    // Update participant reveal status using new SessionManager method
    const success = await sessionManager.updateParticipantReveal(sessionCode, participantId, {
      type,
      revealed: !unrevel,
      status: newStatus || (type === 'top8' ? 'revealed-8' : 'revealed-3'),
      cards: unrevel ? undefined : cards,
      unrevel
    });

    if (!success) {
      return NextResponse.json({
        error: 'Failed to update session'
      }, { status: 500 });
    }

    // Extend session activity
    const sessionLifecycle = getSessionLifecycle();
    await sessionLifecycle.extendSession(sessionCode);

    console.log(`✅ Successfully ${unrevel ? 'unrevealed' : 'revealed'} ${type} for participant ${participantId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating reveal status:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}