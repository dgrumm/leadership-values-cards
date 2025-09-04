'use client';

import React, { createContext, useContext, useRef, useEffect } from 'react';
import { ViewerSync } from '@/lib/collaboration/viewer-sync';
import { getAblyService } from '@/lib/ably/ably-service';

interface ViewerSyncContextType {
  viewerSync: ViewerSync | null;
}

const ViewerSyncContext = createContext<ViewerSyncContextType>({
  viewerSync: null
});

interface ViewerSyncProviderProps {
  sessionCode: string;
  children: React.ReactNode;
}

export function ViewerSyncProvider({ sessionCode, children }: ViewerSyncProviderProps) {
  const viewerSyncRef = useRef<ViewerSync | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const initializeViewerSync = async () => {
      try {
        const ablyService = getAblyService();
        
        const viewerSync = new ViewerSync({
          sessionCode,
          ablyService,
          onArrangementUpdate: () => {}, // No-op at provider level
          onArrangementRemoved: () => {}  // Individual hooks handle their own updates
        });

        await viewerSync.initialize();
        
        if (mounted) {
          viewerSyncRef.current = viewerSync;
        }
      } catch (error) {
        console.error('[ViewerSyncProvider] Failed to initialize:', error);
      }
    };

    initializeViewerSync();

    return () => {
      mounted = false;
      if (viewerSyncRef.current) {
        viewerSyncRef.current.destroy();
        viewerSyncRef.current = null;
      }
    };
  }, [sessionCode]);

  const contextValue: ViewerSyncContextType = {
    viewerSync: viewerSyncRef.current
  };

  return (
    <ViewerSyncContext.Provider value={contextValue}>
      {children}
    </ViewerSyncContext.Provider>
  );
}

export function useViewerSyncContext(): ViewerSyncContextType {
  const context = useContext(ViewerSyncContext);
  if (!context) {
    throw new Error('useViewerSyncContext must be used within a ViewerSyncProvider');
  }
  return context;
}