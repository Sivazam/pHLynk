/**
 * Device Manager Utility
 * 
 * This utility provides proper device management for multi-device scenarios.
 * It ensures that logout only removes the current device, not all devices.
 */

import { auth } from '@/lib/firebase';

export interface DeviceInfo {
  token: string;
  userAgent: string;
  lastActive: string;
  deviceId: string;
}

/**
 * Get the current device's unique identifier
 */
export function getCurrentDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  
  // Create a unique device ID based on browser fingerprint
  const userAgent = navigator.userAgent;
  const screenDimensions = `${window.screen.width}x${window.screen.height}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Create a simple hash
  const str = `${userAgent}|${screenDimensions}|${timezone}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `device_${Math.abs(hash)}`;
}

/**
 * Get the current FCM token from localStorage
 */
export function getCurrentFCMToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fcmToken');
}

/**
 * Store the current device's FCM token with device ID
 */
export function storeCurrentDeviceToken(token: string): void {
  if (typeof window === 'undefined') return;
  
  const deviceId = getCurrentDeviceId();
  const deviceInfo = {
    token,
    deviceId,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  };
  
  localStorage.setItem('currentDevice', JSON.stringify(deviceInfo));
  localStorage.setItem('fcmToken', token);
  
  console.log('📱 Stored current device info:', {
    deviceId,
    tokenPrefix: token.substring(0, 20) + '...'
  });
}

/**
 * Get the current device's information
 */
export function getCurrentDeviceInfo(): DeviceInfo | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem('currentDevice');
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Clear the current device's information (called during logout)
 */
export function clearCurrentDeviceInfo(): void {
  if (typeof window === 'undefined') return;
  
  const deviceInfo = getCurrentDeviceInfo();
  if (deviceInfo) {
    console.log('🗑️ Clearing current device info:', {
      deviceId: deviceInfo.deviceId,
      tokenPrefix: deviceInfo.token.substring(0, 20) + '...'
    });
  }
  
  localStorage.removeItem('currentDevice');
  localStorage.removeItem('fcmToken');
}

/**
 * Check if the current device is registered for notifications
 */
export function isCurrentDeviceRegistered(): boolean {
  const token = getCurrentFCMToken();
  const deviceInfo = getCurrentDeviceInfo();
  
  return !!(token && deviceInfo && deviceInfo.token === token);
}

/**
 * Log device information for debugging
 */
export function logDeviceInfo(): void {
  if (typeof window === 'undefined') return;
  
  const deviceInfo = getCurrentDeviceInfo();
  const token = getCurrentFCMToken();
  
  console.log('📱 Device Info Debug:', {
    deviceId: deviceInfo?.deviceId || 'unknown',
    hasToken: !!token,
    tokenPrefix: token ? token.substring(0, 20) + '...' : 'none',
    isRegistered: isCurrentDeviceRegistered(),
    userAgent: navigator.userAgent.substring(0, 50) + '...'
  });
}