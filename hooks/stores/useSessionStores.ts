/**
 * Session-Scoped Store Hooks - Drop-in replacements for global store hooks
 * 
 * CRITICAL: These hooks fix the production-blocking state bleeding bug where
 * User1 actions affected User2 UI by providing isolated state per participant
 * 
 * Usage:
 * ```typescript
 * // OLD (DEPRECATED - causes state bleeding):
 * const { deck, flipNextCard } = useStep1Store();
 * 
 * // NEW (REQUIRED - isolated state):
 * const { deck, flipNextCard } = useSessionStep1Store();
 * ```
 */

'use client';

import { useMemo } from 'react';
import { useSessionStoreContext } from '@/contexts/SessionStoreContext';
import type { Step1Store, Step2Store, Step3Store } from '@/state/local';

/**
 * useSessionStep1Store - Session-scoped Step 1 store hook
 * 
 * Provides complete state isolation between participants in the same session.
 * Each participant gets their own Step1Store instance with independent state.
 * 
 * @returns Step1Store state and actions (identical API to useStep1Store)
 */
export function useSessionStep1Store() {
  const { sessionManager, sessionCode, participantId } = useSessionStoreContext();
  
  // Get or create store instance for this specific session+participant
  const store = useMemo(
    () => sessionManager.getStep1Store(sessionCode, participantId),
    [sessionManager, sessionCode, participantId]
  );
  
  // Use the Zustand store as a hook to get reactive state
  return store();
}

/**
 * useSessionStep2Store - Session-scoped Step 2 store hook
 * 
 * Provides complete state isolation between participants in the same session.
 * Each participant gets their own Step2Store instance with independent state.
 * 
 * @returns Step2Store state and actions (identical API to useStep2Store)
 */
export function useSessionStep2Store() {
  const { sessionManager, sessionCode, participantId } = useSessionStoreContext();
  
  // Get or create store instance for this specific session+participant
  const store = useMemo(
    () => sessionManager.getStep2Store(sessionCode, participantId),
    [sessionManager, sessionCode, participantId]
  );
  
  // Use the Zustand store as a hook to get reactive state
  return store();
}

/**
 * useSessionStep3Store - Session-scoped Step 3 store hook
 * 
 * Provides complete state isolation between participants in the same session.
 * Each participant gets their own Step3Store instance with independent state.
 * 
 * @returns Step3Store state and actions (identical API to useStep3Store)
 */
export function useSessionStep3Store() {
  const { sessionManager, sessionCode, participantId } = useSessionStoreContext();
  
  // Get or create store instance for this specific session+participant
  const store = useMemo(
    () => sessionManager.getStep3Store(sessionCode, participantId),
    [sessionManager, sessionCode, participantId]
  );
  
  // Use the Zustand store as a hook to get reactive state
  return store();
}

/**
 * Development utilities for debugging session-scoped stores
 */
export function useStoreDebugger() {
  const { sessionManager, sessionCode, participantId } = useSessionStoreContext();
  
  // Development-only debugging tools
  if (process.env.NODE_ENV === 'development') {
    return {
      sessionCode,
      participantId,
      getSessionCount: () => sessionManager.getSessionCount(),
      getParticipantCount: () => sessionManager.getParticipantCount(sessionCode),
      getMemoryStats: () => sessionManager.getMemoryStats(),
      debugLogState: () => sessionManager.debugLogState(),
      performCleanup: () => sessionManager.performAutoCleanup()
    };
  }
  
  return null;
}

/**
 * Hook to get the raw store instances (advanced usage)
 * 
 * WARNING: This is for advanced usage only. In most cases, use the individual
 * store hooks above. This hook returns the raw Zustand store instances.
 * 
 * @returns Object with raw store instances
 */
export function useRawSessionStores(): {
  step1Store: Step1Store;
  step2Store: Step2Store;
  step3Store: Step3Store;
} {
  const { sessionManager, sessionCode, participantId } = useSessionStoreContext();
  
  return useMemo(() => ({
    step1Store: sessionManager.getStep1Store(sessionCode, participantId),
    step2Store: sessionManager.getStep2Store(sessionCode, participantId),
    step3Store: sessionManager.getStep3Store(sessionCode, participantId)
  }), [sessionManager, sessionCode, participantId]);
}