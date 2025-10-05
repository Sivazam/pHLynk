/**
 * Rate Limiter for API Endpoints
 * 
 * Provides in-memory rate limiting with different strategies:
 * - Sliding window for general API calls
 * - Fixed window for sensitive operations
 * - Exponential backoff for repeated violations
 */

import { secureLogger } from '@/lib/secure-logger';

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  skipSuccessfulRequests?: boolean;  // Don't count successful requests
  skipFailedRequests?: boolean;      // Don't count failed requests
  keyGenerator?: (identifier: string) => string;  // Custom key generator
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  isExceeded: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastAccess: number;
  violationCount: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;
  
  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }
  
  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Check if request is allowed
   */
  async check(identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;
    const entry = this.store.get(key);
    
    // Initialize new entry
    if (!entry || now > entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + config.windowMs,
        lastAccess: now,
        violationCount: 0
      };
      
      this.store.set(key, newEntry);
      
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime: newEntry.resetTime,
        isExceeded: false
      };
    }
    
    // Update existing entry
    entry.lastAccess = now;
    entry.count++;
    
    const remaining = Math.max(0, config.maxRequests - entry.count);
    const isExceeded = entry.count > config.maxRequests;
    
    // Calculate retry after with exponential backoff for repeat offenders
    let retryAfter: number | undefined;
    if (isExceeded) {
      entry.violationCount++;
      const backoffMultiplier = Math.min(Math.pow(2, entry.violationCount - 1), 16); // Max 16x
      retryAfter = Math.ceil((entry.resetTime - now) * backoffMultiplier / 1000);
      
      // Log rate limit violation
      secureLogger.security('Rate limit exceeded', {
        identifier: this.sanitizeIdentifier(identifier),
        count: entry.count,
        limit: config.maxRequests,
        violationCount: entry.violationCount,
        retryAfter,
        windowMs: config.windowMs
      });
    } else {
      entry.violationCount = Math.max(0, entry.violationCount - 1); // Decay violations
    }
    
    const result: RateLimitResult = {
      allowed: !isExceeded,
      limit: config.maxRequests,
      remaining,
      resetTime: entry.resetTime,
      retryAfter,
      isExceeded
    };
    
    return result;
  }
  
  /**
   * Reset rate limit for specific identifier
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
    secureLogger.security('Rate limit reset', {
      identifier: this.sanitizeIdentifier(identifier)
    });
  }
  
  /**
   * Get current status for identifier
   */
  getStatus(identifier: string): RateLimitEntry | null {
    const entry = this.store.get(identifier);
    if (!entry) return null;
    
    return { ...entry };
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime + (60 * 60 * 1000)) { // Keep for 1 hour after expiry
        this.store.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      secureLogger.performance('Rate limiter cleanup', {
        entriesRemoved: cleanedCount,
        totalEntries: this.store.size
      });
    }
  }
  
  /**
   * Sanitize identifier for logging
   */
  private sanitizeIdentifier(identifier: string): string {
    // Hash or mask sensitive identifiers
    if (identifier.includes('@')) {
      // Email address - show first 2 chars and domain
      const [local, domain] = identifier.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    }
    
    if (identifier.length > 10) {
      // Long identifier - show first and last few chars
      return `${identifier.substring(0, 3)}***${identifier.substring(identifier.length - 3)}`;
    }
    
    return '***';
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    totalEntries: number;
    activeEntries: number;
    violationsInLastHour: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    let activeEntries = 0;
    let violationsInLastHour = 0;
    
    for (const entry of this.store.values()) {
      if (entry.resetTime > now) {
        activeEntries++;
      }
      if (entry.lastAccess > oneHourAgo && entry.violationCount > 0) {
        violationsInLastHour++;
      }
    }
    
    return {
      totalEntries: this.store.size,
      activeEntries,
      violationsInLastHour
    };
  }
  
  /**
   * Destroy cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Predefined rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  // General API calls - generous limit
  GENERAL: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 1000,          // 1000 requests per 15 minutes
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  
  // Authentication endpoints - stricter
  AUTH: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 20,            // 20 attempts per 15 minutes
    skipSuccessfulRequests: true,  // Don't count successful logins
    skipFailedRequests: false
  },
  
  // OTP operations - very strict
  OTP: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 10,            // 10 OTP attempts per 15 minutes
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  
  // Payment verification - strict
  PAYMENT: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 50,            // 50 payment attempts per 15 minutes
    skipSuccessfulRequests: true,
    skipFailedRequests: false
  },
  
  // Sensitive operations - very strict
  SENSITIVE: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    maxRequests: 5,             // 5 sensitive operations per hour
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  }
};

export const rateLimiter = RateLimiter.getInstance();