/**
 * API Rate Limiting Middleware
 * 
 * Express/Next.js middleware for rate limiting API endpoints
 * with proper headers and error responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';
import { secureLogger } from '@/lib/secure-logger';

export interface RateLimitMiddlewareOptions {
  config: keyof typeof RATE_LIMIT_CONFIGS;
  identifierGenerator?: (req: NextRequest) => string;
  onSuccess?: (result: any) => void;
  onLimitReached?: (result: any) => void;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export async function withRateLimit(
  request: NextRequest,
  options: RateLimitMiddlewareOptions
): Promise<{ allowed: boolean; response?: NextResponse }> {
  try {
    // Generate identifier for rate limiting
    const identifier = options.identifierGenerator 
      ? options.identifierGenerator(request)
      : generateDefaultIdentifier(request);
    
    // Get rate limit configuration
    const config = RATE_LIMIT_CONFIGS[options.config];
    
    // Check rate limit
    const result = await rateLimiter.check(identifier, {
      ...config,
      skipSuccessfulRequests: options.skipSuccessfulRequests ?? config.skipSuccessfulRequests,
      skipFailedRequests: options.skipFailedRequests ?? config.skipFailedRequests
    });
    
    // Log rate limit check
    secureLogger.performance('Rate limit check', {
      identifier: rateLimiter['sanitizeIdentifier'](identifier),
      allowed: result.allowed,
      remaining: result.remaining,
      limit: result.limit,
      config: options.config
    });
    
    // Handle rate limit exceeded
    if (!result.allowed) {
      const response = NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: result.retryAfter,
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.resetTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString(),
            'Retry-After': (result.retryAfter || 60).toString(),
            'Cache-Control': 'no-store'
          }
        }
      );
      
      if (options.onLimitReached) {
        options.onLimitReached(result);
      }
      
      return { allowed: false, response };
    }
    
    // Add rate limit headers to successful responses
    const headers = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetTime.toString(),
      'Cache-Control': 'no-store'
    };
    
    if (options.onSuccess) {
      options.onSuccess(result);
    }
    
    return { allowed: true, response: NextResponse.next({ headers }) };
    
  } catch (error) {
    secureLogger.error('Rate limiting middleware error', {
      error: error.message,
      config: options.config
    });
    
    // Fail open - allow request if rate limiting fails
    return { allowed: true };
  }
}

/**
 * Generate default identifier from request
 */
function generateDefaultIdentifier(request: NextRequest): string {
  // Try to get user ID from auth header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // In a real app, you'd decode the JWT to get user ID
    // For now, use a hash of the token
    return `user:${hashString(authHeader.substring(7))}`;
  }
  
  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${hashString(ip)}`;
}

/**
 * Simple hash function for identifiers
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Specific rate limiters for different endpoint types
 */
export const rateLimiters = {
  /**
   * General API rate limiter
   */
  general: (request: NextRequest) => withRateLimit(request, {
    config: 'GENERAL'
  }),
  
  /**
   * Authentication rate limiter
   */
  auth: (request: NextRequest) => withRateLimit(request, {
    config: 'AUTH',
    identifierGenerator: (req) => {
      // For auth, use IP + email combination if available
      const email = req.nextUrl.searchParams.get('email');
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      return email ? `auth:${hashString(email)}:${hashString(ip)}` : `auth:ip:${hashString(ip)}`;
    },
    onLimitReached: (result) => {
      secureLogger.security('Authentication rate limit exceeded', {
        retryAfter: result.retryAfter,
        violationCount: result.isExceeded ? 1 : 0
      });
    }
  }),
  
  /**
   * OTP rate limiter
   */
  otp: (request: NextRequest) => withRateLimit(request, {
    config: 'OTP',
    identifierGenerator: (req) => {
      // For OTP, use phone number or payment ID
      const phone = req.nextUrl.searchParams.get('phone');
      const paymentId = req.nextUrl.searchParams.get('paymentId');
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      
      if (phone) return `otp:phone:${hashString(phone)}`;
      if (paymentId) return `otp:payment:${hashString(paymentId)}`;
      return `otp:ip:${hashString(ip)}`;
    },
    onLimitReached: (result) => {
      secureLogger.security('OTP rate limit exceeded', {
        retryAfter: result.retryAfter,
        severity: 'high'
      });
    }
  }),
  
  /**
   * Payment rate limiter
   */
  payment: (request: NextRequest) => withRateLimit(request, {
    config: 'PAYMENT',
    identifierGenerator: (req) => {
      // For payments, use retailer ID if available
      const retailerId = req.nextUrl.searchParams.get('retailerId');
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
      
      return retailerId ? `payment:retailer:${hashString(retailerId)}` : `payment:ip:${hashString(ip)}`;
    },
    onLimitReached: (result) => {
      secureLogger.security('Payment rate limit exceeded', {
        retryAfter: result.retryAfter,
        severity: 'medium'
      });
    }
  }),
  
  /**
   * Sensitive operations rate limiter
   */
  sensitive: (request: NextRequest) => withRateLimit(request, {
    config: 'SENSITIVE',
    identifierGenerator: (req) => {
      // For sensitive ops, require authentication
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        return `sensitive:anonymous:${hashString(req.headers.get('x-forwarded-for') || 'unknown')}`;
      }
      
      return `sensitive:user:${hashString(authHeader)}`;
    },
    onLimitReached: (result) => {
      secureLogger.security('Sensitive operation rate limit exceeded', {
        retryAfter: result.retryAfter,
        severity: 'critical'
      });
    }
  })
};

/**
 * Higher-order function for API route handlers
 */
export function withRateLimitHandler(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options: RateLimitMiddlewareOptions
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const rateLimitResult = await withRateLimit(request, options);
    
    if (!rateLimitResult.allowed && rateLimitResult.response) {
      return rateLimitResult.response;
    }
    
    try {
      const response = await handler(request, ...args);
      
      // Add rate limit headers to the response
      if (rateLimitResult.response && rateLimitResult.response.headers) {
        rateLimitResult.response.headers.forEach((value, key) => {
          response.headers.set(key, value);
        });
      }
      
      return response;
      
    } catch (error) {
      // If request fails and we're not counting failed requests, don't increment
      if (options.skipFailedRequests) {
        // Reset the count for this request
        const identifier = options.identifierGenerator 
          ? options.identifierGenerator(request)
          : generateDefaultIdentifier(request);
        rateLimiter.reset(identifier);
      }
      
      throw error;
    }
  };
}