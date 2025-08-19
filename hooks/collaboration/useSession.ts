'use client';

import { useState, useEffect, useCallback } from 'react';
import { Session, Participant } from '@/lib/types';
import { SESSION_VALIDATION_ERRORS } from '@/lib/session/session-validator';

export interface UseSessionOptions {
  sessionCode?: string;
  participantName?: string;
  autoJoin?: boolean;
}

export interface SessionError {
  type: 'network' | 'validation' | 'rate_limit' | 'session_expired' | 'session_full' | 'unknown';
  message: string;
  retryAfter?: number;
  recoverable: boolean;
}

export interface SessionState {
  session: Session | null;
  participant: Participant | null;
  isLoading: boolean;
  error: SessionError | null;
  timeRemaining: number | null;
  isWarning: boolean;
  isExpired: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

export interface SessionActions {
  createSession: (config?: any) => Promise<string | null>;
  joinSession: (code: string, name: string) => Promise<boolean>;
  leaveSession: () => Promise<boolean>;
  updateActivity: (currentStep?: number) => Promise<void>;
  extendSession: () => Promise<void>;
  clearError: () => void;
  retry: () => Promise<void>;
}

// Error classification utilities
function classifyError(error: any, response?: Response): SessionError {
  if (!navigator.onLine) {
    return {
      type: 'network',
      message: 'No internet connection. Please check your network and try again.',
      recoverable: true
    };
  }

  if (response) {
    switch (response.status) {
      case 429:
        return {
          type: 'rate_limit',
          message: 'Too many requests. Please wait before trying again.',
          retryAfter: parseInt(response.headers.get('Retry-After') || '60'),
          recoverable: true
        };
      case 404:
        return {
          type: 'validation',
          message: 'Session not found. Please check the session code.',
          recoverable: false
        };
      case 403:
        return {
          type: 'session_full',
          message: 'Session is full. Please try another session.',
          recoverable: false
        };
      case 410:
        return {
          type: 'session_expired',
          message: 'Session has expired. Please start a new session.',
          recoverable: false
        };
      case 400:
        return {
          type: 'validation',
          message: error?.message || 'Invalid request. Please check your input.',
          recoverable: true
        };
      default:
        return {
          type: 'unknown',
          message: `Server error (${response.status}). Please try again.`,
          recoverable: true
        };
    }
  }

  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
    return {
      type: 'network',
      message: 'Network error. Please check your connection and try again.',
      recoverable: true
    };
  }

  return {
    type: 'unknown',
    message: error?.message || 'An unexpected error occurred. Please try again.',
    recoverable: true
  };
}

export function useSession(options: UseSessionOptions = {}): [SessionState, SessionActions] {
  const [state, setState] = useState<SessionState>({
    session: null,
    participant: null,
    isLoading: false,
    error: null,
    timeRemaining: null,
    isWarning: false,
    isExpired: false,
    connectionStatus: 'disconnected'
  });

  // Keep track of the last failed operation for retry functionality
  const [lastFailedOperation, setLastFailedOperation] = useState<(() => Promise<any>) | null>(null);

  // Create a new session
  const createSession = useCallback(async (config?: any): Promise<string | null> => {
    const operation = () => createSession(config);
    setLastFailedOperation(null);
    
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      connectionStatus: 'connected' 
    }));

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config || {})
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          session: data.session,
          isLoading: false,
          connectionStatus: 'connected'
        }));
        return data.sessionCode;
      } else {
        const errorData = await response.json().catch(() => ({}));
        const error = classifyError(errorData, response);
        
        setState(prev => ({
          ...prev,
          error,
          isLoading: false,
          connectionStatus: error.type === 'network' ? 'disconnected' : 'connected'
        }));
        
        if (error.recoverable) {
          setLastFailedOperation(() => operation);
        }
        
        return null;
      }
    } catch (error) {
      const sessionError = classifyError(error);
      setState(prev => ({
        ...prev,
        error: sessionError,
        isLoading: false,
        connectionStatus: 'disconnected'
      }));
      
      if (sessionError.recoverable) {
        setLastFailedOperation(() => operation);
      }
      
      return null;
    }
  }, []);

  // Join an existing session
  const joinSession = useCallback(async (code: string, name: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/sessions/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: name })
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          session: data.session,
          participant: data.participant,
          isLoading: false
        }));
        
        // Start monitoring session timeout
        startTimeoutMonitoring(code);
        
        return true;
      } else {
        const errorData = await response.json();
        setState(prev => ({
          ...prev,
          error: errorData.error || 'Failed to join session',
          isLoading: false
        }));
        return false;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Network error while joining session',
        isLoading: false
      }));
      return false;
    }
  }, []);

  // Leave the current session
  const leaveSession = useCallback(async (): Promise<boolean> => {
    if (!state.session || !state.participant) return false;

    try {
      const response = await fetch(`/api/sessions/${state.session.sessionCode}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: state.participant.id })
      });

      if (response.ok) {
        setState(prev => ({
          ...prev,
          session: null,
          participant: null,
          timeRemaining: null,
          isWarning: false,
          isExpired: false
        }));
        return true;
      } else {
        const errorData = await response.json();
        setState(prev => ({ ...prev, error: errorData.error }));
        return false;
      }
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Network error while leaving session' }));
      return false;
    }
  }, [state.session, state.participant]);

  // Update participant activity
  const updateActivity = useCallback(async (currentStep?: number): Promise<void> => {
    if (!state.session || !state.participant) return;

    try {
      const response = await fetch(`/api/sessions/${state.session.sessionCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: state.participant.id,
          currentStep
        })
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({ ...prev, session: data.session }));
      }
    } catch (error) {
      // Silently fail for activity updates to avoid disrupting UX
      console.warn('Failed to update activity:', error);
    }
  }, [state.session, state.participant]);

  // Extend session timeout
  const extendSession = useCallback(async (): Promise<void> => {
    if (!state.session || !state.participant) return;
    await updateActivity();
  }, [updateActivity]);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
    setLastFailedOperation(null);
  }, []);

  // Retry last failed operation
  const retry = useCallback(async (): Promise<void> => {
    if (lastFailedOperation) {
      setState(prev => ({ ...prev, connectionStatus: 'reconnecting' }));
      try {
        await lastFailedOperation();
        setLastFailedOperation(null);
      } catch (error) {
        // Error will be handled by the individual operation
        console.error('Retry failed:', error);
      }
    }
  }, [lastFailedOperation]);

  // Monitor session timeout
  const startTimeoutMonitoring = useCallback((sessionCode: string) => {
    const checkTimeout = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionCode}`);
        if (response.ok) {
          const data = await response.json();
          const { timeoutInfo } = data;
          
          if (timeoutInfo) {
            setState(prev => ({
              ...prev,
              timeRemaining: timeoutInfo.timeRemaining,
              isWarning: timeoutInfo.isWarning,
              isExpired: timeoutInfo.isExpired
            }));

            if (timeoutInfo.isExpired) {
              setState(prev => ({
                ...prev,
                error: SESSION_VALIDATION_ERRORS.SESSION_EXPIRED,
                session: null,
                participant: null
              }));
              return; // Stop monitoring
            }
          }
        }
      } catch (error) {
        console.warn('Failed to check session timeout:', error);
      }
      
      // Continue monitoring
      setTimeout(checkTimeout, 30000); // Check every 30 seconds
    };

    // Start monitoring after initial delay
    setTimeout(checkTimeout, 30000);
  }, []);

  // Auto-join on mount if options provided
  useEffect(() => {
    if (options.autoJoin && options.sessionCode && options.participantName) {
      joinSession(options.sessionCode, options.participantName);
    }
  }, [options.autoJoin, options.sessionCode, options.participantName, joinSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.session && state.participant) {
        // Don't await - this is cleanup
        leaveSession();
      }
    };
  }, []); // Empty deps - only run on unmount

  const actions: SessionActions = {
    createSession,
    joinSession,
    leaveSession,
    updateActivity,
    extendSession,
    clearError,
    retry
  };

  return [state, actions];
}