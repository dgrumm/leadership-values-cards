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

  // Intelligent join/create: atomic operation to prevent race conditions
  const joinOrCreateSession = async ({ name, sessionCode, onSuccess, onError }: JoinSessionProps) => {
    setState({ isLoading: true, error: null, isSuccess: false });

    // Add request timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      // Use atomic join-or-create API to prevent race conditions
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          participantName: name.trim(),
          sessionCode: sessionCode.trim().toUpperCase()
        }),
        signal: controller.signal
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join or create session');
      }

      setState({ isLoading: false, error: null, isSuccess: true });
      onSuccess?.(sessionCode, data.participant.name);
      router.push(`/canvas?session=${sessionCode}&name=${encodeURIComponent(data.participant.name)}`);
      
      return { 
        success: true, 
        session: data.session, 
        participant: data.participant, 
        action: 'joined-or-created' 
      };

    } catch (error) {
      let errorMessage: string;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timeout. Please check your connection and try again.';
        } else {
          errorMessage = error.message;
        }
      } else {
        errorMessage = 'An unexpected error occurred';
      }
      
      setState({ isLoading: false, error: errorMessage, isSuccess: false });
      onError?.(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      clearTimeout(timeoutId);
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