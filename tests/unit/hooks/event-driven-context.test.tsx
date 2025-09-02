/**
 * Integration test for EventDrivenSessionContext
 * 
 * Tests that the new event-driven context provides backward compatibility
 * with existing session store hooks to prevent runtime errors.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EventDrivenSessionProvider } from '@/contexts/EventDrivenSessionContext';
import { useSessionStep1Store } from '@/hooks/stores/useSessionStores';

// Mock Ably service
const mockAblyService = {
  getChannel: jest.fn(() => ({
    subscribe: jest.fn(() => jest.fn()),
    publish: jest.fn()
  })),
  subscribe: jest.fn(() => jest.fn()),
  isReady: jest.fn(() => true),
  cleanup: jest.fn()
};

// Mock useAbly hook
jest.mock('@/hooks/collaboration/useAbly', () => ({
  useAbly: jest.fn(() => ({
    service: mockAblyService,
    isConnected: true,
    error: null
  }))
}));

// Test component that uses session stores
function TestComponent() {
  const { deck, flipCard } = useSessionStep1Store();
  
  return (
    <div>
      <div data-testid="deck-length">{deck.length}</div>
      <div data-testid="flip-card-available">{typeof flipCard === 'function' ? 'yes' : 'no'}</div>
    </div>
  );
}

// Test component that should fail without provider
function ComponentWithoutProvider() {
  const { deck } = useSessionStep1Store();
  return <div data-testid="deck-length">{deck.length}</div>;
}

describe('EventDrivenSessionContext Integration', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should provide session store context to child components', async () => {
    const sessionCode = 'TEST01';
    const participantId = 'user-123';
    const participantName = 'Test User';

    render(
      <EventDrivenSessionProvider
        sessionCode={sessionCode}
        participantId={participantId}
        participantName={participantName}
      >
        <TestComponent />
      </EventDrivenSessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('deck-length')).toBeInTheDocument();
      expect(screen.getByTestId('flip-card-available')).toHaveTextContent('yes');
    });
  });

  it('should throw error when useSessionStep1Store is used without provider', () => {
    // Suppress console.error for this test since we expect an error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<ComponentWithoutProvider />);
    }).toThrow('useSessionStoreContext must be used within SessionStoreProvider');

    consoleSpy.mockRestore();
  });

  it('should validate required props', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(
        <EventDrivenSessionProvider
          sessionCode=""
          participantId="user-123"
          participantName="Test User"
        >
          <TestComponent />
        </EventDrivenSessionProvider>
      );
    }).toThrow('sessionCode is required and must be a non-empty string');

    consoleSpy.mockRestore();
  });

  it('should provide backward compatible session store interface', async () => {
    const sessionCode = 'TEST02';
    const participantId = 'user-456';
    const participantName = 'Another User';

    function InterfaceTestComponent() {
      const { sessionManager, sessionCode: ctxSessionCode, participantId: ctxParticipantId } = useSessionStoreContext();
      
      return (
        <div>
          <div data-testid="session-manager">{sessionManager ? 'present' : 'missing'}</div>
          <div data-testid="session-code">{ctxSessionCode}</div>
          <div data-testid="participant-id">{ctxParticipantId}</div>
        </div>
      );
    }

    // We need to import the hook here since it's now in the same file
    const { useSessionStoreContext } = require('@/contexts/EventDrivenSessionContext');

    const TestComponentWithHook = () => {
      const context = useSessionStoreContext();
      return (
        <div>
          <div data-testid="session-manager">{context.sessionManager ? 'present' : 'missing'}</div>
          <div data-testid="session-code">{context.sessionCode}</div>
          <div data-testid="participant-id">{context.participantId}</div>
        </div>
      );
    };

    render(
      <EventDrivenSessionProvider
        sessionCode={sessionCode}
        participantId={participantId}
        participantName={participantName}
      >
        <TestComponentWithHook />
      </EventDrivenSessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('session-manager')).toHaveTextContent('present');
      expect(screen.getByTestId('session-code')).toHaveTextContent(sessionCode);
      expect(screen.getByTestId('participant-id')).toHaveTextContent(participantId);
    });
  });

  it('should initialize event system when connected', () => {
    const sessionCode = 'TEST03';
    const participantId = 'user-789';
    const participantName = 'Event User';

    render(
      <EventDrivenSessionProvider
        sessionCode={sessionCode}
        participantId={participantId}
        participantName={participantName}
        config={{
          enableDebugLogging: false // Disable for cleaner test output
        }}
      >
        <TestComponent />
      </EventDrivenSessionProvider>
    );

    // Verify Ably service is called
    expect(mockAblyService.getChannel).toHaveBeenCalledWith(sessionCode, 'events');
  });
});