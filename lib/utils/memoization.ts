type MemoizedFunction<T extends (...args: any[]) => any> = T & {
  cache: Map<string, ReturnType<T>>;
  clear: () => void;
};

export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string
): MemoizedFunction<T> {
  const cache = new Map<string, ReturnType<T>>();
  
  const memoized = ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as MemoizedFunction<T>;
  
  memoized.cache = cache;
  memoized.clear = () => cache.clear();
  
  return memoized;
}

export function memoizeWeak<T extends object, R>(
  fn: (obj: T, ...args: any[]) => R
): (obj: T, ...args: any[]) => R {
  const cache = new WeakMap<T, Map<string, R>>();
  
  return (obj: T, ...args: any[]): R => {
    if (!cache.has(obj)) {
      cache.set(obj, new Map());
    }
    
    const objCache = cache.get(obj)!;
    const key = JSON.stringify(args);
    
    if (objCache.has(key)) {
      return objCache.get(key)!;
    }
    
    const result = fn(obj, ...args);
    objCache.set(key, result);
    return result;
  };
}

export const createHashKey = (...values: any[]): string => {
  return values.map(v => 
    typeof v === 'object' && v !== null 
      ? JSON.stringify(v) 
      : String(v)
  ).join('|');
};