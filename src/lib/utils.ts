import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Clean phone number by removing hidden Unicode characters
 * that can cause display issues (e.g., \u202c POP DIRECTIONAL FORMATTING)
 */
export function cleanPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  // Remove hidden Unicode characters that can cause display issues
  return phone.replace(/[\u200B-\u200D\u202A-\u202E\u2060-\u2064\u202C\u202D\u2066-\u206F]/g, '')
    .trim();
}

/**
 * Normalize phone number by:
 * 1. Removing all non-digit characters
 * 2. Stripping leading country codes (0, 91, +91)
 * 3. Returning the last 10 digits
 * 
 * Examples:
 * - "+919876543210" → "9876543210"
 * - "919876543210" → "9876543210"
 * - "09876543210" → "9876543210"
 * - "9876543210" → "9876543210"
 */
export function normalizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';

  // Step 1: Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // Step 2: Handle country code prefixes
  // If starts with 91 and is longer than 10 digits, strip it
  if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  // If starts with 0 and is 11 digits, strip it
  else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Step 3: Return last 10 digits if still longer
  if (digits.length > 10) {
    digits = digits.slice(-10);
  }

  return digits;
}
