'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AblyService } from '@/lib/ably/ably-service';
import { ArrangementSyncService } from '@/lib/viewer/arrangement-sync-service';
import { ViewerPresenceService } from '@/lib/viewer/viewer-presence-service';
import { ViewerSync } from '@/lib/collaboration/viewer-sync';
import type { ViewerSessionContextType, ViewerSessionState, ViewerIdentity } from '@/types/viewer-session';
import type { ArrangementViewData, ViewerData } from '@/types/viewer';

interface ViewerSessionProviderProps {
  sessionCode: string;
  targetParticipantId: string;
  viewerIdentity: ViewerIdentity;
  children: React.ReactNode;
  config?: {
    enableDebugLogging?: boolean;
    enableMemoryTracking?: boolean;
  };
}

const ViewerSessionContext = createContext<ViewerSessionContextType | undefined>(undefined);

export function ViewerSessionProvider({
  sessionCode,
  targetParticipantId,
  viewerIdentity,
  children,
  config = {}
}: ViewerSessionProviderProps) {
  const router = useRouter();
  
  // Core services (created once)
  const servicesRef = useRef<{
    ably: AblyService | null;
    arrangementSync: ArrangementSyncService | null;
    viewerPresence: ViewerPresenceService | null;
  }>({ ably: null, arrangementSync: null, viewerPresence: null });

  // State
  const [state, setState] = useState<ViewerSessionState>({
    sessionCode,
    viewerIdentity,
    targetParticipantId,
    isConnected: false,
    connectionError: null,
    arrangement: null,
    isArrangementLoading: true,
    arrangementError: null,
    otherViewers: [],
    viewerCount: 0
  });

  // Cleanup function ref
  const cleanupRef = useRef<(() => Promise<void>) | null>(null);

  // Initialize services
  useEffect(() => {
    let isMounted = true;

    const initializeServices = async () => {
      try {
        if (config.enableDebugLogging) {
          console.log(`🚀 [ViewerSession] Initializing for session ${sessionCode}, target ${targetParticipantId}`);
        }

        // Create Ably service
        const ably = new AblyService(process.env.NEXT_PUBLIC_ABLY_KEY!);
        await ably.init();

        if (!isMounted) return;

        // Create arrangement sync service
        const arrangementSync = new ArrangementSyncService(ably, sessionCode);
        await arrangementSync.initialize();

        if (!isMounted) return;

        // Create viewer presence service
        const viewerPresence = new ViewerPresenceService(ably, sessionCode, viewerIdentity);
        await viewerPresence.initialize();

        if (!isMounted) return;

        // Store services
        servicesRef.current = { ably, arrangementSync, viewerPresence };

        // Setup arrangement subscription
        const unsubscribeArrangement = arrangementSync.subscribeToParticipant(
          targetParticipantId,
          (arrangement: ArrangementViewData) => {
            if (config.enableDebugLogging) {
              console.log(`📝 [ViewerSession] Arrangement update:`, arrangement);
            }
            
            setState(prev => ({
              ...prev,
              arrangement,
              isArrangementLoading: false,
              arrangementError: null
            }));
          }
        );

        // Setup viewer presence subscription
        const unsubscribePresence = viewerPresence.subscribeToPresence((viewers: ViewerData[]) => {
          if (config.enableDebugLogging) {
            console.log(`👥 [ViewerSession] Viewers update:`, viewers);
          }
          
          setState(prev => ({
            ...prev,
            otherViewers: viewers,
            viewerCount: viewers.length + 1 // +1 for current viewer
          }));
        });

        // Join viewing session
        await viewerPresence.joinViewing(targetParticipantId);

        if (!isMounted) return;

        // Update connection state
        setState(prev => ({
          ...prev,
          isConnected: true,
          connectionError: null,
          isArrangementLoading: false // Will be set to false when arrangement loads
        }));

        // Setup cleanup function
        cleanupRef.current = async () => {
          if (config.enableDebugLogging) {
            console.log('🧹 [ViewerSession] Cleaning up services');
          }
          
          unsubscribeArrangement();
          unsubscribePresence();
          
          if (servicesRef.current.viewerPresence) {
            await servicesRef.current.viewerPresence.cleanup();
          }
          if (servicesRef.current.arrangementSync) {
            servicesRef.current.arrangementSync.cleanup();
          }
          if (servicesRef.current.ably) {
            await servicesRef.current.ably.destroy();
          }
          
          servicesRef.current = { ably: null, arrangementSync: null, viewerPresence: null };
        };

      } catch (error) {
        console.error('[ViewerSession] Initialization failed:', error);
        
        if (isMounted) {
          setState(prev => ({
            ...prev,
            isConnected: false,
            connectionError: error instanceof Error ? error.message : 'Failed to connect',
            isArrangementLoading: false
          }));
        }
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (cleanupRef.current) {
        cleanupRef.current().catch(console.error);
      }
    };
  }, [sessionCode, targetParticipantId, viewerIdentity, config.enableDebugLogging]);

  // Context methods
  const contextValue = useMemo<ViewerSessionContextType>(() => ({
    ...state,
    
    exitViewer: () => {
      if (config.enableDebugLogging) {
        console.log('🚪 [ViewerSession] Exiting viewer mode');
      }
      
      // Navigate back to main canvas
      const params = new URLSearchParams({
        session: sessionCode,
        name: viewerIdentity.name,
        step: '2' // Default to step 2 where reveals happen
      });
      router.push(`/canvas?${params.toString()}`);
    },

    joinViewer: async () => {
      if (servicesRef.current.viewerPresence) {
        await servicesRef.current.viewerPresence.joinViewing(targetParticipantId);
      }
    },

    leaveViewer: async () => {
      if (servicesRef.current.viewerPresence) {
        await servicesRef.current.viewerPresence.leaveViewing();
      }
    },

    refreshArrangement: async () => {
      if (servicesRef.current.arrangementSync) {
        setState(prev => ({ ...prev, isArrangementLoading: true }));
        
        try {
          const arrangement = await servicesRef.current.arrangementSync!.getCurrentArrangement(targetParticipantId);
          setState(prev => ({
            ...prev,
            arrangement,
            isArrangementLoading: false,
            arrangementError: null
          }));
        } catch (error) {
          setState(prev => ({
            ...prev,
            isArrangementLoading: false,
            arrangementError: error instanceof Error ? error.message : 'Failed to refresh'
          }));
        }
      }
    }
  }), [state, sessionCode, targetParticipantId, viewerIdentity, router, config.enableDebugLogging]);

  // Memory tracking (development only)
  useEffect(() => {
    if (config.enableMemoryTracking && typeof window !== 'undefined') {
      const interval = setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          console.log(`🧠 [ViewerSession] Memory: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
        }
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [config.enableMemoryTracking]);

  return (
    <ViewerSessionContext.Provider value={contextValue}>
      {children}
    </ViewerSessionContext.Provider>
  );
}

export function useViewerSession(): ViewerSessionContextType {
  const context = useContext(ViewerSessionContext);
  if (context === undefined) {
    throw new Error('useViewerSession must be used within a ViewerSessionProvider');
  }
  return context;
}

// Export the context type for testing
export type { ViewerSessionContextType };