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
