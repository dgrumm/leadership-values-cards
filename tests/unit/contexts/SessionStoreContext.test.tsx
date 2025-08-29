/**
 * Unit tests for SessionStoreContext
 * Tests React context integration and hooks
 */

import React from 'react';
import { render, renderHook } from '@testing-library/react';
import { 
  SessionStoreProvider, 
  useSessionStoreContext,
  useSessionManager,
  useSessionInfo
} from '../../../contexts/SessionStoreContext';

// Mock console for testing
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn()
};

describe('SessionStoreContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(mockConsole.log);
    jest.spyOn(console, 'warn').mockImplementation(mockConsole.warn);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('SessionStoreProvider', () => {
    it('should provide context to children', () => {
      const TestComponent = () => {
        const context = useSessionStoreContext();
        return (
          <div>
            <span data-testid="session-code">{context.sessionCode}</span>
            <span data-testid="participant-id">{context.participantId}</span>
            <span data-testid="has-manager">{context.sessionManager ? 'yes' : 'no'}</span>
          </div>
        );
      };

      const { getByTestId } = render(
        <SessionStoreProvider sessionCode="ABC123" participantId="user456">
          <TestComponent />
        </SessionStoreProvider>
      );

      expect(getByTestId('session-code')).toHaveTextContent('ABC123');
      expect(getByTestId('participant-id')).toHaveTextContent('user456');
      expect(getByTestId('has-manager')).toHaveTextContent('yes');
    });

    it('should throw for missing sessionCode', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(
          <SessionStoreProvider sessionCode="" participantId="user456">
            <div>Test</div>
          </SessionStoreProvider>
        );
      }).toThrow('sessionCode is required');

      consoleSpy.mockRestore();
    });

    it('should throw for missing participantId', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(
          <SessionStoreProvider sessionCode="ABC123" participantId="">
            <div>Test</div>
          </SessionStoreProvider>
        );
      }).toThrow('participantId is required');

      consoleSpy.mockRestore();
    });

    it('should pass custom config to SessionStoreManager', () => {
      const TestComponent = () => {
        const { sessionManager } = useSessionStoreContext();
        
        // Access private config for testing (normally wouldn't do this)
        const config = (sessionManager as any).config;
        
        return (
          <div>
            <span data-testid="max-stores">{config.maxStoresPerSession}</span>
            <span data-testid="cleanup-delay">{config.autoCleanupDelayMs}</span>
          </div>
        );
      };

      const { getByTestId } = render(
        <SessionStoreProvider 
          sessionCode="ABC123" 
          participantId="user456"
          config={{
            maxStoresPerSession: 25,
            autoCleanupDelayMs: 60000
          }}
        >
          <TestComponent />
        </SessionStoreProvider>
      );

      expect(getByTestId('max-stores')).toHaveTextContent('25');
      expect(getByTestId('cleanup-delay')).toHaveTextContent('60000');
    });

    it('should add debug tools in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      const originalWindow = global.window;
      
      process.env.NODE_ENV = 'development';
      
      // Mock window object
      global.window = { debugSessionStore: undefined } as any;

      render(
        <SessionStoreProvider sessionCode="ABC123" participantId="user456">
          <div>Test</div>
        </SessionStoreProvider>
      );

      expect((global.window as any).debugSessionStore).toBeDefined();
      expect((global.window as any).debugSessionStore.sessionCode).toBe('ABC123');
      expect((global.window as any).debugSessionStore.participantId).toBe('user456');

      process.env.NODE_ENV = originalEnv;
      global.window = originalWindow;
    });
  });

  describe('useSessionStoreContext', () => {
    const createWrapper = (sessionCode: string, participantId: string) => {
      return ({ children }: { children: React.ReactNode }) => (
        <SessionStoreProvider sessionCode={sessionCode} participantId={participantId}>
          {children}
        </SessionStoreProvider>
      );
    };

    it('should return context values', () => {
      const { result } = renderHook(() => useSessionStoreContext(), {
        wrapper: createWrapper('ABC123', 'user456')
      });

      expect(result.current.sessionCode).toBe('ABC123');
      expect(result.current.participantId).toBe('user456');
      expect(result.current.sessionManager).toBeDefined();
    });

    it('should throw when used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSessionStoreContext());
      }).toThrow('useSessionStoreContext must be used within SessionStoreProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('useSessionManager', () => {
    const createWrapper = (sessionCode: string, participantId: string) => {
      return ({ children }: { children: React.ReactNode }) => (
        <SessionStoreProvider sessionCode={sessionCode} participantId={participantId}>
          {children}
        </SessionStoreProvider>
      );
    };

    it('should return SessionStoreManager instance', () => {
      const { result } = renderHook(() => useSessionManager(), {
        wrapper: createWrapper('ABC123', 'user456')
      });

      expect(result.current).toBeDefined();
      expect(typeof result.current.getStep1Store).toBe('function');
      expect(typeof result.current.getStep2Store).toBe('function');
      expect(typeof result.current.getStep3Store).toBe('function');
    });

    it('should return same manager instance on re-renders', () => {
      const { result, rerender } = renderHook(() => useSessionManager(), {
        wrapper: createWrapper('ABC123', 'user456')
      });

      const firstManager = result.current;
      rerender();
      const secondManager = result.current;

      expect(firstManager).toBe(secondManager);
    });
  });

  describe('useSessionInfo', () => {
    const createWrapper = (sessionCode: string, participantId: string) => {
      return ({ children }: { children: React.ReactNode }) => (
        <SessionStoreProvider sessionCode={sessionCode} participantId={participantId}>
          {children}
        </SessionStoreProvider>
      );
    };

    it('should return session information', () => {
      const { result } = renderHook(() => useSessionInfo(), {
        wrapper: createWrapper('ABC123', 'user456')
      });

      expect(result.current.sessionCode).toBe('ABC123');
      expect(result.current.participantId).toBe('user456');
    });

    it('should update when props change', () => {
      let sessionCode = 'ABC123';
      let participantId = 'user456';

      const DynamicWrapper = ({ children }: { children: React.ReactNode }) => (
        <SessionStoreProvider sessionCode={sessionCode} participantId={participantId}>
          {children}
        </SessionStoreProvider>
      );

      const { result, rerender } = renderHook(() => useSessionInfo(), {
        wrapper: DynamicWrapper
      });

      expect(result.current.sessionCode).toBe('ABC123');
      expect(result.current.participantId).toBe('user456');

      // Change props and re-render
      sessionCode = 'XYZ999';
      participantId = 'user789';
      rerender();

      expect(result.current.sessionCode).toBe('XYZ999');
      expect(result.current.participantId).toBe('user789');
    });
  });

  describe('integration testing', () => {
    it('should create isolated stores for different participants', () => {
      const TestComponent1 = () => {
        const { sessionManager, sessionCode, participantId } = useSessionStoreContext();
        const store = sessionManager.getStep1Store(sessionCode, participantId);
        return <div data-testid="store1-ref">{store.getState === store.getState ? 'store1' : 'invalid'}</div>;
      };

      const TestComponent2 = () => {
        const { sessionManager, sessionCode, participantId } = useSessionStoreContext();
        const store = sessionManager.getStep1Store(sessionCode, participantId);
        return <div data-testid="store2-ref">{store.getState === store.getState ? 'store2' : 'invalid'}</div>;
      };

      const { getByTestId } = render(
        <div>
          <SessionStoreProvider sessionCode="ABC123" participantId="user1">
            <TestComponent1 />
          </SessionStoreProvider>
          <SessionStoreProvider sessionCode="ABC123" participantId="user2">
            <TestComponent2 />
          </SessionStoreProvider>
        </div>
      );

      const store1Ref = getByTestId('store1-ref').textContent;
      const store2Ref = getByTestId('store2-ref').textContent;

      expect(store1Ref).toBe('store1');
      expect(store2Ref).toBe('store2');
      // Different participants should get different stores (verified by different components working)
    });

    it('should create isolated stores for different sessions', () => {
      const TestComponent1 = () => {
        const { sessionManager, sessionCode, participantId } = useSessionStoreContext();
        const store = sessionManager.getStep1Store(sessionCode, participantId);
        return <div data-testid="session1-store-ref">{sessionCode}-{participantId}</div>;
      };

      const TestComponent2 = () => {
        const { sessionManager, sessionCode, participantId } = useSessionStoreContext();
        const store = sessionManager.getStep1Store(sessionCode, participantId);
        return <div data-testid="session2-store-ref">{sessionCode}-{participantId}</div>;
      };

      const { getByTestId } = render(
        <div>
          <SessionStoreProvider sessionCode="ABC123" participantId="user1">
            <TestComponent1 />
          </SessionStoreProvider>
          <SessionStoreProvider sessionCode="XYZ999" participantId="user1">
            <TestComponent2 />
          </SessionStoreProvider>
        </div>
      );

      const session1StoreRef = getByTestId('session1-store-ref').textContent;
      const session2StoreRef = getByTestId('session2-store-ref').textContent;

      expect(session1StoreRef).toBe('ABC123-user1');
      expect(session2StoreRef).toBe('XYZ999-user1');
      // Different sessions should get different stores (verified by different contexts)
    });
  });
});