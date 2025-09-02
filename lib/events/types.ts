import { Participant } from '@/lib/types/participant';
import { 
  EventValidationError,
  validateSessionCode,
  validateEventId,
  validateTimestamp,
  validateStepValue,
  validateRequiredString,
  validateRequiredFields
} from './validation';

// Base event interface - all events extend this
export interface BaseEvent {
  id: string;
  type: string;
  sessionCode: string;
  participantId: string;
  timestamp: number;
  version: number;
}

// Event type constants for type safety
export const EVENT_TYPES = {
  STEP_TRANSITIONED: 'STEP_TRANSITIONED',
  PARTICIPANT_JOINED: 'PARTICIPANT_JOINED',
  PARTICIPANT_LEFT: 'PARTICIPANT_LEFT',
  CARD_MOVED: 'CARD_MOVED',
  SELECTION_REVEALED: 'SELECTION_REVEALED',
  SELECTION_UNREVEALED: 'SELECTION_UNREVEALED',
  ARRANGEMENT_UPDATED: 'ARRANGEMENT_UPDATED',
  VIEWER_JOINED: 'VIEWER_JOINED',
  VIEWER_LEFT: 'VIEWER_LEFT'
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// Step values as const for type safety
export type StepValue = 1 | 2 | 3;

// Step transition event
export interface StepTransitionedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.STEP_TRANSITIONED;
  payload: {
    fromStep: StepValue;
    toStep: StepValue;
    participantName: string;
  };
}

// Participant joined event
export interface ParticipantJoinedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.PARTICIPANT_JOINED;
  payload: {
    participant: Participant;
  };
}

// Participant left event
export interface ParticipantLeftEvent extends BaseEvent {
  type: typeof EVENT_TYPES.PARTICIPANT_LEFT;
  payload: {
    participantName: string;
    leftAt: string;
  };
}

// Selection revealed event
export interface SelectionRevealedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.SELECTION_REVEALED;
  payload: {
    revealType: 'top8' | 'top3';
    cardPositions: Array<{
      cardId: string;
      x: number;
      y: number;
      pile: string;
    }>;
    participantName: string;
  };
}

// Selection unrevealed event
export interface SelectionUnrevealedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.SELECTION_UNREVEALED;
  payload: {
    revealType: 'top8' | 'top3';
    participantName: string;
  };
}

// Arrangement updated event (for live sync during reveal)
export interface ArrangementUpdatedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.ARRANGEMENT_UPDATED;
  payload: {
    revealType: 'top8' | 'top3';
    cardPositions: Array<{
      cardId: string;
      x: number;
      y: number;
      pile: string;
    }>;
    participantName: string;
  };
}

// Viewer joined event
export interface ViewerJoinedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.VIEWER_JOINED;
  payload: {
    targetParticipantId: string;
    viewerName: string;
  };
}

// Viewer left event
export interface ViewerLeftEvent extends BaseEvent {
  type: typeof EVENT_TYPES.VIEWER_LEFT;
  payload: {
    targetParticipantId: string;
    viewerName: string;
  };
}

// Union type for all events
export type Event = BaseEvent | StepTransitionedEvent | ParticipantJoinedEvent | ParticipantLeftEvent | 
  SelectionRevealedEvent | SelectionUnrevealedEvent | ArrangementUpdatedEvent | 
  ViewerJoinedEvent | ViewerLeftEvent;

// Event creation parameters
export interface CreateEventParams {
  type: string;
  sessionCode: string;
  participantId: string;
  timestamp?: number;
  version?: number;
}

// Event creation and validation functions

export function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `evt_${timestamp}${random}`;
}

export function createBaseEvent(params: CreateEventParams): BaseEvent {
  // Validate required fields individually for specific error messages
  if (!params.type) {
    throw new EventValidationError('Missing required field: type');
  }
  if (!params.sessionCode) {
    throw new EventValidationError('Missing required field: sessionCode');
  }
  if (!params.participantId) {
    throw new EventValidationError('Missing required field: participantId');
  }
  
  validateSessionCode(params.sessionCode);

  return {
    id: generateEventId(),
    type: params.type,
    sessionCode: params.sessionCode,
    participantId: params.participantId,
    timestamp: params.timestamp ?? Date.now(),
    version: params.version ?? 1
  };
}

export function validateEvent(event: unknown): void {
  try {
    // Validate base event structure
    const requiredFields = ['id', 'type', 'sessionCode', 'participantId', 'timestamp', 'version'];
    validateRequiredFields(event, requiredFields);
    
    validateEventId(event.id);
    validateTimestamp(event.timestamp);
    validateSessionCode(event.sessionCode);
    validateRequiredString(event.participantId, 'participantId');

    // Type-specific validations
    switch (event.type) {
      case EVENT_TYPES.STEP_TRANSITIONED:
        validateStepTransitionedEvent(event);
        break;
      case EVENT_TYPES.PARTICIPANT_JOINED:
        validateParticipantJoinedEvent(event);
        break;
      case EVENT_TYPES.SELECTION_REVEALED:
        validateSelectionRevealedEvent(event);
        break;
      case EVENT_TYPES.SELECTION_UNREVEALED:
        validateSelectionUnrevealedEvent(event);
        break;
      case EVENT_TYPES.ARRANGEMENT_UPDATED:
        validateArrangementUpdatedEvent(event);
        break;
      case EVENT_TYPES.VIEWER_JOINED:
        validateViewerJoinedEvent(event);
        break;
      case EVENT_TYPES.VIEWER_LEFT:
        validateViewerLeftEvent(event);
        break;
    }
  } catch (error) {
    if (error instanceof EventValidationError) {
      throw error;
    }
    // Convert generic errors to EventValidationError for consistency
    throw new EventValidationError(error instanceof Error ? error.message : 'Invalid event structure');
  }
}

function validateStepTransitionedEvent(event: StepTransitionedEvent): void {
  if (!event.payload) {
    throw new EventValidationError('Missing payload', 'payload');
  }

  validateStepValue(event.payload.fromStep, 'fromStep');
  validateStepValue(event.payload.toStep, 'toStep');
  validateRequiredString(event.payload.participantName, 'participantName');
}

function validateParticipantJoinedEvent(event: ParticipantJoinedEvent): void {
  if (!event.payload || !event.payload.participant) {
    throw new EventValidationError('Missing participant payload', 'payload');
  }

  const participant = event.payload.participant;
  validateRequiredString(participant.name, 'participant.name');
  validateRequiredString(participant.id, 'participant.id');
}

function validateSelectionRevealedEvent(event: SelectionRevealedEvent): void {
  if (!event.payload) {
    throw new EventValidationError('Missing payload', 'payload');
  }

  const { revealType, cardPositions, participantName } = event.payload;
  
  if (revealType !== 'top8' && revealType !== 'top3') {
    throw new EventValidationError('Invalid revealType, must be "top8" or "top3"', 'revealType');
  }
  
  validateRequiredString(participantName, 'participantName');
  
  if (!Array.isArray(cardPositions)) {
    throw new EventValidationError('cardPositions must be an array', 'cardPositions');
  }
  
  cardPositions.forEach((position, index) => {
    validateRequiredString(position.cardId, `cardPositions[${index}].cardId`);
    validateRequiredString(position.pile, `cardPositions[${index}].pile`);
    if (typeof position.x !== 'number') {
      throw new EventValidationError(`cardPositions[${index}].x must be a number`, `cardPositions[${index}].x`);
    }
    if (typeof position.y !== 'number') {
      throw new EventValidationError(`cardPositions[${index}].y must be a number`, `cardPositions[${index}].y`);
    }
  });
}

function validateSelectionUnrevealedEvent(event: SelectionUnrevealedEvent): void {
  if (!event.payload) {
    throw new EventValidationError('Missing payload', 'payload');
  }

  const { revealType, participantName } = event.payload;
  
  if (revealType !== 'top8' && revealType !== 'top3') {
    throw new EventValidationError('Invalid revealType, must be "top8" or "top3"', 'revealType');
  }
  
  validateRequiredString(participantName, 'participantName');
}

function validateArrangementUpdatedEvent(event: ArrangementUpdatedEvent): void {
  // Same validation as SelectionRevealedEvent
  validateSelectionRevealedEvent(event as SelectionRevealedEvent);
}

function validateViewerJoinedEvent(event: ViewerJoinedEvent): void {
  if (!event.payload) {
    throw new EventValidationError('Missing payload', 'payload');
  }

  const { targetParticipantId, viewerName } = event.payload;
  
  validateRequiredString(targetParticipantId, 'targetParticipantId');
  validateRequiredString(viewerName, 'viewerName');
}

function validateViewerLeftEvent(event: ViewerLeftEvent): void {
  if (!event.payload) {
    throw new EventValidationError('Missing payload', 'payload');
  }

  const { targetParticipantId, viewerName } = event.payload;
  
  validateRequiredString(targetParticipantId, 'targetParticipantId');
  validateRequiredString(viewerName, 'viewerName');
}