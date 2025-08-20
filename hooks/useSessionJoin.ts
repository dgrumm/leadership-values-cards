'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface JoinSessionProps {
  name: string;
  sessionCode: string;
  onSuccess?: (sessionCode: string, participantName: string) => void;
  onError?: (error: string) => void;
}

export interface SessionJoinState {
  isLoading: boolean;
  error: string | null;
  isSuccess: boolean;
}

/**
 * Custom hook for intelligent session join/create
 */
export function useSessionJoin() {
  const [state, setState] = useState<SessionJoinState>({
    isLoading: false,
    error: null,
    isSuccess: false
  });
  
  const router = useRouter();

  // Intelligent join/create: try to join existing session, create if not found
  const joinOrCreateSession = async ({ name, sessionCode, onSuccess, onError }: JoinSessionProps) => {
    setState({ isLoading: true, error: null, isSuccess: false });

    try {
      // First, try to join existing session
      const joinResponse = await fetch(`/api/sessions/${sessionCode}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participantName: name.trim() }),
      });

      const joinData = await joinResponse.json();

      // If join successful, we're done
      if (joinResponse.ok) {
        setState({ isLoading: false, error: null, isSuccess: true });
        onSuccess?.(sessionCode, joinData.participant.name);
        router.push(`/canvas?session=${sessionCode}&name=${encodeURIComponent(joinData.participant.name)}`);
        return { success: true, participant: joinData.participant, action: 'joined' };
      }

      // If session full or other non-404 error, don't try to create
      if (joinResponse.status !== 404) {
        throw new Error(joinData.error || 'Failed to join session');
      }

      // Session doesn't exist (404), so create new session with this code
      const createResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          creatorName: name.trim(),
          customCode: sessionCode // Request specific session code
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createData.error || 'Failed to create session');
      }

      setState({ isLoading: false, error: null, isSuccess: true });
      onSuccess?.(sessionCode, createData.participant.name);
      router.push(`/canvas?session=${sessionCode}&name=${encodeURIComponent(createData.participant.name)}`);
      
      return { success: true, session: createData.session, participant: createData.participant, action: 'created' };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState({ isLoading: false, error: errorMessage, isSuccess: false });
      onError?.(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Clear error state
  const clearError = () => {
    setState(prev => ({ ...prev, error: null }));
  };

  return {
    ...state,
    joinOrCreateSession,
    clearError
  };
}