import Ably from 'ably';
import type { RealtimeClient, RealtimeChannel } from 'ably';

// Connection states enum
export const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  SUSPENDED: 'suspended',
  CLOSING: 'closing',
  CLOSED: 'closed',
  FAILED: 'failed'
} as const;

export type ConnectionState = typeof CONNECTION_STATES[keyof typeof CONNECTION_STATES];

// Channel types
export type ChannelType = 'session' | 'presence' | 'reveals' | 'viewers' | 'status';

// Message types for each channel
export type SessionMessage = 
  | { type: 'participant-joined'; data: { participantId: string; name: string; timestamp: number } }
  | { type: 'participant-left'; data: { participantId: string; timestamp: number } }
  | { type: 'session-timeout'; data: { warningAt: number; expiresAt: number } };

export type PresenceMessage = 
  | { type: 'cursor-move'; data: { x: number; y: number; participantId: string } }
  | { type: 'presence-update'; data: { participantId: string; status: string; timestamp: number } };

export type RevealsMessage = 
  | { type: 'reveal-cards'; data: { participantId: string; step: number; cards: unknown[]; arrangement: unknown } };

export type ViewersMessage = 
  | { type: 'viewer-joined'; data: { viewerId: string; targetParticipantId: string } }
  | { type: 'viewer-left'; data: { viewerId: string; targetParticipantId: string } };

export type StatusMessage = 
  | { type: 'step-progress'; data: { participantId: string; currentStep: number; completedSteps: number[] } };

export type AblyMessage = SessionMessage | PresenceMessage | RevealsMessage | ViewersMessage | StatusMessage;

// Throttling and debouncing utilities
class MessageHandler {
  private throttledCallbacks = new Map<string, (...args: unknown[]) => void>();
  private debouncedCallbacks = new Map<string, (...args: unknown[]) => void>();

  throttle(key: string, func: (...args: unknown[]) => void, limit: number): (...args: unknown[]) => void {
    if (!this.throttledCallbacks.has(key)) {
      let inThrottle = false;
      const throttledFunc = (...args: unknown[]) => {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => { inThrottle = false; }, limit);
        }
      };
      this.throttledCallbacks.set(key, throttledFunc);
    }
    return this.throttledCallbacks.get(key)!;
  }

  debounce(key: string, func: (...args: unknown[]) => void, delay: number): (...args: unknown[]) => void {
    if (!this.debouncedCallbacks.has(key)) {
      let timeoutId: NodeJS.Timeout;
      const debouncedFunc = (...args: unknown[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
      };
      this.debouncedCallbacks.set(key, debouncedFunc);
    }
    return this.debouncedCallbacks.get(key)!;
  }

  cleanup(): void {
    this.throttledCallbacks.clear();
    this.debouncedCallbacks.clear();
  }
}

// Main Ably service class
export class AblyService {
  private client: RealtimeClient | null = null;
  private channels = new Map<string, RealtimeChannel>();
  private connectionStateListeners = new Set<(state: ConnectionState) => void>();
  private messageHandler = new MessageHandler();
  private isInitialized = false;

  constructor(private apiKey?: string) {
    // Don't initialize immediately - wait for explicit init() call
  }

  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const key = this.apiKey || process.env.NEXT_PUBLIC_ABLY_KEY;
    if (!key) {
      throw new Error('Ably API key not provided. Set NEXT_PUBLIC_ABLY_KEY environment variable.');
    }

    try {
      this.client = new Ably.Realtime({
        key,
        clientId: `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        connectionOptions: {
          heartbeatInterval: 30000, // 30 seconds
          realtimeRequestTimeout: 10000, // 10 seconds
          disconnectedRetryTimeout: 15000, // 15 seconds
        },
        autoConnect: true,
        recover: true, // Recover from connection interruptions
        transportParams: {
          remainPresentFor: 30000, // 30 seconds after disconnect
        }
      });

      this.setupConnectionListeners();
      this.isInitialized = true;

      // Wait for initial connection with proper state verification
      await new Promise<void>((resolve, reject) => {
        if (this.client?.connection.state === 'connected') {
          resolve();
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Ably connection timeout after 10 seconds'));
        }, 10000);

        // Handle successful connection
        const handleConnected = () => {
          clearTimeout(timeout);
          // Verify connection is actually established
          if (this.client?.connection.state === 'connected') {
            resolve();
          } else {
            reject(new Error('Connection established but state verification failed'));
          }
        };

        // Handle connection failure
        const handleFailed = (error: unknown) => {
          clearTimeout(timeout);
          reject(new Error(`Ably connection failed: ${error?.message || 'Unknown error'}`));
        };

        // Handle unexpected disconnection during setup
        const handleDisconnected = () => {
          clearTimeout(timeout);
          reject(new Error('Connection lost during initialization'));
        };

        this.client?.connection.on('connected', handleConnected);
        this.client?.connection.on('failed', handleFailed);
        this.client?.connection.on('disconnected', handleDisconnected);

        // Cleanup listeners after resolution
        const cleanup = () => {
          this.client?.connection.off('connected', handleConnected);
          this.client?.connection.off('failed', handleFailed);
          this.client?.connection.off('disconnected', handleDisconnected);
        };

        // Clean up on both success and failure
        const originalResolve = resolve;
        const originalReject = reject;
        resolve = (...args: unknown[]) => { cleanup(); originalResolve(...args); };
        reject = (...args: unknown[]) => { cleanup(); originalReject(...args); };
      });

    } catch (error) {
      throw new Error(`Failed to initialize Ably: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private setupConnectionListeners(): void {
    if (!this.client) return;

    this.client.connection.on('connected', () => {
      console.log('✅ Ably connected successfully');
      this.notifyConnectionStateListeners('connected');
    });

    this.client.connection.on('disconnected', () => {
      console.warn('⚠️ Ably disconnected');
      this.notifyConnectionStateListeners('disconnected');
    });

    this.client.connection.on('suspended', () => {
      console.warn('⚠️ Ably connection suspended');
      this.notifyConnectionStateListeners('suspended');
    });

    this.client.connection.on('failed', (error) => {
      console.error('❌ Ably connection failed:', error);
      this.notifyConnectionStateListeners('failed');
    });

    this.client.connection.on('connecting', () => {
      console.log('🔄 Ably connecting...');
      this.notifyConnectionStateListeners('connecting');
    });

    this.client.connection.on('closing', () => {
      console.log('🔄 Ably connection closing...');
      this.notifyConnectionStateListeners('closing');
    });

    this.client.connection.on('closed', () => {
      console.log('🔴 Ably connection closed');
      this.notifyConnectionStateListeners('closed');
    });
  }

  private notifyConnectionStateListeners(state: ConnectionState): void {
    this.connectionStateListeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in connection state listener:', error);
      }
    });
  }

  onConnectionStateChange(listener: (state: ConnectionState) => void): () => void {
    this.connectionStateListeners.add(listener);
    
    // Immediately call with current state if connected
    if (this.client?.connection.state) {
      listener(this.client.connection.state as ConnectionState);
    }

    // Return cleanup function
    return () => {
      this.connectionStateListeners.delete(listener);
    };
  }

  getChannel(sessionCode: string, channelType: ChannelType = 'session'): RealtimeChannel {
    if (!this.client) {
      throw new Error('Ably service not initialized. Call init() first.');
    }

    const channelName = `${channelType}:${sessionCode}`;
    
    if (!this.channels.has(channelName)) {
      const channel = this.client.channels.get(channelName);
      this.channels.set(channelName, channel);
      this.setupChannelListeners(channel, channelType);
    }

    return this.channels.get(channelName)!;
  }

  private setupChannelListeners(channel: RealtimeChannel, channelType: ChannelType): void {
    channel.on('attached', () => {
      console.log(`📡 Channel ${channel.name} (${channelType}) attached`);
    });

    channel.on('detached', () => {
      console.log(`📴 Channel ${channel.name} (${channelType}) detached`);
    });

    channel.on('failed', (error) => {
      console.error(`❌ Channel ${channel.name} (${channelType}) failed:`, error);
    });
  }

  // Throttled cursor updates (50ms limit)
  publishCursorMove(sessionCode: string, data: { x: number; y: number; participantId: string }): void {
    const throttledPublish = this.messageHandler.throttle(
      `cursor-${sessionCode}`,
      () => {
        const channel = this.getChannel(sessionCode, 'presence');
        channel.publish('cursor-move', data);
      },
      50 // 20fps max
    );
    throttledPublish();
  }

  // Debounced card position updates (200ms delay)
  publishCardPositions(sessionCode: string, data: unknown): void {
    const debouncedPublish = this.messageHandler.debounce(
      `cards-${sessionCode}`,
      () => {
        const channel = this.getChannel(sessionCode, 'reveals');
        channel.publish('card-positions', data);
      },
      200 // 200ms after last change
    );
    debouncedPublish();
  }

  // Immediate status updates
  publishStatusUpdate(sessionCode: string, data: { participantId: string; currentStep: number; completedSteps: number[] }): void {
    const channel = this.getChannel(sessionCode, 'status');
    channel.publish('step-progress', data);
  }

  // Subscribe to channel messages with type safety
  subscribe<T extends AblyMessage>(
    sessionCode: string, 
    channelType: ChannelType, 
    messageType: T['type'],
    callback: (message: T) => void
  ): () => void {
    const channel = this.getChannel(sessionCode, channelType);
    
    const listener = (message: { name: string; data: unknown }) => {
      if (message.name === messageType) {
        callback({ type: messageType, data: message.data } as T);
      }
    };

    channel.subscribe(messageType, listener);

    // Return unsubscribe function
    return () => {
      channel.unsubscribe(messageType, listener);
    };
  }

  // Subscribe to all messages on a channel
  subscribeAll(
    sessionCode: string, 
    channelType: ChannelType, 
    callback: (message: { name: string; data: unknown }) => void
  ): () => void {
    const channel = this.getChannel(sessionCode, channelType);
    channel.subscribe(callback);

    return () => {
      channel.unsubscribe(callback);
    };
  }

  // Get current connection state
  getConnectionState(): ConnectionState {
    return (this.client?.connection.state as ConnectionState) || 'closed';
  }

  // Check if service is ready for use
  isReady(): boolean {
    return this.isInitialized && this.client?.connection.state === 'connected';
  }

  // Clean disconnect from a session
  async leaveSession(sessionCode: string): Promise<void> {
    const channelNames = Array.from(this.channels.keys()).filter(name => 
      name.endsWith(`:${sessionCode}`)
    );

    // Detach from all channels for this session
    await Promise.all(
      channelNames.map(async (channelName) => {
        const channel = this.channels.get(channelName);
        if (channel) {
          try {
            await channel.detach();
          } catch (error) {
            console.warn(`Failed to detach from channel ${channelName}:`, error);
          }
          this.channels.delete(channelName);
        }
      })
    );
  }

  // Clean shutdown
  async destroy(): Promise<void> {
    if (!this.client) return;

    // Clean up message handlers
    this.messageHandler.cleanup();

    // Clear listeners
    this.connectionStateListeners.clear();

    // Detach from all channels
    await Promise.all(
      Array.from(this.channels.values()).map(async (channel) => {
        try {
          await channel.detach();
        } catch (error) {
          console.warn(`Failed to detach from channel ${channel.name}:`, error);
        }
      })
    );

    this.channels.clear();

    // Close connection
    try {
      this.client.close();
    } catch (error) {
      console.warn('Error closing Ably connection:', error);
    }

    this.client = null;
    this.isInitialized = false;
  }
}

// Singleton instance
let ablyServiceInstance: AblyService | null = null;

export function getAblyService(): AblyService {
  if (!ablyServiceInstance) {
    ablyServiceInstance = new AblyService();
  }
  return ablyServiceInstance;
}

// Cleanup function for testing
export function resetAblyService(): void {
  if (ablyServiceInstance) {
    ablyServiceInstance.destroy();
    ablyServiceInstance = null;
  }
}