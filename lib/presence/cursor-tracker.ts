import type { AblyService } from '../ably/ably-service';
import type { CursorPosition } from './types';

/**
 * CursorTracker handles mouse and touch position tracking with throttling
 * Publishes cursor positions to Ably for real-time collaboration
 */
export class CursorTracker {
  private ablyService: AblyService;
  private sessionCode: string;
  private participantId: string;
  private canvasElement: Element | null;
  private isTrackingActive = false;
  private currentPosition: CursorPosition = { x: 0, y: 0, timestamp: Date.now() };
  
  // Event handlers (stored to allow cleanup)
  private mouseMoveHandler?: (event: MouseEvent) => void;
  private touchMoveHandler?: (event: TouchEvent) => void;
  
  // Throttling for cursor updates (50ms = 20fps)
  private lastPublishTime = 0;
  private readonly THROTTLE_MS = 50;

  constructor(
    ablyService: AblyService,
    sessionCode: string,
    participantId: string,
    canvasElement: Element | null
  ) {
    this.ablyService = ablyService;
    this.sessionCode = sessionCode;
    this.participantId = participantId;
    this.canvasElement = canvasElement;
  }

  /**
   * Start tracking cursor movements
   */
  startTracking(): void {
    if (this.isTrackingActive) {
      return; // Already tracking
    }

    if (!this.ablyService.isReady()) {
      console.warn('AblyService not ready, cursor tracking not started');
      return;
    }

    // Create event handlers
    this.mouseMoveHandler = this.handleMouseMove.bind(this);
    this.touchMoveHandler = this.handleTouchMove.bind(this);

    // Add event listeners with passive option for performance
    window.addEventListener('mousemove', this.mouseMoveHandler, { passive: true });
    window.addEventListener('touchmove', this.touchMoveHandler, { passive: true });

    this.isTrackingActive = true;
  }

  /**
   * Stop tracking cursor movements
   */
  stopTracking(): void {
    if (!this.isTrackingActive) {
      return; // Already stopped
    }

    // Remove event listeners
    if (this.mouseMoveHandler) {
      window.removeEventListener('mousemove', this.mouseMoveHandler);
    }
    if (this.touchMoveHandler) {
      window.removeEventListener('touchmove', this.touchMoveHandler);
    }

    this.isTrackingActive = false;
  }

  /**
   * Handle mouse movement events
   */
  private handleMouseMove(event: MouseEvent): void {
    try {
      const position = this.transformCoordinates(event.clientX, event.clientY);
      this.updatePosition(position.x, position.y);
    } catch (error) {
      console.error('Error handling mouse move:', error);
    }
  }

  /**
   * Handle touch movement events
   */
  private handleTouchMove(event: TouchEvent): void {
    try {
      if (event.touches.length === 0) {
        return; // No touches
      }

      // Use the first touch for cursor position
      const touch = event.touches[0];
      const position = this.transformCoordinates(touch.clientX, touch.clientY);
      this.updatePosition(position.x, position.y);
    } catch (error) {
      console.error('Error handling touch move:', error);
    }
  }

  /**
   * Transform absolute coordinates to canvas-relative coordinates
   */
  transformCoordinates(clientX: number, clientY: number): CursorPosition {
    try {
      if (!this.canvasElement) {
        return { x: clientX, y: clientY, timestamp: Date.now() };
      }

      const rect = this.canvasElement.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error transforming coordinates:', error);
      return { x: clientX, y: clientY, timestamp: Date.now() };
    }
  }

  /**
   * Update cursor position and publish if throttle allows
   */
  private updatePosition(x: number, y: number): void {
    // Always update local position immediately for smooth UX
    this.currentPosition = { x, y, timestamp: Date.now() };

    // Throttle network updates
    const now = Date.now();
    if (now - this.lastPublishTime < this.THROTTLE_MS) {
      return; // Skip this update due to throttling
    }

    try {
      this.ablyService.publishCursorMove(this.sessionCode, {
        x,
        y,
        participantId: this.participantId
      });

      this.lastPublishTime = now;
    } catch (error) {
      console.error('Error publishing cursor position:', error);
    }
  }

  /**
   * Get current cursor position
   */
  getCurrentPosition(): CursorPosition {
    return { ...this.currentPosition };
  }

  /**
   * Check if cursor tracking is active
   */
  isTracking(): boolean {
    return this.isTrackingActive;
  }

  /**
   * Get session code
   */
  getSessionCode(): string {
    return this.sessionCode;
  }

  /**
   * Get participant ID
   */
  getParticipantId(): string {
    return this.participantId;
  }

  /**
   * Clean up resources and stop tracking
   */
  cleanup(): void {
    this.stopTracking();
    
    // Clear handlers
    this.mouseMoveHandler = undefined;
    this.touchMoveHandler = undefined;
    
    // Reset position
    this.currentPosition = { x: 0, y: 0, timestamp: Date.now() };
    this.lastPublishTime = 0;
  }
}