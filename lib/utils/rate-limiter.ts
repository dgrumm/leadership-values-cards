/**
 * Simple in-memory rate limiter for API endpoints
 * In production, consider Redis-based rate limiting for distributed systems
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private requests = new Map<string, number[]>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  checkLimit(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get or initialize request history for this key
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requestHistory = this.requests.get(key)!;
    
    // Remove requests outside the current window
    const validRequests = requestHistory.filter(time => time > windowStart);
    
    // Check if limit is exceeded
    const allowed = validRequests.length < config.maxRequests;
    
    if (allowed) {
      // Add current request to history
      validRequests.push(now);
    }
    
    // Update the request history
    this.requests.set(key, validRequests);
    
    return {
      allowed,
      remaining: Math.max(0, config.maxRequests - validRequests.length - (allowed ? 1 : 0)),
      resetTime: now + config.windowMs
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - (60 * 60 * 1000); // Remove entries older than 1 hour
    
    for (const [key, requestHistory] of this.requests.entries()) {
      const validRequests = requestHistory.filter(time => time > cutoff);
      
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.requests.clear();
  }
}

// Singleton instance
let rateLimiter: InMemoryRateLimiter | null = null;

export function getRateLimiter(): InMemoryRateLimiter {
  if (!rateLimiter) {
    rateLimiter = new InMemoryRateLimiter();
  }
  return rateLimiter;
}

export function resetRateLimiter(): void {
  if (rateLimiter) {
    rateLimiter.destroy();
    rateLimiter = null;
  }
}

// Utility function to get client IP from request
export function getClientIP(request: Request): string {
  // Try various headers for client IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback to a default identifier
  return 'unknown';
}

// Pre-configured rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  // Session creation - 10 per minute
  CREATE_SESSION: {
    maxRequests: 10,
    windowMs: 60 * 1000
  },
  
  // Session joining - 20 per minute
  JOIN_SESSION: {
    maxRequests: 20,
    windowMs: 60 * 1000
  },
  
  // General API - 100 per minute
  GENERAL: {
    maxRequests: 100,
    windowMs: 60 * 1000
  },
  
  // Aggressive limit for unknown/suspicious activity
  STRICT: {
    maxRequests: 5,
    windowMs: 60 * 1000
  }
} as const;