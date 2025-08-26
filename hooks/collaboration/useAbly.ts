import { useEffect, useState, useCallback, useRef } from 'react';
import { getAblyService, ConnectionState } from '@/lib/ably/ably-service';
import type { AblyService, ChannelType, AblyMessage } from '@/lib/ably/ably-service';

// Hook return type
interface UseAblyReturn {
  service: AblyService | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  isReady: boolean;
  error: string | null;
  init: () => Promise<void>;
  reconnect: () => Promise<void>;
}

// Hook options
interface UseAblyOptions {
  autoInit?: boolean;
  sessionCode?: string;
}

export function useAbly(options: UseAblyOptions = {}): UseAblyReturn {
  const { autoInit = false, sessionCode } = options;
  
  const [service, setService] = useState<AblyService | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('closed');
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const serviceRef = useRef<AblyService | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Initialize Ably service
  const init = useCallback(async () => {
    if (isInitialized) {
      console.warn('useAbly: Already initialized');
      return;
    }

    try {
      setError(null);
      
      const ablyService = getAblyService();
      serviceRef.current = ablyService;
      
      // Set up connection state listener
      cleanupRef.current = ablyService.onConnectionStateChange((state) => {
        setConnectionState(state);
      });

      await ablyService.init();
      setService(ablyService);
      setIsInitialized(true);
      
      console.log('✅ useAbly: Service initialized successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Ably service';
      setError(errorMessage);
      setConnectionState('failed');
      console.error('❌ useAbly: Initialization failed:', errorMessage);
    }
  }, [isInitialized]);

  // Reconnect functionality
  const reconnect = useCallback(async () => {
    if (!serviceRef.current) {
      await init();
      return;
    }

    try {
      setError(null);
      // The Ably client handles reconnection automatically, 
      // but we can force a reconnect if needed
      if (serviceRef.current.getConnectionState() === 'failed') {
        // Destroy and recreate service for failed connections
        await serviceRef.current.destroy();
        setIsInitialized(false);
        setService(null);
        await init();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reconnect to Ably';
      setError(errorMessage);
      console.error('❌ useAbly: Reconnection failed:', errorMessage);
    }
  }, [init]);

  // Auto-initialize if requested
  useEffect(() => {
    if (autoInit && !isInitialized) {
      init();
    }
    
    // Cleanup on unmount
    return () => {
      if (serviceRef.current && sessionCode) {
        serviceRef.current.leaveSession(sessionCode).catch(console.error);
      }
    };
  }, [autoInit, isInitialized, init, sessionCode]);

  // Cleanup connection state listener on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  // Derived state
  const isConnected = connectionState === 'connected';
  const isReady = service?.isReady() ?? false;

  return {
    service,
    connectionState,
    isConnected,
    isReady,
    error,
    init,
    reconnect
  };
}

// Specialized hook for session-specific Ably usage
export function useAblySession(sessionCode: string) {
  const ablyHook = useAbly({ 
    autoInit: true, 
    sessionCode 
  });

  // Session-specific helper methods
  const publishToSession = useCallback((channelType: ChannelType, messageType: string, data: any) => {
    if (!ablyHook.service || !ablyHook.isReady) {
      console.warn('useAblySession: Service not ready for publishing');
      return;
    }

    const channel = ablyHook.service.getChannel(sessionCode, channelType);
    channel.publish(messageType, data);
  }, [ablyHook.service, ablyHook.isReady, sessionCode]);

  const subscribeToSession = useCallback(<T extends AblyMessage>(
    channelType: ChannelType,
    messageType: T['type'],
    callback: (message: T) => void
  ) => {
    if (!ablyHook.service) {
      console.warn('useAblySession: Service not available for subscription');
      return () => {};
    }

    return ablyHook.service.subscribe(sessionCode, channelType, messageType, callback);
  }, [ablyHook.service, sessionCode]);

  const subscribeToAllMessages = useCallback((
    channelType: ChannelType,
    callback: (message: { name: string; data: any }) => void
  ) => {
    if (!ablyHook.service) {
      console.warn('useAblySession: Service not available for subscription');
      return () => {};
    }

    return ablyHook.service.subscribeAll(sessionCode, channelType, callback);
  }, [ablyHook.service, sessionCode]);

  // Throttled cursor publishing
  const publishCursorMove = useCallback((x: number, y: number, participantId: string) => {
    if (!ablyHook.service || !ablyHook.isReady) return;
    
    ablyHook.service.publishCursorMove(sessionCode, { x, y, participantId });
  }, [ablyHook.service, ablyHook.isReady, sessionCode]);

  // Debounced card position publishing
  const publishCardPositions = useCallback((data: any) => {
    if (!ablyHook.service || !ablyHook.isReady) return;
    
    ablyHook.service.publishCardPositions(sessionCode, data);
  }, [ablyHook.service, ablyHook.isReady, sessionCode]);

  // Immediate status publishing
  const publishStatusUpdate = useCallback((participantId: string, currentStep: number, completedSteps: number[]) => {
    if (!ablyHook.service || !ablyHook.isReady) return;
    
    ablyHook.service.publishStatusUpdate(sessionCode, { participantId, currentStep, completedSteps });
  }, [ablyHook.service, ablyHook.isReady, sessionCode]);

  return {
    ...ablyHook,
    sessionCode,
    publishToSession,
    subscribeToSession,
    subscribeToAllMessages,
    publishCursorMove,
    publishCardPositions,
    publishStatusUpdate
  };
}

// Hook for connection status display
export function useAblyConnectionStatus() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('closed');
  const [lastConnectedAt, setLastConnectedAt] = useState<Date | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    const service = getAblyService();
    
    const cleanup = service.onConnectionStateChange((state) => {
      setConnectionState(state);
      
      if (state === 'connected') {
        setLastConnectedAt(new Date());
        setReconnectAttempts(0);
      } else if (state === 'connecting' || state === 'disconnected') {
        setReconnectAttempts(prev => prev + 1);
      }
    });

    return cleanup;
  }, []);

  // Status indicators
  const isOnline = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';
  const isOffline = ['disconnected', 'suspended', 'failed', 'closed'].includes(connectionState);
  const hasError = connectionState === 'failed';

  // Status message for UI
  const getStatusMessage = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return reconnectAttempts > 0 ? `Reconnecting... (attempt ${reconnectAttempts})` : 'Connecting...';
      case 'disconnected':
        return 'Disconnected - attempting to reconnect';
      case 'suspended':
        return 'Connection suspended - will retry shortly';
      case 'failed':
        return 'Connection failed - check your internet connection';
      case 'closed':
        return 'Not connected';
      default:
        return 'Unknown connection status';
    }
  };

  return {
    connectionState,
    isOnline,
    isConnecting,
    isOffline,
    hasError,
    lastConnectedAt,
    reconnectAttempts,
    statusMessage: getStatusMessage()
  };
}