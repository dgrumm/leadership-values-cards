// Environment validation and configuration for Ably
export interface AblyConfig {
  apiKey: string;
  clientId?: string;
  environment?: 'sandbox' | 'production';
  connectionOptions: {
    heartbeatInterval: number;
    realtimeRequestTimeout: number;
    disconnectedRetryTimeout: number;
  };
  transportParams: {
    remainPresentFor: number;
  };
}

// Default configuration
const DEFAULT_CONFIG: Omit<AblyConfig, 'apiKey'> = {
  connectionOptions: {
    heartbeatInterval: 30000, // 30 seconds
    realtimeRequestTimeout: 10000, // 10 seconds
    disconnectedRetryTimeout: 15000, // 15 seconds
  },
  transportParams: {
    remainPresentFor: 30000, // 30 seconds after disconnect
  }
};

// Environment validation
export function validateAblyEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for API key
  const apiKey = process.env.NEXT_PUBLIC_ABLY_KEY;
  if (!apiKey) {
    errors.push('NEXT_PUBLIC_ABLY_KEY environment variable is required');
  } else if (!apiKey.startsWith('xVLyHw.') && !apiKey.startsWith('xVNyHw.')) {
    // Basic Ably API key format validation (sandbox starts with xVLyHw, production with xVNyHw)
    errors.push('NEXT_PUBLIC_ABLY_KEY appears to be in invalid format');
  }

  // Check for app URL (optional but recommended)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.warn('NEXT_PUBLIC_APP_URL not set - some features may not work correctly');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Get validated Ably configuration
export function getAblyConfig(overrides?: Partial<AblyConfig>): AblyConfig {
  const validation = validateAblyEnvironment();
  if (!validation.isValid) {
    throw new Error(`Ably environment validation failed: ${validation.errors.join(', ')}`);
  }

  const apiKey = process.env.NEXT_PUBLIC_ABLY_KEY!;
  
  // Additional runtime validation
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_ABLY_KEY is required but not provided');
  }
  
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    throw new Error('NEXT_PUBLIC_ABLY_KEY must be a non-empty string');
  }
  
  // Validate API key format more strictly
  const keyParts = apiKey.split(':');
  if (keyParts.length !== 2) {
    throw new Error('NEXT_PUBLIC_ABLY_KEY must be in format "keyName:keySecret"');
  }
  
  const [keyName, keySecret] = keyParts;
  if (!keyName || !keySecret) {
    throw new Error('NEXT_PUBLIC_ABLY_KEY must contain both keyName and keySecret parts');
  }
  
  if (keySecret.length < 16) {
    throw new Error('NEXT_PUBLIC_ABLY_KEY secret appears to be too short (minimum 16 characters)');
  }

  const config: AblyConfig = {
    ...DEFAULT_CONFIG,
    apiKey,
    clientId: `participant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    environment: apiKey.startsWith('xVLyHw.') ? 'sandbox' : 'production',
    ...overrides
  };

  // Validate final config
  validateFinalConfig(config);

  return config;
}

// Additional validation for the final config
function validateFinalConfig(config: AblyConfig): void {
  if (!config.clientId || config.clientId.length < 5) {
    throw new Error('Generated clientId is invalid');
  }
  
  if (config.connectionOptions.heartbeatInterval < 10000) {
    throw new Error('Heartbeat interval must be at least 10 seconds');
  }
  
  if (config.connectionOptions.realtimeRequestTimeout < 5000) {
    throw new Error('Request timeout must be at least 5 seconds');
  }
  
  console.log(`✅ Ably config validated: ${config.environment} environment, client: ${config.clientId}`);
}

// Connection quality monitoring
export class ConnectionQualityMonitor {
  private latencyHistory: number[] = [];
  private readonly MAX_HISTORY = 10;
  private lastPingTime: number = 0;

  recordLatency(latency: number): void {
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > this.MAX_HISTORY) {
      this.latencyHistory.shift();
    }
  }

  getAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0;
    return this.latencyHistory.reduce((sum, lat) => sum + lat, 0) / this.latencyHistory.length;
  }

  getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const avgLatency = this.getAverageLatency();
    
    if (avgLatency < 100) return 'excellent';
    if (avgLatency < 300) return 'good';
    if (avgLatency < 1000) return 'fair';
    return 'poor';
  }

  getQualityDescription(): string {
    const quality = this.getConnectionQuality();
    const latency = Math.round(this.getAverageLatency());
    
    switch (quality) {
      case 'excellent':
        return `Excellent connection (${latency}ms)`;
      case 'good':
        return `Good connection (${latency}ms)`;
      case 'fair':
        return `Fair connection (${latency}ms) - you may experience some delays`;
      case 'poor':
        return `Poor connection (${latency}ms) - real-time features may be slow`;
    }
  }

  async pingAbly(client: any): Promise<number> {
    const startTime = Date.now();
    this.lastPingTime = startTime;
    
    try {
      // Use Ably's ping method to measure round-trip time
      await client.connection.ping();
      const latency = Date.now() - startTime;
      this.recordLatency(latency);
      return latency;
    } catch (error) {
      console.error('Failed to ping Ably:', error);
      return -1;
    }
  }

  reset(): void {
    this.latencyHistory = [];
    this.lastPingTime = 0;
  }
}

// Error classification for better handling
export enum AblyErrorType {
  INITIALIZATION = 'initialization',
  CONNECTION = 'connection',
  AUTHENTICATION = 'authentication',
  CHANNEL = 'channel',
  RATE_LIMIT = 'rate_limit',
  NETWORK = 'network',
  UNKNOWN = 'unknown'
}

export interface AblyError {
  type: AblyErrorType;
  message: string;
  originalError?: Error;
  code?: number;
  recoverable: boolean;
  retryAfter?: number;
}

export function classifyAblyError(error: any): AblyError {
  if (!error) {
    return {
      type: AblyErrorType.UNKNOWN,
      message: 'Unknown error occurred',
      recoverable: false
    };
  }

  // Ably errors have a code property
  const code = error.code || error.statusCode;
  const message = error.message || 'Unknown error';

  // Common Ably error codes
  switch (code) {
    case 40140:
      return {
        type: AblyErrorType.AUTHENTICATION,
        message: 'Invalid API key or token',
        originalError: error,
        code,
        recoverable: false
      };

    case 40150:
      return {
        type: AblyErrorType.AUTHENTICATION,
        message: 'Token expired',
        originalError: error,
        code,
        recoverable: true,
        retryAfter: 5000
      };

    case 40160:
      return {
        type: AblyErrorType.RATE_LIMIT,
        message: 'Rate limit exceeded',
        originalError: error,
        code,
        recoverable: true,
        retryAfter: 30000
      };

    case 50000:
    case 50001:
    case 50002:
      return {
        type: AblyErrorType.CONNECTION,
        message: 'Connection failed - server error',
        originalError: error,
        code,
        recoverable: true,
        retryAfter: 5000
      };

    case 80000:
    case 80001:
      return {
        type: AblyErrorType.NETWORK,
        message: 'Network connectivity issues',
        originalError: error,
        code,
        recoverable: true,
        retryAfter: 10000
      };

    default:
      // Classify by message content if no specific code
      if (message.toLowerCase().includes('network') || message.toLowerCase().includes('timeout')) {
        return {
          type: AblyErrorType.NETWORK,
          message: `Network error: ${message}`,
          originalError: error,
          code,
          recoverable: true,
          retryAfter: 5000
        };
      }

      if (message.toLowerCase().includes('auth') || message.toLowerCase().includes('key')) {
        return {
          type: AblyErrorType.AUTHENTICATION,
          message: `Authentication error: ${message}`,
          originalError: error,
          code,
          recoverable: false
        };
      }

      return {
        type: AblyErrorType.UNKNOWN,
        message,
        originalError: error,
        code,
        recoverable: false
      };
  }
}

// Recovery strategies
export interface RecoveryStrategy {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export const DEFAULT_RECOVERY_STRATEGIES: Record<AblyErrorType, RecoveryStrategy> = {
  [AblyErrorType.INITIALIZATION]: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  },
  [AblyErrorType.CONNECTION]: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 1.5
  },
  [AblyErrorType.NETWORK]: {
    maxRetries: 10,
    baseDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2
  },
  [AblyErrorType.AUTHENTICATION]: {
    maxRetries: 1, // Don't retry auth errors much
    baseDelay: 5000,
    maxDelay: 5000,
    backoffMultiplier: 1
  },
  [AblyErrorType.RATE_LIMIT]: {
    maxRetries: 3,
    baseDelay: 30000, // Wait longer for rate limits
    maxDelay: 120000,
    backoffMultiplier: 2
  },
  [AblyErrorType.CHANNEL]: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 15000,
    backoffMultiplier: 2
  },
  [AblyErrorType.UNKNOWN]: {
    maxRetries: 2,
    baseDelay: 5000,
    maxDelay: 15000,
    backoffMultiplier: 2
  }
};

export function calculateBackoffDelay(attempt: number, strategy: RecoveryStrategy): number {
  const delay = Math.min(
    strategy.baseDelay * Math.pow(strategy.backoffMultiplier, attempt - 1),
    strategy.maxDelay
  );
  
  // Add some jitter to prevent thundering herd
  const jitter = delay * 0.1 * Math.random();
  return Math.round(delay + jitter);
}