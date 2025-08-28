import { CursorTracker } from '../../../../lib/presence/cursor-tracker';
import type { AblyService } from '../../../../lib/ably/ably-service';

// Mock AblyService
const mockAblyService = {
  publishCursorMove: jest.fn(),
  isReady: jest.fn(() => true)
} as unknown as AblyService;

// Mock DOM methods
Object.defineProperty(window, 'addEventListener', {
  writable: true,
  value: jest.fn()
});

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  value: jest.fn()
});

// Mock getBoundingClientRect
Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
  writable: true,
  value: jest.fn(() => ({
    top: 0,
    left: 0,
    width: 1000,
    height: 800,
    x: 0,
    y: 0
  }))
});

describe('CursorTracker', () => {
  let cursorTracker: CursorTracker;
  const mockSessionCode = 'ABC123';
  const mockParticipantId = 'user-123';
  const mockCanvasElement = document.createElement('div');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    cursorTracker = new CursorTracker(
      mockAblyService,
      mockSessionCode,
      mockParticipantId,
      mockCanvasElement
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    cursorTracker.cleanup();
  });

  describe('initialization', () => {
    it('should initialize with correct parameters', () => {
      expect(cursorTracker.getSessionCode()).toBe(mockSessionCode);
      expect(cursorTracker.getParticipantId()).toBe(mockParticipantId);
      expect(cursorTracker.isTracking()).toBe(false);
    });

    it('should not start tracking automatically', () => {
      expect(window.addEventListener).not.toHaveBeenCalled();
    });

    it('should initialize with empty cursor position', () => {
      const position = cursorTracker.getCurrentPosition();
      expect(position.x).toBe(0);
      expect(position.y).toBe(0);
      expect(position.timestamp).toBeGreaterThan(0);
    });
  });

  describe('startTracking', () => {
    it('should start tracking mouse movements', () => {
      cursorTracker.startTracking();

      expect(window.addEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function),
        expect.any(Object)
      );
      expect(cursorTracker.isTracking()).toBe(true);
    });

    it('should start tracking touch movements', () => {
      cursorTracker.startTracking();

      expect(window.addEventListener).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should use passive event listeners for performance', () => {
      cursorTracker.startTracking();

      const calls = (window.addEventListener as jest.Mock).mock.calls;
      const mouseMoveCall = calls.find(call => call[0] === 'mousemove');
      const touchMoveCall = calls.find(call => call[0] === 'touchmove');

      expect(mouseMoveCall[2]).toEqual({ passive: true });
      expect(touchMoveCall[2]).toEqual({ passive: true });
    });

    it('should not start tracking twice', () => {
      cursorTracker.startTracking();
      cursorTracker.startTracking();

      // Should only be called once per event type
      expect(window.addEventListener).toHaveBeenCalledTimes(2); // mousemove + touchmove
    });

    it('should handle AblyService not ready', () => {
      (mockAblyService.isReady as jest.Mock).mockReturnValue(false);

      expect(() => {
        cursorTracker.startTracking();
      }).not.toThrow();

      expect(cursorTracker.isTracking()).toBe(false);
    });
  });

  describe('stopTracking', () => {
    beforeEach(() => {
      cursorTracker.startTracking();
    });

    it('should stop tracking mouse movements', () => {
      cursorTracker.stopTracking();

      expect(window.removeEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function),
        expect.any(Object)
      );
      expect(cursorTracker.isTracking()).toBe(false);
    });

    it('should stop tracking touch movements', () => {
      cursorTracker.stopTracking();

      expect(window.removeEventListener).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should handle stopping when not tracking', () => {
      cursorTracker.stopTracking();
      cursorTracker.stopTracking(); // Second call

      expect(() => {
        cursorTracker.stopTracking();
      }).not.toThrow();
    });
  });

  describe('mouse movement handling', () => {
    beforeEach(() => {
      cursorTracker.startTracking();
    });

    it('should calculate correct relative coordinates', () => {
      const mockEvent = new MouseEvent('mousemove', {
        clientX: 200,
        clientY: 150
      });

      // Mock canvas position
      (mockCanvasElement.getBoundingClientRect as jest.Mock).mockReturnValue({
        top: 50,
        left: 100,
        width: 1000,
        height: 800
      });

      // Get the event handler
      const eventHandler = (window.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'mousemove')[1];

      eventHandler(mockEvent);

      const position = cursorTracker.getCurrentPosition();
      expect(position.x).toBe(100); // 200 - 100 (canvas left)
      expect(position.y).toBe(100); // 150 - 50 (canvas top)
    });

    it('should throttle cursor updates to 50ms', () => {
      const mockEvent1 = new MouseEvent('mousemove', { clientX: 100, clientY: 100 });
      const mockEvent2 = new MouseEvent('mousemove', { clientX: 200, clientY: 200 });
      const mockEvent3 = new MouseEvent('mousemove', { clientX: 300, clientY: 300 });

      const eventHandler = (window.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'mousemove')[1];

      // Send multiple rapid updates
      eventHandler(mockEvent1);
      eventHandler(mockEvent2);
      eventHandler(mockEvent3);

      // Only first update should be published immediately
      expect(mockAblyService.publishCursorMove).toHaveBeenCalledTimes(1);

      // Advance time by 50ms
      jest.advanceTimersByTime(50);

      // Send another update
      const mockEvent4 = new MouseEvent('mousemove', { clientX: 400, clientY: 400 });
      eventHandler(mockEvent4);

      expect(mockAblyService.publishCursorMove).toHaveBeenCalledTimes(2);
    });

    it('should publish cursor data with correct format', () => {
      const mockEvent = new MouseEvent('mousemove', { clientX: 150, clientY: 200 });
      
      const eventHandler = (window.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'mousemove')[1];

      eventHandler(mockEvent);

      expect(mockAblyService.publishCursorMove).toHaveBeenCalledWith(
        mockSessionCode,
        {
          x: 150,
          y: 200,
          participantId: mockParticipantId
        }
      );
    });

    it('should update local position immediately', () => {
      const mockEvent = new MouseEvent('mousemove', { clientX: 250, clientY: 350 });
      
      const eventHandler = (window.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'mousemove')[1];

      eventHandler(mockEvent);

      const position = cursorTracker.getCurrentPosition();
      expect(position.x).toBe(250);
      expect(position.y).toBe(350);
      expect(position.timestamp).toBeGreaterThan(0);
    });

    it('should handle coordinates outside canvas bounds', () => {
      (mockCanvasElement.getBoundingClientRect as jest.Mock).mockReturnValue({
        top: 100,
        left: 100,
        width: 500,
        height: 400
      });

      const mockEvent = new MouseEvent('mousemove', { clientX: 50, clientY: 50 }); // Above and left
      
      const eventHandler = (window.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'mousemove')[1];

      eventHandler(mockEvent);

      const position = cursorTracker.getCurrentPosition();
      expect(position.x).toBe(-50); // Negative coordinates allowed
      expect(position.y).toBe(-50);
    });
  });

  describe('touch movement handling', () => {
    beforeEach(() => {
      cursorTracker.startTracking();
    });

    it('should handle single touch events', () => {
      const mockTouch = { clientX: 100, clientY: 150 };
      const mockEvent = {
        type: 'touchmove',
        touches: [mockTouch],
        preventDefault: jest.fn()
      } as unknown as TouchEvent;

      const eventHandler = (window.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1];

      eventHandler(mockEvent);

      const position = cursorTracker.getCurrentPosition();
      expect(position.x).toBe(100);
      expect(position.y).toBe(150);
    });

    it('should use first touch for multi-touch events', () => {
      const mockTouches = [
        { clientX: 100, clientY: 150 },
        { clientX: 200, clientY: 250 },
        { clientX: 300, clientY: 350 }
      ];
      const mockEvent = {
        type: 'touchmove',
        touches: mockTouches,
        preventDefault: jest.fn()
      } as unknown as TouchEvent;

      const eventHandler = (window.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1];

      eventHandler(mockEvent);

      const position = cursorTracker.getCurrentPosition();
      expect(position.x).toBe(100); // First touch
      expect(position.y).toBe(150);
    });

    it('should ignore empty touch events', () => {
      const mockEvent = {
        type: 'touchmove',
        touches: [],
        preventDefault: jest.fn()
      } as unknown as TouchEvent;

      const eventHandler = (window.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1];

      const initialPosition = cursorTracker.getCurrentPosition();
      eventHandler(mockEvent);
      const finalPosition = cursorTracker.getCurrentPosition();

      expect(finalPosition).toEqual(initialPosition);
      expect(mockAblyService.publishCursorMove).not.toHaveBeenCalled();
    });

    it('should throttle touch updates like mouse updates', () => {
      const mockEvent1 = {
        type: 'touchmove',
        touches: [{ clientX: 100, clientY: 100 }],
        preventDefault: jest.fn()
      } as unknown as TouchEvent;

      const mockEvent2 = {
        type: 'touchmove',
        touches: [{ clientX: 200, clientY: 200 }],
        preventDefault: jest.fn()
      } as unknown as TouchEvent;

      const eventHandler = (window.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'touchmove')[1];

      eventHandler(mockEvent1);
      eventHandler(mockEvent2);

      // Only first update should be published due to throttling
      expect(mockAblyService.publishCursorMove).toHaveBeenCalledTimes(1);
    });
  });

  describe('coordinate transformation', () => {
    it('should transform coordinates relative to canvas element', () => {
      (mockCanvasElement.getBoundingClientRect as jest.Mock).mockReturnValue({
        top: 100,
        left: 200,
        width: 800,
        height: 600
      });

      const absoluteX = 400;
      const absoluteY = 300;
      const relativePosition = cursorTracker.transformCoordinates(absoluteX, absoluteY);

      expect(relativePosition.x).toBe(200); // 400 - 200
      expect(relativePosition.y).toBe(200); // 300 - 100
    });

    it('should handle canvas at origin', () => {
      (mockCanvasElement.getBoundingClientRect as jest.Mock).mockReturnValue({
        top: 0,
        left: 0,
        width: 1000,
        height: 800
      });

      const position = cursorTracker.transformCoordinates(150, 250);

      expect(position.x).toBe(150);
      expect(position.y).toBe(250);
    });

    it('should include timestamp in transformed coordinates', () => {
      const beforeTransform = Date.now();
      const position = cursorTracker.transformCoordinates(100, 100);
      const afterTransform = Date.now();

      expect(position.timestamp).toBeGreaterThanOrEqual(beforeTransform);
      expect(position.timestamp).toBeLessThanOrEqual(afterTransform);
    });
  });

  describe('throttling mechanism', () => {
    it('should respect 50ms throttle interval', () => {
      cursorTracker.startTracking();
      const eventHandler = (window.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'mousemove')[1];

      // Send first event
      eventHandler(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
      expect(mockAblyService.publishCursorMove).toHaveBeenCalledTimes(1);

      // Send events within throttle window (should be ignored)
      for (let i = 0; i < 10; i++) {
        eventHandler(new MouseEvent('mousemove', { clientX: 100 + i, clientY: 100 + i }));
      }
      expect(mockAblyService.publishCursorMove).toHaveBeenCalledTimes(1);

      // Advance time past throttle window
      jest.advanceTimersByTime(51);

      // Send another event (should go through)
      eventHandler(new MouseEvent('mousemove', { clientX: 200, clientY: 200 }));
      expect(mockAblyService.publishCursorMove).toHaveBeenCalledTimes(2);
    });

    it('should use independent throttle instances', () => {
      const tracker1 = new CursorTracker(mockAblyService, 'SESSION1', 'user1', mockCanvasElement);
      const tracker2 = new CursorTracker(mockAblyService, 'SESSION2', 'user2', mockCanvasElement);

      tracker1.startTracking();
      tracker2.startTracking();

      // Both should be able to publish immediately
      const handler1 = (window.addEventListener as jest.Mock).mock.calls
        .find((call, index) => call[0] === 'mousemove' && index < 2)[1]; // First mousemove handler
      
      handler1(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
      
      expect(mockAblyService.publishCursorMove).toHaveBeenCalledTimes(1);

      tracker1.cleanup();
      tracker2.cleanup();
    });
  });

  describe('performance optimization', () => {
    it('should use passive event listeners', () => {
      cursorTracker.startTracking();

      const addEventCalls = (window.addEventListener as jest.Mock).mock.calls;
      addEventCalls.forEach(call => {
        expect(call[2]).toEqual({ passive: true });
      });
    });

    it('should handle high-frequency events efficiently', () => {
      cursorTracker.startTracking();
      const eventHandler = (window.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'mousemove')[1];

      const startTime = performance.now();

      // Simulate 100 rapid events
      for (let i = 0; i < 100; i++) {
        eventHandler(new MouseEvent('mousemove', { clientX: i, clientY: i }));
      }

      const endTime = performance.now();

      // Should handle events quickly (under 50ms for 100 events)
      expect(endTime - startTime).toBeLessThan(50);

      // But should only publish once due to throttling
      expect(mockAblyService.publishCursorMove).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup', () => {
    it('should remove all event listeners', () => {
      cursorTracker.startTracking();
      cursorTracker.cleanup();

      expect(window.removeEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function),
        expect.any(Object)
      );
      expect(window.removeEventListener).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
        expect.any(Object)
      );
    });

    it('should stop tracking state', () => {
      cursorTracker.startTracking();
      expect(cursorTracker.isTracking()).toBe(true);

      cursorTracker.cleanup();
      expect(cursorTracker.isTracking()).toBe(false);
    });

    it('should clear throttle timers', () => {
      cursorTracker.startTracking();
      const eventHandler = (window.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'mousemove')[1];

      // Start throttle cycle
      eventHandler(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));

      cursorTracker.cleanup();

      // Advance time - no more publishes should occur
      const initialCalls = (mockAblyService.publishCursorMove as jest.Mock).mock.calls.length;
      jest.advanceTimersByTime(100);

      expect((mockAblyService.publishCursorMove as jest.Mock).mock.calls.length)
        .toBe(initialCalls);
    });

    it('should handle multiple cleanup calls safely', () => {
      cursorTracker.startTracking();
      cursorTracker.cleanup();
      
      expect(() => {
        cursorTracker.cleanup();
        cursorTracker.cleanup();
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle missing canvas element', () => {
      const trackerWithoutCanvas = new CursorTracker(
        mockAblyService,
        mockSessionCode,
        mockParticipantId,
        null as any
      );

      expect(() => {
        trackerWithoutCanvas.startTracking();
      }).not.toThrow();
    });

    it('should handle getBoundingClientRect errors', () => {
      (mockCanvasElement.getBoundingClientRect as jest.Mock).mockImplementation(() => {
        throw new Error('getBoundingClientRect failed');
      });

      expect(() => {
        cursorTracker.transformCoordinates(100, 100);
      }).not.toThrow();
    });

    it('should handle AblyService publish errors', () => {
      (mockAblyService.publishCursorMove as jest.Mock).mockImplementation(() => {
        throw new Error('Publish failed');
      });

      cursorTracker.startTracking();
      const eventHandler = (window.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'mousemove')[1];

      expect(() => {
        eventHandler(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
      }).not.toThrow();
    });
  });
});