import { debounce, throttle } from '@/lib/utils/debounce';

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should delay function execution', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);
    
    debouncedFn('test');
    expect(mockFn).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous timeout on subsequent calls', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);
    
    debouncedFn('first');
    jest.advanceTimersByTime(50);
    
    debouncedFn('second');
    jest.advanceTimersByTime(50);
    
    // First call should be cancelled, function not called yet
    expect(mockFn).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(50);
    
    // Only second call should execute
    expect(mockFn).toHaveBeenCalledWith('second');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple arguments', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);
    
    debouncedFn('arg1', 'arg2', 123);
    jest.advanceTimersByTime(100);
    
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });

  it('should handle different delay times', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 200);
    
    debouncedFn('test');
    
    jest.advanceTimersByTime(100);
    expect(mockFn).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should work with functions that return values', () => {
    const mockFn = jest.fn(() => 'result');
    const debouncedFn = debounce(mockFn, 100);
    
    // Note: debounced function returns void, not the original return type
    const result = debouncedFn('test');
    expect(result).toBeUndefined();
    
    jest.advanceTimersByTime(100);
    expect(mockFn).toHaveBeenCalledWith('test');
  });

  it('should handle rapid consecutive calls', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);
    
    // Rapid calls
    for (let i = 0; i < 10; i++) {
      debouncedFn(`call-${i}`);
      jest.advanceTimersByTime(10);
    }
    
    // Should not have been called yet
    expect(mockFn).not.toHaveBeenCalled();
    
    // Wait for the final timeout
    jest.advanceTimersByTime(100);
    
    // Only the last call should execute
    expect(mockFn).toHaveBeenCalledWith('call-9');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should execute function immediately on first call', () => {
    const mockFn = jest.fn();
    const throttledFn = throttle(mockFn, 100);
    
    throttledFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should limit subsequent calls within delay period', () => {
    const mockFn = jest.fn();
    const throttledFn = throttle(mockFn, 100);
    
    throttledFn('first');
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    // Multiple calls within delay period
    throttledFn('second');
    throttledFn('third');
    
    // Should still be only 1 call
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenLastCalledWith('first');
  });

  it('should execute again after delay period', () => {
    const mockFn = jest.fn();
    const throttledFn = throttle(mockFn, 100);
    
    throttledFn('first');
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    jest.advanceTimersByTime(100);
    
    throttledFn('second');
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('second');
  });

  it('should schedule delayed execution for calls within delay period', () => {
    const mockFn = jest.fn();
    const throttledFn = throttle(mockFn, 100);
    
    throttledFn('first');
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    jest.advanceTimersByTime(50);
    throttledFn('second');
    
    // Should still be 1 call
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    // Wait for the remaining delay
    jest.advanceTimersByTime(50);
    
    // Now the delayed call should execute
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('second');
  });

  it('should handle multiple arguments', () => {
    const mockFn = jest.fn();
    const throttledFn = throttle(mockFn, 100);
    
    throttledFn('arg1', 'arg2', 123);
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 123);
  });

  it('should update scheduled call with latest arguments', () => {
    const mockFn = jest.fn();
    const throttledFn = throttle(mockFn, 100);
    
    throttledFn('first');
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    jest.advanceTimersByTime(50);
    throttledFn('second');
    throttledFn('third'); // This should override 'second' in the scheduled call
    
    jest.advanceTimersByTime(50);
    
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('third');
  });

  it('should work with different delay times', () => {
    const mockFn = jest.fn();
    const throttledFn = throttle(mockFn, 200);
    
    throttledFn('first');
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    jest.advanceTimersByTime(100);
    throttledFn('second');
    
    // Should not execute yet
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    jest.advanceTimersByTime(100);
    
    // Now should execute
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('second');
  });

  it('should handle rapid consecutive calls correctly', () => {
    const mockFn = jest.fn();
    const throttledFn = throttle(mockFn, 100);
    
    // First call executes immediately
    throttledFn('call-0');
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    // Rapid calls within delay period
    for (let i = 1; i < 10; i++) {
      jest.advanceTimersByTime(5);
      throttledFn(`call-${i}`);
    }
    
    // Should still be 1 call
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    // Wait for scheduled execution
    jest.advanceTimersByTime(100);
    
    // Should execute the last call
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('call-9');
  });
});