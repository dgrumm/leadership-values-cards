/**
 * Session Store Context - React Context for SessionStoreManager
 * Provides session-scoped store access to React components
 */

'use client';

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { SessionStoreManager } from '@/lib/stores/session-store-manager';

interface SessionStoreContextValue {
  sessionManager: SessionStoreManager;
  sessionCode: string;
  participantId: string;
}

const SessionStoreContext = createContext<SessionStoreContextValue | null>(null);

interface SessionStoreProviderProps {
  sessionCode: string;
  participantId: string;
  children: ReactNode;
  config?: {
    autoCleanupDelayMs?: number;
    maxStoresPerSession?: number;
    enableMemoryTracking?: boolean;
    enableDebugLogging?: boolean;
  };
}

/**
 * SessionStoreProvider - Provides session-scoped store management to React components
 * 
 * CRITICAL: This provider enables participant state isolation, fixing the production-blocking
 * state bleeding bug where User1 actions affected User2 UI
 * 
 * Usage:
 * ```tsx
 * <SessionStoreProvider sessionCode="ABC123" participantId="user-uuid-456">
 *   <YourApp />
 * </SessionStoreProvider>
 * ```
 */
export const SessionStoreProvider: React.FC<SessionStoreProviderProps> = ({
  sessionCode,
  participantId,
  children,
  config = {}
}) => {
  // Validate required props
  if (!sessionCode || typeof sessionCode !== 'string') {
    throw new Error('SessionStoreProvider: sessionCode is required and must be a non-empty string');
  }
  
  if (!participantId || typeof participantId !== 'string') {
    throw new Error('SessionStoreProvider: participantId is required and must be a non-empty string');
  }

  // Create SessionStoreManager instance (memoized)
  const sessionManager = useMemo(() => {
    const managerConfig = {
      autoCleanupDelayMs: config.autoCleanupDelayMs,
      maxStoresPerSession: config.maxStoresPerSession,
      enableMemoryTracking: config.enableMemoryTracking,
      enableDebugLogging: config.enableDebugLogging
    };
    
    return new SessionStoreManager(managerConfig);
  }, []); // Empty deps - manager is singleton per provider instance

  // Create context value (memoized to prevent unnecessary re-renders)
  const contextValue = useMemo(() => ({
    sessionManager,
    sessionCode,
    participantId
  }), [sessionManager, sessionCode, participantId]);

  // Development debugging
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    React.useEffect(() => {
      console.log(
        `[SessionStoreProvider] Initialized for session ${sessionCode}, participant ${participantId}`
      );
      
      // Add debug tools to window in development
      if (typeof window !== 'undefined') {
        (window as any).debugSessionStore = {
          manager: sessionManager,
          sessionCode,
          participantId,
          logState: () => sessionManager.debugLogState(),
          getStats: () => sessionManager.getMemoryStats()
        };
      }
      
      return () => {
        if (typeof window !== 'undefined') {
          delete (window as any).debugSessionStore;
        }
      };
    }, [sessionManager, sessionCode, participantId]);
  }

  return (
    <SessionStoreContext.Provider value={contextValue}>
      {children}
    </SessionStoreContext.Provider>
  );
};

/**
 * useSessionStoreContext - Hook to access SessionStoreContext
 * 
 * @throws Error if used outside SessionStoreProvider
 * @returns SessionStoreContextValue with sessionManager, sessionCode, participantId
 */
export function useSessionStoreContext(): SessionStoreContextValue {
  const context = useContext(SessionStoreContext);
  
  if (!context) {
    throw new Error(
      'useSessionStoreContext must be used within SessionStoreProvider. ' +
      'Wrap your app with <SessionStoreProvider sessionCode="..." participantId="...">. ' +
      'This is required to prevent state bleeding between participants.'
    );
  }
  
  // Additional validation for context values
  if (!context.sessionCode || !context.participantId) {
    throw new Error(
      'Invalid SessionStoreContext: missing sessionCode or participantId. ' +
      'Ensure SessionStoreProvider is properly configured.'
    );
  }
  
  return context;
}

/**
 * useSessionManager - Hook to access just the SessionStoreManager instance
 * 
 * @returns SessionStoreManager instance
 */
export function useSessionManager(): SessionStoreManager {
  const { sessionManager } = useSessionStoreContext();
  return sessionManager;
}

/**
 * useSessionInfo - Hook to access session and participant information
 * 
 * @returns Object with sessionCode and participantId
 */
export function useSessionInfo(): { sessionCode: string; participantId: string } {
  const { sessionCode, participantId } = useSessionStoreContext();
  return { sessionCode, participantId };
}