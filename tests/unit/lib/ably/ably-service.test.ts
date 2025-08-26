import { getAblyService, resetAblyService, CONNECTION_STATES } from '@/lib/ably/ably-service';
import { validateAblyEnvironment, getAblyConfig, classifyAblyError, AblyErrorType } from '@/lib/ably/config';

// Mock Ably SDK
const mockChannel = {
  publish: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  on: jest.fn(),
  attach: jest.fn(),
  detach: jest.fn(),
  name: 'test-channel'
};

const mockConnection = {
  state: 'connected',
  on: jest.fn((event, callback) => {
    // Simulate immediate connection for most tests
    if (event === 'connected' && mockConnection.state === 'connected') {
      setTimeout(callback, 0);
    }
  }),
  off: jest.fn(),
  ping: jest.fn().mockResolvedValue(undefined)
};

const mockAblyClient = {
  connection: mockConnection,
  channels: {
    get: jest.fn().mockReturnValue(mockChannel)
  },
  close: jest.fn()
};

jest.mock('ably', () => ({
  Realtime: jest.fn().mockImplementation(() => mockAblyClient)
}));

describe('AblyService', () => {
  beforeEach(() => {
    resetAblyService();
    jest.clearAllMocks();
    
    // Mock environment variables with valid format
    process.env.NEXT_PUBLIC_ABLY_KEY = 'xVLyHw.test:mock-api-key-for-testing-with-sufficient-length';
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    resetAblyService();
  });

  describe('Environment Validation', () => {
    it('should validate Ably environment correctly', () => {
      const result = validateAblyEnvironment();
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation without API key', () => {
      delete process.env.NEXT_PUBLIC_ABLY_KEY;
      
      const result = validateAblyEnvironment();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('NEXT_PUBLIC_ABLY_KEY environment variable is required');
    });

    it('should fail validation with invalid API key format', () => {
      process.env.NEXT_PUBLIC_ABLY_KEY = 'invalid-key-format';
      
      const result = validateAblyEnvironment();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('NEXT_PUBLIC_ABLY_KEY appears to be in invalid format');
    });
  });

  describe('Configuration', () => {
    it('should get valid Ably configuration', () => {
      const config = getAblyConfig();
      expect(config.apiKey).toBe('xVLyHw.test:mock-api-key-for-testing-with-sufficient-length');
      expect(config.environment).toBe('sandbox');
      expect(config.connectionOptions.heartbeatInterval).toBe(30000);
    });

    it('should detect production environment from key', () => {
      process.env.NEXT_PUBLIC_ABLY_KEY = 'xVNyHw.test:production-key-with-sufficient-length';
      
      const config = getAblyConfig();
      expect(config.environment).toBe('production');
    });

    it('should validate API key format strictly', () => {
      // Invalid format - missing colon (caught by env validation)
      process.env.NEXT_PUBLIC_ABLY_KEY = 'invalid-key-format';
      expect(() => getAblyConfig()).toThrow('NEXT_PUBLIC_ABLY_KEY appears to be in invalid format');

      // Valid format but invalid parts - empty secret
      process.env.NEXT_PUBLIC_ABLY_KEY = 'xVLyHw.test:';
      expect(() => getAblyConfig()).toThrow('must contain both keyName and keySecret parts');

      // Valid format but invalid parts - secret too short
      process.env.NEXT_PUBLIC_ABLY_KEY = 'xVLyHw.test:short';
      expect(() => getAblyConfig()).toThrow('secret appears to be too short');
    });
  });

  describe('Service Initialization', () => {
    it('should initialize service successfully', async () => {
      const service = getAblyService();
      await service.init();

      expect(service.isReady()).toBe(true);
      expect(service.getConnectionState()).toBe('connected');
    });

    it('should handle initialization with missing API key', async () => {
      delete process.env.NEXT_PUBLIC_ABLY_KEY;
      
      const service = getAblyService();
      await expect(service.init()).rejects.toThrow('Ably API key not provided');
    });

    it('should not reinitialize if already initialized', async () => {
      const service = getAblyService();
      await service.init();
      
      // Try to init again
      await service.init();
      
      // Should only create one client
      expect(require('ably').Realtime).toHaveBeenCalledTimes(1);
    });

    it('should handle connection timeout', async () => {
      // Create a new mock connection that doesn't connect
      const timeoutMockConnection = {
        state: 'connecting',
        on: jest.fn(),
        off: jest.fn()
      };
      
      const timeoutMockClient = {
        connection: timeoutMockConnection,
        channels: { get: jest.fn() },
        close: jest.fn()
      };
      
      // Mock Ably to return our timeout client
      const OriginalAbly = require('ably').Realtime;
      require('ably').Realtime = jest.fn().mockImplementation(() => timeoutMockClient);
      
      const service = getAblyService();
      
      jest.useFakeTimers();
      
      const initPromise = service.init();
      
      // Fast-forward past timeout
      jest.advanceTimersByTime(15000);
      
      await expect(initPromise).rejects.toThrow('Ably connection timeout');
      
      jest.useRealTimers();
      
      // Restore original mock
      require('ably').Realtime = OriginalAbly;
    });
  });

  describe('Channel Management', () => {
    it('should create and manage channels correctly', async () => {
      const service = getAblyService();
      await service.init();

      const sessionChannel = service.getChannel('ABC123', 'session');
      const presenceChannel = service.getChannel('ABC123', 'presence');

      expect(mockAblyClient.channels.get).toHaveBeenCalledWith('session:ABC123');
      expect(mockAblyClient.channels.get).toHaveBeenCalledWith('presence:ABC123');
      expect(sessionChannel).toBe(mockChannel);
      expect(presenceChannel).toBe(mockChannel);
    });

    it('should reuse existing channels', async () => {
      const service = getAblyService();
      await service.init();

      const channel1 = service.getChannel('ABC123', 'session');
      const channel2 = service.getChannel('ABC123', 'session');

      expect(channel1).toBe(channel2);
      expect(mockAblyClient.channels.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message Publishing', () => {
    it('should publish cursor moves with throttling', async () => {
      const service = getAblyService();
      await service.init();

      const cursorData = { x: 100, y: 200, participantId: 'user1' };
      
      // Publish multiple rapid updates
      service.publishCursorMove('ABC123', cursorData);
      service.publishCursorMove('ABC123', { ...cursorData, x: 150 });
      service.publishCursorMove('ABC123', { ...cursorData, x: 200 });

      // Should throttle to only one publish immediately
      expect(mockChannel.publish).toHaveBeenCalledTimes(1);
      expect(mockChannel.publish).toHaveBeenCalledWith('cursor-move', cursorData);
    });

    it('should publish status updates immediately', async () => {
      const service = getAblyService();
      await service.init();

      const statusData = { participantId: 'user1', currentStep: 2, completedSteps: [1] };
      
      service.publishStatusUpdate('ABC123', statusData);

      expect(mockChannel.publish).toHaveBeenCalledWith('step-progress', statusData);
    });
  });

  describe('Subscriptions', () => {
    it('should subscribe to specific message types', async () => {
      const service = getAblyService();
      await service.init();

      const callback = jest.fn();
      const unsubscribe = service.subscribe('ABC123', 'session', 'participant-joined', callback);

      expect(mockChannel.subscribe).toHaveBeenCalledWith('participant-joined', expect.any(Function));
      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe correctly', async () => {
      const service = getAblyService();
      await service.init();

      const callback = jest.fn();
      const unsubscribe = service.subscribe('ABC123', 'session', 'participant-joined', callback);

      unsubscribe();

      expect(mockChannel.unsubscribe).toHaveBeenCalledWith('participant-joined', expect.any(Function));
    });
  });

  describe('Connection State Management', () => {
    it('should handle connection state changes', async () => {
      const service = getAblyService();
      await service.init();
      
      const stateListener = jest.fn();
      service.onConnectionStateChange(stateListener);

      // Should immediately call with current state after adding listener
      expect(stateListener).toHaveBeenCalledWith('connected');
    });

    it('should return connection state cleanup function', async () => {
      const service = getAblyService();
      const stateListener = jest.fn();
      
      const cleanup = service.onConnectionStateChange(stateListener);
      expect(typeof cleanup).toBe('function');
    });
  });

  describe('Session Cleanup', () => {
    it('should clean up session channels', async () => {
      const service = getAblyService();
      await service.init();

      // Create channels for session
      service.getChannel('ABC123', 'session');
      service.getChannel('ABC123', 'presence');
      service.getChannel('DEF456', 'session'); // Different session

      await service.leaveSession('ABC123');

      // Should detach from ABC123 channels but not DEF456
      expect(mockChannel.detach).toHaveBeenCalledTimes(2);
    });
  });

  describe('Service Destruction', () => {
    it('should clean up resources on destroy', async () => {
      const service = getAblyService();
      await service.init();

      service.getChannel('ABC123', 'session');

      await service.destroy();

      expect(mockChannel.detach).toHaveBeenCalled();
      expect(mockAblyClient.close).toHaveBeenCalled();
      expect(service.isReady()).toBe(false);
    });
  });
});

describe('Error Classification', () => {
  it('should classify authentication errors correctly', () => {
    const error = { code: 40140, message: 'Invalid API key' };
    const classified = classifyAblyError(error);

    expect(classified.type).toBe(AblyErrorType.AUTHENTICATION);
    expect(classified.recoverable).toBe(false);
    expect(classified.code).toBe(40140);
  });

  it('should classify rate limit errors correctly', () => {
    const error = { code: 40160, message: 'Rate limit exceeded' };
    const classified = classifyAblyError(error);

    expect(classified.type).toBe(AblyErrorType.RATE_LIMIT);
    expect(classified.recoverable).toBe(true);
    expect(classified.retryAfter).toBe(30000);
  });

  it('should classify network errors correctly', () => {
    const error = { message: 'Network timeout occurred' };
    const classified = classifyAblyError(error);

    expect(classified.type).toBe(AblyErrorType.NETWORK);
    expect(classified.recoverable).toBe(true);
    expect(classified.retryAfter).toBe(5000);
  });

  it('should handle unknown errors gracefully', () => {
    const error = { code: 99999, message: 'Unknown error' };
    const classified = classifyAblyError(error);

    expect(classified.type).toBe(AblyErrorType.UNKNOWN);
    expect(classified.message).toBe('Unknown error');
  });

  it('should handle null/undefined errors', () => {
    const classified = classifyAblyError(null);

    expect(classified.type).toBe(AblyErrorType.UNKNOWN);
    expect(classified.message).toBe('Unknown error occurred');
    expect(classified.recoverable).toBe(false);
  });
});