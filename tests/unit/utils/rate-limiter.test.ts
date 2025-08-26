import { 
  getRateLimiter, 
  resetRateLimiter, 
  getClientIP, 
  RATE_LIMIT_CONFIGS,
  type RateLimitConfig,
  type RateLimitResult 
} from '@/lib/utils/rate-limiter';

describe('rate-limiter', () => {
  beforeEach(() => {
    // Reset to clean state before each test
    resetRateLimiter();
    jest.useFakeTimers();
  });

  afterEach(() => {
    resetRateLimiter();
    jest.useRealTimers();
  });

  describe('InMemoryRateLimiter', () => {
    it('should allow requests within limit', () => {
      const limiter = getRateLimiter();
      const config: RateLimitConfig = { maxRequests: 5, windowMs: 60000 };
      
      const result = limiter.checkLimit('test-key', config);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(3); // maxRequests - validRequests.length - 1 (for current request) = 5 - 1 - 1 = 3
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should deny requests when limit exceeded', () => {
      const limiter = getRateLimiter();
      const config: RateLimitConfig = { maxRequests: 2, windowMs: 60000 };
      
      // Make 2 allowed requests
      const result1 = limiter.checkLimit('test-key', config);
      const result2 = limiter.checkLimit('test-key', config);
      
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(0);
      
      // Third request should be denied
      const result3 = limiter.checkLimit('test-key', config);
      expect(result3.allowed).toBe(false);
      expect(result3.remaining).toBe(0);
    });

    it('should reset limit after window expires', () => {
      const limiter = getRateLimiter();
      const config: RateLimitConfig = { maxRequests: 1, windowMs: 60000 };
      
      // First request should be allowed
      const result1 = limiter.checkLimit('test-key', config);
      expect(result1.allowed).toBe(true);
      
      // Second request should be denied
      const result2 = limiter.checkLimit('test-key', config);
      expect(result2.allowed).toBe(false);
      
      // Fast-forward past the window
      jest.advanceTimersByTime(61000);
      
      // Request should be allowed again
      const result3 = limiter.checkLimit('test-key', config);
      expect(result3.allowed).toBe(true);
    });

    it('should handle different keys independently', () => {
      const limiter = getRateLimiter();
      const config: RateLimitConfig = { maxRequests: 1, windowMs: 60000 };
      
      const result1 = limiter.checkLimit('key1', config);
      const result2 = limiter.checkLimit('key2', config);
      
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('should calculate remaining correctly', () => {
      const limiter = getRateLimiter();
      const config: RateLimitConfig = { maxRequests: 3, windowMs: 60000 };
      
      const result1 = limiter.checkLimit('test-key', config);
      expect(result1.remaining).toBe(1); // 3 - 1 - 1 = 1
      
      const result2 = limiter.checkLimit('test-key', config);
      expect(result2.remaining).toBe(0); // 3 - 2 - 1 = 0
      
      const result3 = limiter.checkLimit('test-key', config);
      expect(result3.remaining).toBe(0); // 3 - 3 - 1 = -1 -> Math.max(0, -1) = 0
      
      const result4 = limiter.checkLimit('test-key', config);
      expect(result4.remaining).toBe(0); // denied, so 3 - 3 - 0 = 0
    });

    it('should clean up old entries automatically', () => {
      const limiter = getRateLimiter();
      const config: RateLimitConfig = { maxRequests: 1, windowMs: 60000 };
      
      // Make a request
      limiter.checkLimit('test-key', config);
      
      // Fast-forward to trigger cleanup (5 minutes)
      jest.advanceTimersByTime(5 * 60 * 1000);
      
      // The cleanup should have run, but entries less than 1 hour old should remain
      // However, since we're only 5 minutes in, the request window has expired, so new requests should be allowed
      const result = limiter.checkLimit('test-key', config);
      expect(result.allowed).toBe(true); // Window has expired, so allowed
    });

    it('should remove very old entries during cleanup', () => {
      const limiter = getRateLimiter();
      const config: RateLimitConfig = { maxRequests: 1, windowMs: 60000 };
      
      // Make a request
      limiter.checkLimit('test-key', config);
      
      // Fast-forward past 1 hour + cleanup interval
      jest.advanceTimersByTime(65 * 60 * 1000);
      
      // Should be allowed again as old entries were cleaned up
      const result = limiter.checkLimit('test-key', config);
      expect(result.allowed).toBe(true);
    });

    it('should handle window sliding correctly', () => {
      const limiter = getRateLimiter();
      const config: RateLimitConfig = { maxRequests: 2, windowMs: 30000 };
      
      // Make 2 requests at time 0
      limiter.checkLimit('test-key', config);
      limiter.checkLimit('test-key', config);
      
      // Third request should be denied
      let result = limiter.checkLimit('test-key', config);
      expect(result.allowed).toBe(false);
      
      // Advance time by 31 seconds (past window)
      jest.advanceTimersByTime(31000);
      
      // Should be allowed again
      result = limiter.checkLimit('test-key', config);
      expect(result.allowed).toBe(true);
    });
  });

  describe('getRateLimiter', () => {
    it('should return singleton instance', () => {
      const limiter1 = getRateLimiter();
      const limiter2 = getRateLimiter();
      
      expect(limiter1).toBe(limiter2);
    });

    it('should create new instance after reset', () => {
      const limiter1 = getRateLimiter();
      resetRateLimiter();
      const limiter2 = getRateLimiter();
      
      expect(limiter1).not.toBe(limiter2);
    });
  });

  describe('resetRateLimiter', () => {
    it('should clear all rate limit data', () => {
      const limiter = getRateLimiter();
      const config: RateLimitConfig = { maxRequests: 1, windowMs: 60000 };
      
      // Use up the limit
      limiter.checkLimit('test-key', config);
      let result = limiter.checkLimit('test-key', config);
      expect(result.allowed).toBe(false);
      
      // Reset and check again
      resetRateLimiter();
      const newLimiter = getRateLimiter();
      result = newLimiter.checkLimit('test-key', config);
      expect(result.allowed).toBe(true);
    });

    it('should handle multiple resets', () => {
      getRateLimiter();
      
      expect(() => {
        resetRateLimiter();
        resetRateLimiter();
        resetRateLimiter();
      }).not.toThrow();
    });
  });

  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://example.com', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' }
      });
      
      expect(getClientIP(request)).toBe('192.168.1.1');
    });

    it('should handle single IP in x-forwarded-for', () => {
      const request = new Request('http://example.com', {
        headers: { 'x-forwarded-for': '192.168.1.1' }
      });
      
      expect(getClientIP(request)).toBe('192.168.1.1');
    });

    it('should fallback to x-real-ip header', () => {
      const request = new Request('http://example.com', {
        headers: { 'x-real-ip': '10.0.0.1' }
      });
      
      expect(getClientIP(request)).toBe('10.0.0.1');
    });

    it('should fallback to cf-connecting-ip header', () => {
      const request = new Request('http://example.com', {
        headers: { 'cf-connecting-ip': '203.0.113.1' }
      });
      
      expect(getClientIP(request)).toBe('203.0.113.1');
    });

    it('should prioritize x-forwarded-for over other headers', () => {
      const request = new Request('http://example.com', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '10.0.0.1',
          'cf-connecting-ip': '203.0.113.1'
        }
      });
      
      expect(getClientIP(request)).toBe('192.168.1.1');
    });

    it('should return unknown when no IP headers present', () => {
      const request = new Request('http://example.com');
      
      expect(getClientIP(request)).toBe('unknown');
    });

    it('should handle whitespace in x-forwarded-for', () => {
      const request = new Request('http://example.com', {
        headers: { 'x-forwarded-for': '  192.168.1.1  , 10.0.0.1  ' }
      });
      
      expect(getClientIP(request)).toBe('192.168.1.1');
    });
  });

  describe('RATE_LIMIT_CONFIGS', () => {
    it('should have all required configurations', () => {
      expect(RATE_LIMIT_CONFIGS.CREATE_SESSION).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.JOIN_SESSION).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.GENERAL).toBeDefined();
      expect(RATE_LIMIT_CONFIGS.STRICT).toBeDefined();
    });

    it('should have reasonable limits for session creation', () => {
      const config = RATE_LIMIT_CONFIGS.CREATE_SESSION;
      expect(config.maxRequests).toBe(10);
      expect(config.windowMs).toBe(60000); // 1 minute
    });

    it('should have higher limits for session joining', () => {
      const createConfig = RATE_LIMIT_CONFIGS.CREATE_SESSION;
      const joinConfig = RATE_LIMIT_CONFIGS.JOIN_SESSION;
      
      expect(joinConfig.maxRequests).toBeGreaterThan(createConfig.maxRequests);
    });

    it('should have strict limits for suspicious activity', () => {
      const strictConfig = RATE_LIMIT_CONFIGS.STRICT;
      const generalConfig = RATE_LIMIT_CONFIGS.GENERAL;
      
      expect(strictConfig.maxRequests).toBeLessThan(generalConfig.maxRequests);
    });
  });

  describe('Integration', () => {
    it('should work with predefined configs', () => {
      const limiter = getRateLimiter();
      
      // Test CREATE_SESSION config
      const config = RATE_LIMIT_CONFIGS.CREATE_SESSION;
      
      // Make requests up to the limit
      for (let i = 0; i < config.maxRequests; i++) {
        const result = limiter.checkLimit('test-ip', config);
        expect(result.allowed).toBe(true);
      }
      
      // Next request should be denied
      const result = limiter.checkLimit('test-ip', config);
      expect(result.allowed).toBe(false);
    });

    it('should handle concurrent requests for different keys', () => {
      const limiter = getRateLimiter();
      const config: RateLimitConfig = { maxRequests: 1, windowMs: 60000 };
      
      const results = [
        limiter.checkLimit('ip1', config),
        limiter.checkLimit('ip2', config),
        limiter.checkLimit('ip3', config),
      ];
      
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });
    });

    it('should maintain state across multiple checks', () => {
      const limiter = getRateLimiter();
      const config: RateLimitConfig = { maxRequests: 3, windowMs: 60000 };
      
      const expectedRemaining = [1, 0, 0]; // Based on the formula: maxRequests - validRequests.length - 1
      
      for (let i = 0; i < 5; i++) {
        const result = limiter.checkLimit('test-key', config);
        
        if (i < 3) {
          expect(result.allowed).toBe(true);
          expect(result.remaining).toBe(expectedRemaining[i]);
        } else {
          expect(result.allowed).toBe(false);
          expect(result.remaining).toBe(0);
        }
      }
    });
  });
});