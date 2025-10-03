import { Timestamp } from 'firebase/firestore';

/**
 * Safely converts a timestamp or timestamp-like object to milliseconds
 * Handles both Firestore Timestamp objects and plain objects with _seconds and _nanoseconds
 */
export function toMillis(timestamp: any): number {
  if (!timestamp) {
    return 0;
  }
  
  // If it's already a Firestore Timestamp, use its toMillis method
  if (timestamp.toMillis && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  
  // If it's a plain object with _seconds and _nanoseconds (Firestore serialization format)
  if (timestamp._seconds !== undefined && timestamp._nanoseconds !== undefined) {
    return timestamp._seconds * 1000 + Math.floor(timestamp._nanoseconds / 1000000);
  }
  
  // If it's a Date object
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  
  // If it's a number (already in milliseconds)
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  
  // Fallback: try to parse as date string
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }
  
  console.warn('Unable to convert timestamp to milliseconds:', timestamp);
  return 0;
}

/**
 * Safely converts a timestamp or timestamp-like object to a Date object
 */
export function toDate(timestamp: any): Date {
  const millis = toMillis(timestamp);
  return new Date(millis);
}

/**
 * Safely creates a Firestore Timestamp from various input types
 */
export function toTimestamp(input: any): Timestamp {
  if (input instanceof Timestamp) {
    return input;
  }
  
  if (input instanceof Date) {
    return Timestamp.fromDate(input);
  }
  
  if (typeof input === 'number') {
    return Timestamp.fromMillis(input);
  }
  
  // If it's a plain object with _seconds and _nanoseconds
  if (input && typeof input === 'object' && '_seconds' in input && '_nanoseconds' in input) {
    return new Timestamp(input._seconds, input._nanoseconds);
  }
  
  // Fallback to current time
  console.warn('Unable to convert to Timestamp, using current time:', input);
  return Timestamp.now();
}

/**
 * Safely compares two timestamps
 */
export function compareTimestamps(a: any, b: any): number {
  const aMillis = toMillis(a);
  const bMillis = toMillis(b);
  return aMillis - bMillis;
}

/**
 * Safely formats a timestamp for display
 */
export function formatTimestamp(timestamp: any, options?: Intl.DateTimeFormatOptions): string {
  const date = toDate(timestamp);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  });
}

/**
 * Safely formats a timestamp with time for display
 */
export function formatTimestampWithTime(timestamp: any, options?: Intl.DateTimeFormatOptions): string {
  const date = toDate(timestamp);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  });
}

/**
 * Formats currency amount in Indian Rupees
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}