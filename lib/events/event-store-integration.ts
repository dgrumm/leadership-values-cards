import { SessionStoreManager } from '@/lib/stores/session-store-manager';
import { EventBus } from './event-bus';
import { 
  BaseEvent, 
  StepTransitionedEvent, 
  ParticipantJoinedEvent,
  EVENT_TYPES,
  validateEvent
} from './types';

// Error handler type for integration errors
type ErrorHandler = (error: Error) => void;

/**
 * EventStoreIntegration - Connects event system to Zustand stores
 * Handles event processing and store updates while maintaining isolation
 */
export class EventStoreIntegration {
  private storeManager: SessionStoreManager;
  private eventBus: EventBus;
  private sessionCode: string;
  private errorHandlers = new Set<ErrorHandler>();
  private unsubscribeFunctions: Array<() => void> = [];
  private isInitialized = false;
  private isCleanedUp = false;

  constructor(storeManager: SessionStoreManager, eventBus: EventBus, sessionCode: string) {
    this.storeManager = storeManager;
    this.eventBus = eventBus;
    this.sessionCode = sessionCode;
  }

  /**
   * Initialize event subscriptions and start processing events
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    if (this.isCleanedUp) {
      throw new Error('Cannot initialize after cleanup');
    }

    try {
      // Subscribe to all events
      const unsubscribeAll = this.eventBus.subscribeToEvents((event) => {
        this.processEvent(event);
      });
      this.unsubscribeFunctions.push(unsubscribeAll);

      // Subscribe to specific error handling
      this.eventBus.onError((error) => {
        this.triggerError(new Error(`EventBus error: ${error.message}`));
      });

      this.isInitialized = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to initialize event store integration: ${message}`);
    }
  }

  /**
   * Add error handler for integration errors
   */
  onError(handler: ErrorHandler): void {
    this.errorHandlers.add(handler);
  }

  /**
   * Process incoming event and update appropriate stores
   */
  processEvent(event: BaseEvent): void {
    if (this.isCleanedUp) {
      return; // Ignore events after cleanup
    }

    try {
      // Validate event structure
      validateEvent(event);

      // Validate session code matches
      if (event.sessionCode !== this.sessionCode) {
        // Silently ignore events from other sessions
        return;
      }

      // Route event to appropriate handler
      switch (event.type) {
        case EVENT_TYPES.STEP_TRANSITIONED:
          this.handleStepTransitionEvent(event as StepTransitionedEvent);
          break;
        case EVENT_TYPES.PARTICIPANT_JOINED:
          this.handleParticipantJoinedEvent(event as ParticipantJoinedEvent);
          break;
        default:
          // Unknown event type - log but don't crash
          console.warn(`Unknown event type: ${event.type}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.triggerError(new Error(`Failed to process event: ${message}`));
    }
  }

  /**
   * Handle step transition events
   */
  handleStepTransitionEvent(event: StepTransitionedEvent): void {
    try {
      const { participantId } = event;
      const { fromStep, toStep } = event.payload;

      if (fromStep === 1 && toStep === 2) {
        // Transition from step 1 to step 2
        const step1Store = this.storeManager.getStep1Store(this.sessionCode, participantId);
        const step2Store = this.storeManager.getStep2Store(this.sessionCode, participantId);
        
        const step1State = step1Store.getState();
        
        // Initialize step 2 with step 1 data
        step2Store.getState().initializeFromStep1(
          step1State.moreImportantPile,
          step1State.lessImportantPile
        );
      } else if (fromStep === 2 && toStep === 3) {
        // Transition from step 2 to step 3
        const step2Store = this.storeManager.getStep2Store(this.sessionCode, participantId);
        const step3Store = this.storeManager.getStep3Store(this.sessionCode, participantId);
        
        const step2State = step2Store.getState();
        
        // Initialize step 3 with step 2 data
        step3Store.getState().initializeFromStep2(
          step2State.top8Pile,
          step2State.lessImportantPile,
          step2State.discardedPile
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.triggerError(new Error(`Failed to handle step transition: ${message}`));
    }
  }

  /**
   * Handle participant joined events
   */
  handleParticipantJoinedEvent(event: ParticipantJoinedEvent): void {
    try {
      const { participantId } = event;
      const { participant } = event.payload;

      // Initialize participant's step 1 store
      const step1Store = this.storeManager.getStep1Store(this.sessionCode, participantId);
      
      // Initialize the deck for new participant
      step1Store.getState().initializeDeck();

      // Note: Additional participant state could be stored here if needed
      // For now, we just ensure their stores are created and initialized
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.triggerError(new Error(`Failed to handle participant joined: ${message}`));
    }
  }

  /**
   * Cleanup subscriptions and resources
   */
  cleanup(): void {
    if (this.isCleanedUp) {
      return;
    }

    // Unsubscribe from all event subscriptions
    this.unsubscribeFunctions.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        // Log error but continue cleanup
        console.warn('Error during event subscription cleanup:', error);
      }
    });
    this.unsubscribeFunctions = [];

    // Clear error handlers
    this.errorHandlers.clear();

    // Mark as cleaned up
    this.isCleanedUp = true;
    this.isInitialized = false;
  }

  /**
   * Trigger error handlers
   */
  private triggerError(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (handlerError) {
        console.error('Error in error handler:', handlerError);
      }
    });
  }
}