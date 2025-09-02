import { 
  BaseEvent, 
  StepTransitionedEvent, 
  ParticipantJoinedEvent,
  createBaseEvent,
  validateEvent,
  generateEventId
} from '@/lib/events/types';

describe('Event Types', () => {
  describe('generateEventId', () => {
    it('should generate unique event IDs', () => {
      const id1 = generateEventId();
      const id2 = generateEventId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^evt_[a-z0-9]+$/);
    });
  });

  describe('createBaseEvent', () => {
    it('should create valid BaseEvent with required fields', () => {
      const event = createBaseEvent({
        type: 'TEST_EVENT',
        sessionCode: 'ABC123',
        participantId: 'user-123'
      });

      expect(event.id).toBeDefined();
      expect(event.type).toBe('TEST_EVENT');
      expect(event.sessionCode).toBe('ABC123');
      expect(event.participantId).toBe('user-123');
      expect(event.timestamp).toBeCloseTo(Date.now(), -2);
      expect(event.version).toBe(1);
    });

    it('should throw error when required fields are missing', () => {
      expect(() => createBaseEvent({
        type: 'TEST_EVENT',
        sessionCode: 'ABC123'
        // participantId missing
      } as any)).toThrow('Missing required field: participantId');
      
      expect(() => createBaseEvent({
        type: 'TEST_EVENT',
        participantId: 'user-123'
        // sessionCode missing
      } as any)).toThrow('Missing required field: sessionCode');
      
      expect(() => createBaseEvent({
        sessionCode: 'ABC123',
        participantId: 'user-123'
        // type missing
      } as any)).toThrow('Missing required field: type');
    });

    it('should validate session code format', () => {
      expect(() => createBaseEvent({
        type: 'TEST_EVENT',
        sessionCode: 'invalid', // must be 6 chars uppercase alphanumeric
        participantId: 'user-123'
      })).toThrow('Invalid session code format');
      
      expect(() => createBaseEvent({
        type: 'TEST_EVENT',
        sessionCode: 'abc123', // must be uppercase
        participantId: 'user-123'
      })).toThrow('Invalid session code format');
    });

    it('should allow custom timestamp and version', () => {
      const customTimestamp = Date.now() - 1000;
      const event = createBaseEvent({
        type: 'TEST_EVENT',
        sessionCode: 'ABC123',
        participantId: 'user-123',
        timestamp: customTimestamp,
        version: 5
      });

      expect(event.timestamp).toBe(customTimestamp);
      expect(event.version).toBe(5);
    });
  });

  describe('validateEvent', () => {
    it('should validate correct BaseEvent structure', () => {
      const validEvent: BaseEvent = {
        id: 'evt_test123',
        type: 'TEST_EVENT',
        sessionCode: 'ABC123',
        participantId: 'user-123',
        timestamp: Date.now(),
        version: 1
      };

      expect(() => validateEvent(validEvent)).not.toThrow();
    });

    it('should reject events with invalid structure', () => {
      expect(() => validateEvent({
        // missing required fields
        id: 'evt_test123',
        type: 'TEST_EVENT'
      } as any)).toThrow('Invalid event structure');
      
      expect(() => validateEvent({
        id: 'invalid-id-format', // wrong format
        type: 'TEST_EVENT',
        sessionCode: 'ABC123',
        participantId: 'user-123',
        timestamp: Date.now(),
        version: 1
      })).toThrow('Invalid event ID format');
    });

    it('should reject events with invalid timestamps', () => {
      expect(() => validateEvent({
        id: 'evt_test123',
        type: 'TEST_EVENT',
        sessionCode: 'ABC123',
        participantId: 'user-123',
        timestamp: -1, // invalid
        version: 1
      })).toThrow('Invalid timestamp');
      
      expect(() => validateEvent({
        id: 'evt_test123',
        type: 'TEST_EVENT',
        sessionCode: 'ABC123',
        participantId: 'user-123',
        timestamp: Date.now() + 60000, // too far in future
        version: 1
      })).toThrow('Timestamp too far in future');
    });
  });

  describe('StepTransitionedEvent', () => {
    it('should create valid step transition event', () => {
      const event: StepTransitionedEvent = {
        id: 'evt_test123',
        type: 'STEP_TRANSITIONED',
        sessionCode: 'ABC123',
        participantId: 'user-123',
        timestamp: Date.now(),
        version: 1,
        payload: {
          fromStep: 1,
          toStep: 2,
          participantName: 'Alice'
        }
      };

      expect(() => validateEvent(event)).not.toThrow();
      expect(event.payload.fromStep).toBe(1);
      expect(event.payload.toStep).toBe(2);
      expect(event.payload.participantName).toBe('Alice');
    });

    it('should reject invalid step values', () => {
      expect(() => validateEvent({
        id: 'evt_test123',
        type: 'STEP_TRANSITIONED',
        sessionCode: 'ABC123',
        participantId: 'user-123',
        timestamp: Date.now(),
        version: 1,
        payload: {
          fromStep: 0, // invalid - must be 1, 2, or 3
          toStep: 2,
          participantName: 'Alice'
        }
      } as StepTransitionedEvent)).toThrow('Invalid step value');
      
      expect(() => validateEvent({
        id: 'evt_test123',
        type: 'STEP_TRANSITIONED',
        sessionCode: 'ABC123',
        participantId: 'user-123',
        timestamp: Date.now(),
        version: 1,
        payload: {
          fromStep: 1,
          toStep: 4, // invalid - must be 1, 2, or 3
          participantName: 'Alice'
        }
      } as StepTransitionedEvent)).toThrow('Invalid step value');
    });
  });

  describe('ParticipantJoinedEvent', () => {
    it('should create valid participant joined event', () => {
      const event: ParticipantJoinedEvent = {
        id: 'evt_test123',
        type: 'PARTICIPANT_JOINED',
        sessionCode: 'ABC123',
        participantId: 'user-123',
        timestamp: Date.now(),
        version: 1,
        payload: {
          participant: {
            participantId: 'user-123',
            name: 'Alice',
            emoji: '🎯',
            color: 'blue',
            joinedAt: new Date(),
            currentStep: 1,
            isActive: true,
            lastActivity: new Date()
          }
        }
      };

      expect(() => validateEvent(event)).not.toThrow();
      expect(event.payload.participant.name).toBe('Alice');
      expect(event.payload.participant.emoji).toBe('🎯');
    });

    it('should reject invalid participant data', () => {
      expect(() => validateEvent({
        id: 'evt_test123',
        type: 'PARTICIPANT_JOINED',
        sessionCode: 'ABC123',
        participantId: 'user-123',
        timestamp: Date.now(),
        version: 1,
        payload: {
          participant: {
            participantId: 'user-123',
            name: '', // invalid - empty name
            emoji: '🎯',
            color: 'blue',
            joinedAt: new Date(),
            currentStep: 1,
            isActive: true,
            lastActivity: new Date()
          }
        }
      } as ParticipantJoinedEvent)).toThrow('Invalid participant name');
    });
  });

  describe('Event serialization', () => {
    it('should serialize and deserialize events correctly', () => {
      const originalEvent = createBaseEvent({
        type: 'TEST_EVENT',
        sessionCode: 'ABC123',
        participantId: 'user-123'
      });

      const serialized = JSON.stringify(originalEvent);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.id).toBe(originalEvent.id);
      expect(deserialized.type).toBe(originalEvent.type);
      expect(deserialized.timestamp).toBe(originalEvent.timestamp);
      
      // Should still be valid after serialization
      expect(() => validateEvent(deserialized)).not.toThrow();
    });

    it('should handle Date objects in payloads', () => {
      const event: ParticipantJoinedEvent = {
        ...createBaseEvent({
          type: 'PARTICIPANT_JOINED',
          sessionCode: 'ABC123',
          participantId: 'user-123'
        }),
        payload: {
          participant: {
            participantId: 'user-123',
            name: 'Alice',
            emoji: '🎯',
            color: 'blue',
            joinedAt: new Date(),
            currentStep: 1,
            isActive: true,
            lastActivity: new Date()
          }
        }
      };

      const serialized = JSON.stringify(event);
      const deserialized = JSON.parse(serialized);
      
      // Dates should be serialized as ISO strings
      expect(typeof deserialized.payload.participant.joinedAt).toBe('string');
      expect(new Date(deserialized.payload.participant.joinedAt)).toBeInstanceOf(Date);
    });
  });
});