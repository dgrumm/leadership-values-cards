/**
 * Integration test for reveal mechanism event flow
 * Tests the complete flow from RevealManager to EventBus to other participants
 */

import { RevealManager } from '@/lib/reveals/reveal-manager';
import { EventBus } from '@/lib/events/event-bus';
import { EVENT_TYPES } from '@/lib/events/types';

// Mock Ably service for integration testing
const createMockAblyService = () => {
  const subscribers = new Map<string, Array<(message: any) => void>>();
  
  return {
    getChannel: jest.fn().mockReturnValue({
      publish: jest.fn().mockImplementation(async (eventType: string, data: any) => {
        // Simulate publishing by calling all subscribers
        const eventSubscribers = subscribers.get(eventType) || [];
        const allSubscribers = subscribers.get('all') || [];
        
        const message = { name: eventType, data };
        
        // Call specific event subscribers
        eventSubscribers.forEach(callback => callback(message));
        // Call general subscribers  
        allSubscribers.forEach(callback => callback(message));
        
        return Promise.resolve();
      }),
      subscribe: jest.fn().mockImplementation((eventTypeOrCallback: string | Function, callback?: Function) => {
        let eventType: string;
        let actualCallback: Function;
        
        if (typeof eventTypeOrCallback === 'string') {
          eventType = eventTypeOrCallback;
          actualCallback = callback!;
        } else {
          eventType = 'all';
          actualCallback = eventTypeOrCallback;
        }
        
        if (!subscribers.has(eventType)) {
          subscribers.set(eventType, []);
        }
        subscribers.get(eventType)!.push(actualCallback);
        
        // Return unsubscribe function
        return () => {
          const subs = subscribers.get(eventType);
          if (subs) {
            const index = subs.indexOf(actualCallback);
            if (index > -1) {
              subs.splice(index, 1);
            }
          }
        };
      }),
    }),
    isReady: jest.fn().mockReturnValue(true),
    cleanup: jest.fn(),
  };
};

describe('Reveal Event Flow Integration', () => {
  let mockAblyService: any;
  let eventBus1: EventBus;
  let eventBus2: EventBus;
  let revealManager1: RevealManager;
  let revealManager2: RevealManager;
  
  const sessionCode = 'TST123';
  const participant1 = { id: 'user-1', name: 'Alice' };
  const participant2 = { id: 'user-2', name: 'Bob' };
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockAblyService = createMockAblyService();
    
    // Create event buses for two participants
    eventBus1 = new EventBus(mockAblyService, sessionCode);
    eventBus2 = new EventBus(mockAblyService, sessionCode);
    
    // Create reveal managers
    revealManager1 = new RevealManager(eventBus1, sessionCode, participant1.id, participant1.name);
    revealManager2 = new RevealManager(eventBus2, sessionCode, participant2.id, participant2.name);
  });
  
  afterEach(() => {
    revealManager1.cleanup();
    revealManager2.cleanup();
    eventBus1.cleanup();
    eventBus2.cleanup();
  });

  test('should allow participant to reveal selection and notify others', async () => {
    const cardPositions = [
      { cardId: 'card-1', x: 100, y: 200, pile: 'top8' },
      { cardId: 'card-2', x: 150, y: 200, pile: 'top8' },
    ];

    // Alice reveals her Top 8
    await revealManager1.revealSelection('top8', cardPositions);

    // Verify Alice knows she's revealed
    expect(revealManager1.isRevealed('top8')).toBe(true);
    expect(revealManager1.isRevealed('top3')).toBe(false);

    // Wait for event propagation (simulated)
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify Bob can see Alice's reveal
    const aliceReveal = revealManager2.getRevealState(participant1.id);
    expect(aliceReveal).toBeDefined();
    expect(aliceReveal!.revealType).toBe('top8');
    expect(aliceReveal!.isRevealed).toBe(true);
    expect(aliceReveal!.cardPositions).toEqual(cardPositions);
  });

  test('should handle viewer joining and leaving', async () => {
    // Alice reveals first
    await revealManager1.revealSelection('top8', [
      { cardId: 'card-1', x: 100, y: 200, pile: 'top8' }
    ]);

    // Wait for reveal to propagate
    await new Promise(resolve => setTimeout(resolve, 10));

    // Bob joins as viewer
    await revealManager2.joinViewer(participant1.id);

    // Wait for viewer event to propagate
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify Alice sees Bob as viewer
    expect(revealManager1.getViewerCount(participant1.id)).toBe(1);
    expect(revealManager1.getViewers(participant1.id)).toContain(participant2.id);

    // Bob leaves as viewer
    await revealManager2.leaveViewer(participant1.id);

    // Wait for leave event to propagate
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify viewer is removed
    expect(revealManager1.getViewerCount(participant1.id)).toBe(0);
    expect(revealManager1.getViewers(participant1.id)).not.toContain(participant2.id);
  });

  test('should handle arrangement updates during reveal', async () => {
    // Alice reveals initial arrangement
    const initialPositions = [
      { cardId: 'card-1', x: 100, y: 200, pile: 'top8' },
      { cardId: 'card-2', x: 150, y: 200, pile: 'top8' },
    ];

    await revealManager1.revealSelection('top8', initialPositions);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Alice updates her arrangement
    const updatedPositions = [
      { cardId: 'card-1', x: 200, y: 300, pile: 'top8' },
      { cardId: 'card-2', x: 250, y: 300, pile: 'top8' },
    ];

    await revealManager1.updateArrangement('top8', updatedPositions);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Bob should see the updated arrangement
    const aliceReveal = revealManager2.getRevealState(participant1.id);
    expect(aliceReveal).toBeDefined();
    expect(aliceReveal!.cardPositions).toEqual(updatedPositions);
  });

  test('should handle unreveal functionality', async () => {
    // Alice reveals
    await revealManager1.revealSelection('top8', [
      { cardId: 'card-1', x: 100, y: 200, pile: 'top8' }
    ]);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify Bob can see it
    expect(revealManager2.getRevealState(participant1.id)).toBeDefined();

    // Alice unreveals
    await revealManager1.unrevealSelection('top8');
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify Alice is no longer revealed
    expect(revealManager1.isRevealed('top8')).toBe(false);

    // Verify Bob can no longer see it
    expect(revealManager2.getRevealState(participant1.id)).toBeUndefined();
  });

  test('should handle multiple participants revealing different steps', async () => {
    // Alice reveals Top 8
    await revealManager1.revealSelection('top8', [
      { cardId: 'card-1', x: 100, y: 200, pile: 'top8' }
    ]);

    // Bob reveals Top 3
    await revealManager2.revealSelection('top3', [
      { cardId: 'card-2', x: 300, y: 400, pile: 'top3' }
    ]);

    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify both can see each other's reveals
    const aliceReveals = revealManager2.getRevealedParticipants();
    const bobReveals = revealManager1.getRevealedParticipants();

    expect(aliceReveals).toHaveLength(2); // Alice's top8 + Bob's top3
    expect(bobReveals).toHaveLength(2);   // Alice's top8 + Bob's top3

    // Verify specific reveal types
    const aliceRevealFromBob = revealManager2.getRevealState(participant1.id);
    const bobRevealFromAlice = revealManager1.getRevealState(participant2.id);

    expect(aliceRevealFromBob?.revealType).toBe('top8');
    expect(bobRevealFromAlice?.revealType).toBe('top3');
  });

  test('should validate reveal events properly', async () => {
    // Try to reveal with invalid card positions
    const invalidPositions = [
      { cardId: '', x: NaN, y: undefined, pile: '' } as any
    ];

    // Should throw validation error
    await expect(revealManager1.revealSelection('top8', invalidPositions))
      .rejects.toThrow();

    // Verify no reveal was created
    expect(revealManager1.isRevealed('top8')).toBe(false);
  });

  test('should handle session isolation', async () => {
    // Create a manager for different session
    const eventBus3 = new EventBus(mockAblyService, 'DIFF01');
    const revealManager3 = new RevealManager(eventBus3, 'DIFF01', 'user-3', 'Charlie');

    // Alice reveals in her session
    await revealManager1.revealSelection('top8', [
      { cardId: 'card-1', x: 100, y: 200, pile: 'top8' }
    ]);

    await new Promise(resolve => setTimeout(resolve, 10));

    // Charlie in different session should not see Alice's reveal
    expect(revealManager3.getRevealState(participant1.id)).toBeUndefined();
    expect(revealManager3.getRevealedParticipants()).toHaveLength(0);

    revealManager3.cleanup();
    eventBus3.cleanup();
  });

  test('should handle error scenarios gracefully', async () => {
    // Test error when trying to update non-revealed arrangement
    await expect(revealManager1.updateArrangement('top8', []))
      .rejects.toThrow('Cannot update arrangement - not currently revealed');

    // Test error when trying to join viewer for non-revealed participant
    await expect(revealManager2.joinViewer('non-existent-participant'))
      .rejects.toThrow('Target participant has not revealed their selection');

    // Test error after cleanup
    revealManager1.cleanup();
    await expect(revealManager1.revealSelection('top8', []))
      .rejects.toThrow('RevealManager has been cleaned up');
  });
});

// Performance and stress tests
describe('Reveal Mechanism Performance', () => {
  test('should handle many simultaneous reveals efficiently', async () => {
    const mockAblyService = createMockAblyService();
    const sessionCode = 'PERF01';
    
    // Create multiple participants
    const participants = Array.from({ length: 10 }, (_, i) => ({
      id: `user-${i}`,
      name: `User ${i}`,
      eventBus: new EventBus(mockAblyService, sessionCode),
      revealManager: null as any
    }));

    // Initialize reveal managers
    participants.forEach(participant => {
      participant.revealManager = new RevealManager(
        participant.eventBus, 
        sessionCode, 
        participant.id, 
        participant.name
      );
    });

    const startTime = Date.now();

    // All participants reveal simultaneously
    await Promise.all(
      participants.map((participant, index) =>
        participant.revealManager.revealSelection('top8', [
          { cardId: `card-${index}`, x: index * 100, y: 200, pile: 'top8' }
        ])
      )
    );

    const revealTime = Date.now() - startTime;

    // Wait for propagation
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify all reveals are visible to all participants
    participants.forEach(participant => {
      const reveals = participant.revealManager.getRevealedParticipants();
      expect(reveals).toHaveLength(10); // Should see all 10 reveals
    });

    // Performance assertion (should complete within reasonable time)
    expect(revealTime).toBeLessThan(1000); // Less than 1 second

    // Cleanup
    participants.forEach(participant => {
      participant.revealManager.cleanup();
      participant.eventBus.cleanup();
    });

    console.log(`✅ 10 simultaneous reveals completed in ${revealTime}ms`);
  });
});