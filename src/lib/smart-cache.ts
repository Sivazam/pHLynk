// Smart caching utilities for performance optimization
class SmartCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired cache entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  set(key: string, data: any, ttlMs: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Global cache instance
export const smartCache = new SmartCache();

// Cache key generators
export const cacheKeys = {
  payment: (id: string) => `payment:${id}`,
  retailerUser: (retailerId: string) => `retailer_user:${retailerId}`,
  lineWorker: (id: string) => `line_worker:${id}`,
  wholesaler: (tenantId: string) => `wholesaler:${tenantId}`,
  verificationData: (paymentId: string, retailerId: string) => `verification:${paymentId}:${retailerId}`,
  firebaseFunction: (name: string) => `firebase_function:${name}`
};

// TTL constants (in milliseconds)
export const cacheTTL = {
  payment: 30 * 1000,        // 30 seconds
  userData: 5 * 60 * 1000,   // 5 minutes
  verificationData: 20 * 1000, // 20 seconds
  firebaseFunction: 60 * 60 * 1000 // 1 hour
};