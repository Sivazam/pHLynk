/**
 * Error handling utilities for the application
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly details?: any;
  public readonly retryable: boolean;

  constructor(code: string, message: string, details?: any, retryable = false) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.retryable = retryable;
  }
}

export const ErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // Authorization errors
  ACCESS_DENIED: 'ACCESS_DENIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  OFFLINE: 'OFFLINE',
  
  // Data errors
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  DATA_INCONSISTENCY: 'DATA_INCONSISTENCY',
  
  // Business logic errors
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  RETAILER_NOT_FOUND: 'RETAILER_NOT_FOUND',
  AREA_NOT_FOUND: 'AREA_NOT_FOUND',
  INVOICE_NOT_FOUND: 'INVOICE_NOT_FOUND',
  
  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
} as const;

/**
 * Wrap async functions with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorHandler?: (error: Error) => void
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorHandler) {
        errorHandler(error as Error);
      } else {
        console.error('Error in wrapped function:', error);
      }
      throw error;
    }
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
  backoffFactor = 2
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.retryable;
  }
  
  // Network errors are typically retryable
  if (error.message.includes('network') || 
      error.message.includes('timeout') || 
      error.message.includes('offline')) {
    return true;
  }
  
  return false;
}

/**
 * Create user-friendly error messages
 */
export function getUserFriendlyMessage(error: Error): string {
  if (error instanceof AppError) {
    switch (error.code) {
      case ErrorCodes.UNAUTHORIZED:
        return 'Please log in to continue';
      case ErrorCodes.ACCESS_DENIED:
        return 'You don\'t have permission to perform this action';
      case ErrorCodes.NETWORK_ERROR:
        return 'Network error. Please check your connection';
      case ErrorCodes.TIMEOUT:
        return 'Request timed out. Please try again';
      case ErrorCodes.NOT_FOUND:
        return 'The requested resource was not found';
      case ErrorCodes.VALIDATION_ERROR:
        return 'Please check your input and try again';
      case ErrorCodes.PAYMENT_FAILED:
        return 'Payment failed. Please try again';
      case ErrorCodes.RATE_LIMIT_EXCEEDED:
        return 'Too many requests. Please wait and try again';
      default:
        return error.message || 'An unexpected error occurred';
    }
  }
  
  // Handle Firebase specific errors
  if (error.name === 'FirebaseError') {
    switch ((error as any).code) {
      case 'auth/user-not-found':
        return 'User not found';
      case 'auth/wrong-password':
        return 'Invalid password';
      case 'auth/email-already-in-use':
        return 'Email already in use';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/weak-password':
        return 'Password is too weak';
      case 'firestore/permission-denied':
        return 'You don\'t have permission to access this data';
      case 'firestore/not-found':
        return 'Data not found';
      case 'firestore/unavailable':
        return 'Service temporarily unavailable';
      default:
        return error.message || 'A database error occurred';
    }
  }
  
  return error.message || 'An unexpected error occurred';
}

/**
 * Log errors with context
 */
export function logError(error: Error, context?: any): void {
  const errorData = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: (error as any).code,
    context,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server'
  };
  
  console.error('Error logged:', errorData);
  
  // Here you could send errors to a monitoring service
  // if (typeof window !== 'undefined') {
  //   sendToErrorMonitoring(errorData);
  // }
}

/**
 * Handle edge cases for data operations
 */
export const EdgeCaseHandlers = {
  // Handle empty or null data
  ensureArray: <T>(data: T[] | null | undefined): T[] => {
    return Array.isArray(data) ? data : [];
  },
  
  // Handle numeric values
  ensureNumber: (value: any, defaultValue = 0): number => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  },
  
  // Handle string values
  ensureString: (value: any, defaultValue = ''): string => {
    return typeof value === 'string' ? value : defaultValue;
  },
  
  // Handle boolean values
  ensureBoolean: (value: any, defaultValue = false): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return defaultValue;
  },
  
  // Handle date values
  ensureDate: (value: any): Date | null => {
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  },
  
  // Handle Firestore timestamps
  ensureTimestamp: (value: any): any => {
    if (!value) return null;
    if (value.toDate && typeof value.toDate === 'function') {
      return value; // Already a Firestore Timestamp
    }
    if (value.seconds !== undefined && value.nanoseconds !== undefined) {
      return value; // Serialized timestamp
    }
    return null;
  }
};

/**
 * Validate data integrity
 */
export function validateDataIntegrity(data: any, requiredFields: string[]): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  return requiredFields.every(field => {
    const value = data[field];
    return value !== undefined && value !== null && value !== '';
  });
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[^\w\s\-_.@]/g, ''); // Allow only safe characters
}

/**
 * Debounce function for performance
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}