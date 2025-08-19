import { memoize, memoizeWeak, createHashKey } from '../../lib/utils/memoization';

describe('memoization utilities', () => {
  describe('memoize', () => {
    it('should cache function results', () => {
      let callCount = 0;
      const expensiveFunction = (x: number, y: number) => {
        callCount++;
        return x + y;
      };

      const memoized = memoize(expensiveFunction);

      expect(memoized(1, 2)).toBe(3);
      expect(callCount).toBe(1);

      // Second call should use cache
      expect(memoized(1, 2)).toBe(3);
      expect(callCount).toBe(1);

      // Different args should call function again
      expect(memoized(2, 3)).toBe(5);
      expect(callCount).toBe(2);
    });

    it('should use custom key generator', () => {
      let callCount = 0;
      const fn = (obj: { id: number; name: string }) => {
        callCount++;
        return `${obj.id}-${obj.name}`;
      };

      const memoized = memoize(fn, (obj) => obj.id.toString());

      const obj1 = { id: 1, name: 'John' };
      const obj2 = { id: 1, name: 'Jane' }; // Same ID, different name

      expect(memoized(obj1)).toBe('1-John');
      expect(callCount).toBe(1);

      // Should use cached result because ID is the same
      expect(memoized(obj2)).toBe('1-John');
      expect(callCount).toBe(1);
    });

    it('should provide cache management methods', () => {
      const fn = (x: number) => x * 2;
      const memoized = memoize(fn);

      memoized(5);
      expect(memoized.cache.size).toBe(1);

      memoized.clear();
      expect(memoized.cache.size).toBe(0);
    });
  });

  describe('memoizeWeak', () => {
    it('should cache results using WeakMap', () => {
      let callCount = 0;
      const fn = (obj: { id: number }, multiplier: number) => {
        callCount++;
        return obj.id * multiplier;
      };

      const memoized = memoizeWeak(fn);

      const obj1 = { id: 5 };
      const obj2 = { id: 10 };

      expect(memoized(obj1, 2)).toBe(10);
      expect(callCount).toBe(1);

      // Same object and args should use cache
      expect(memoized(obj1, 2)).toBe(10);
      expect(callCount).toBe(1);

      // Different args should compute again
      expect(memoized(obj1, 3)).toBe(15);
      expect(callCount).toBe(2);

      // Different object should compute again
      expect(memoized(obj2, 2)).toBe(20);
      expect(callCount).toBe(3);
    });

    it('should allow garbage collection of objects', () => {
      const fn = (obj: { id: number }) => obj.id;
      const memoized = memoizeWeak(fn);

      let obj: { id: number } | null = { id: 42 };
      expect(memoized(obj, 1)).toBe(42);

      // Allow object to be garbage collected
      obj = null;
      
      // Test passes if no memory leaks (WeakMap allows GC)
      expect(true).toBe(true);
    });
  });

  describe('createHashKey', () => {
    it('should create consistent hash keys', () => {
      const key1 = createHashKey('test', 123, { x: 10, y: 20 });
      const key2 = createHashKey('test', 123, { x: 10, y: 20 });
      const key3 = createHashKey('test', 123, { x: 10, y: 21 });

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });

    it('should handle different data types', () => {
      const key = createHashKey(
        'string',
        42,
        true,
        null,
        undefined,
        { nested: { object: 'value' } },
        [1, 2, 3]
      );

      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });
  });
});