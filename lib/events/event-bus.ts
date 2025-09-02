import { BaseEvent, validateEvent } from './types';

// Ably service interface (based on existing patterns)
interface AblyService {
  getChannel(sessionCode: string, channelType: string): unknown;
  subscribe(sessionCode: string, channelType: string, eventType: string, callback: (message: AblyMessage) => void): () => void;
  isReady(): boolean;
  cleanup(): void;
}

// Ably message structure
interface AblyMessage {
  name: string;
  data: unknown;
}

// Event handler type
type EventHandler = (event: BaseEvent) => void;
type ErrorHandler = (error: Error) => void;

export class EventBus {
  private ablyService: AblyService;
  private sessionCode: string;
  private channel: unknown;
  private subscriptions: Array<() => void> = [];
  private seenEventIds = new Set<string>();
  private errorHandlers = new Set<ErrorHandler>();
  private isCleanedUp = false;

  constructor(ablyService: AblyService, sessionCode: string) {
    this.ablyService = ablyService;
    this.sessionCode = sessionCode;
    this.channel = ablyService.getChannel(sessionCode, 'events');
  }

  async publishEvent(event: BaseEvent): Promise<void> {
    if (this.isCleanedUp) {
      throw new Error('EventBus has been cleaned up');
    }

    if (!this.ablyService.isReady()) {
      throw new Error('Ably service not ready');
    }

    // Validate event
    validateEvent(event);

    // Check session code match
    if (event.sessionCode !== this.sessionCode) {
      throw new Error('Event session code does not match EventBus session');
    }

    try {
      (this.channel as { publish: (type: string, data: BaseEvent) => void }).publish(event.type, event);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to publish event: ${message}`);
    }
  }

  subscribeToEvents(handler: EventHandler): () => void {
    if (this.isCleanedUp) {
      throw new Error('EventBus has been cleaned up');
    }

    try {
      const wrappedHandler = (ablyMessage: AblyMessage) => {
        this.handleIncomingEvent(ablyMessage, handler);
      };

      const unsubscribe = (this.channel as { subscribe: (handler: (message: AblyMessage) => void) => () => void }).subscribe(wrappedHandler);
      
      const trackingUnsubscribe = () => {
        unsubscribe();
        this.subscriptions = this.subscriptions.filter(sub => sub !== trackingUnsubscribe);
      };

      this.subscriptions.push(trackingUnsubscribe);
      return trackingUnsubscribe;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to subscribe to events: ${message}`);
    }
  }

  subscribeToEventType(eventType: string, handler: EventHandler): () => void {
    if (this.isCleanedUp) {
      throw new Error('EventBus has been cleaned up');
    }

    try {
      const wrappedHandler = (ablyMessage: AblyMessage) => {
        this.handleIncomingEvent(ablyMessage, handler);
      };

      const unsubscribe = (this.channel as { subscribe: (eventType: string, handler: (message: AblyMessage) => void) => () => void }).subscribe(eventType, wrappedHandler);
      
      const trackingUnsubscribe = () => {
        unsubscribe();
        this.subscriptions = this.subscriptions.filter(sub => sub !== trackingUnsubscribe);
      };

      this.subscriptions.push(trackingUnsubscribe);
      return trackingUnsubscribe;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to subscribe to events: ${message}`);
    }
  }

  onError(handler: ErrorHandler): void {
    this.errorHandlers.add(handler);
  }

  getSubscriptionCount(): number {
    return this.subscriptions.length;
  }

  cleanup(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];

    // Clear deduplication cache
    this.seenEventIds.clear();

    // Clear error handlers
    this.errorHandlers.clear();

    // Mark as cleaned up
    this.isCleanedUp = true;
  }

  // Public method for testing error handling
  _triggerError(error: Error): void {
    this.errorHandlers.forEach(handler => handler(error));
  }

  private handleIncomingEvent(ablyMessage: AblyMessage, handler: EventHandler): void {
    try {
      const event = ablyMessage.data;

      // Validate event structure
      validateEvent(event);

      // Filter by session code
      if (event.sessionCode !== this.sessionCode) {
        return; // Ignore events from other sessions
      }

      // Deduplicate by event ID
      if (this.seenEventIds.has(event.id)) {
        return; // Already seen this event
      }

      this.seenEventIds.add(event.id);

      // Call the handler
      handler(event);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this._triggerError(new Error(`Invalid event received: ${errorMessage}`));
    }
  }
}