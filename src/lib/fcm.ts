'use client';

import { getMessaging, getToken as getFCMTokenFromFirebase, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import { auth } from '@/lib/firebase';
import { storeCurrentDeviceToken, clearCurrentDeviceInfo, isCurrentDeviceRegistered, getCurrentDeviceInfo, getCurrentDeviceId } from '@/lib/device-manager';

// Firebase configuration - should match your existing config
const firebaseConfig = {
  apiKey: "AIzaSyCdOIhLQh9iYBXbE7dre2J9zsmCBuVdwwU",
  authDomain: "plkapp-8c052.firebaseapp.com",
  projectId: "plkapp-8c052",
  storageBucket: "plkapp-8c052.firebasestorage.app",
  messagingSenderId: "333526318951",
  appId: "1:333526318951:web:a8f30f497e7060e264b9c2"
};

// Initialize Firebase app for messaging
let firebaseApp: any = null;
let messagingInstance: any = null;

/**
 * Initialize Firebase app for messaging
 */
function initializeFirebaseApp() {
  if (!firebaseApp && typeof window !== 'undefined') {
    try {
      firebaseApp = initializeApp(firebaseConfig, 'fcm-app');
      console.log('✅ Firebase app initialized for FCM');
    } catch (error) {
      console.error('❌ Error initializing Firebase app for FCM:', error);
    }
  }
  return firebaseApp;
}

/**
 * Get Firebase Messaging instance
 */
export function getMessagingInstance() {
  if (!messagingInstance && typeof window !== 'undefined') {
    try {
      const app = initializeFirebaseApp();
      if (app) {
        messagingInstance = getMessaging(app);
        console.log('✅ Firebase Messaging instance created');
      }
    } catch (error) {
      console.error('❌ Error creating Firebase Messaging instance:', error);
    }
  }
  return messagingInstance;
}

/**
 * Check if FCM is supported in the current environment
 */
export function isFCMSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;
  const hasNotification = 'Notification' in window;
  const hasSenderId = "333526318951"; // Hardcoded sender ID

  console.log('🔧 FCM Support Check:', {
    hasServiceWorker,
    hasPushManager,
    hasNotification,
    hasSenderId,
    isSecure: location.protocol === 'https:' || location.hostname === 'localhost'
  });

  return (
    hasServiceWorker &&
    hasPushManager &&
    hasNotification &&
    hasSenderId &&
    (location.protocol === 'https:' || location.hostname === 'localhost')
  );
}

/**
 * Request notification permission and register device in one flow
 * This is the recommended function to use during login/signup
 */
export async function requestNotificationPermissionAndRegisterDevice(retailerId?: string): Promise<string | null> {
  try {
    console.log('🔔 Requesting notification permission and registering device...');
    
    // Request notification permission first
    const permission = await requestNotificationPermission();
    console.log('🔔 Notification permission granted:', permission);
    
    // Initialize FCM and register device
    const token = await initializeFCM(retailerId);
    
    if (token) {
      console.log('✅ Device registered successfully with FCM token');
      return token;
    } else {
      console.warn('⚠️ Failed to register device after permission granted');
      return null;
    }
  } catch (error) {
    console.error('❌ Error in permission request and device registration flow:', error);
    throw error;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isFCMSupported()) {
    throw new Error('Push notifications are not supported in this environment');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission was denied. Please enable it in your browser settings.');
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('🔔 Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    throw error;
  }
}

/**
 * Force Service Worker update (temporary fix for FCM issues)
 * This will unregister all existing Service Workers and register with cache-busting
 */
export async function forceServiceWorkerUpdate(): Promise<{ success: boolean; message: string }> {
  // Ensure this only runs on client side
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return {
      success: false,
      message: 'Service Workers not supported in this environment'
    };
  }

  try {
    console.log('🔄 Starting forced Service Worker update...');
    
    // Unregister all existing Service Workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      if (registration.active?.scriptURL.includes('firebase-messaging-sw')) {
        console.log('🗑️ Unregistering old Service Worker:', registration.active?.scriptURL);
        await registration.unregister();
      }
    }
    
    // Register with cache-busting to force update
    const cacheBuster = Date.now();
    const swUrl = `/firebase-messaging-sw.js?v=${cacheBuster}`;
    
    const registration = await navigator.serviceWorker.register(swUrl);
    console.log('✅ New Service Worker registered with cache-buster:', swUrl);
    
    // Force the new service worker to activate
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    
    return { 
      success: true, 
      message: 'Service Worker updated successfully. Please refresh the page.' 
    };
    
  } catch (error) {
    console.error('❌ Error forcing Service Worker update:', error);
    return { 
      success: false, 
      message: 'Failed to update Service Worker: ' + (error instanceof Error ? error.message : 'Unknown error') 
    };
  }
}

/**
 * Register service worker for FCM
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service workers are not supported');
    return null;
  }

  try {
    // Normal Service Worker registration - no cache-busting
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    console.log('✅ Service worker registered for FCM:', registration.scope);
    return registration;
  } catch (error) {
    console.error('❌ Error registering service worker:', error);
    return null;
  }
}

/**
 * Get FCM token
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    if (!isFCMSupported()) {
      console.warn('⚠️ FCM is not supported in this environment');
      return null;
    }

    // Request notification permission first
    await requestNotificationPermission();

    // Register service worker
    const registration = await registerServiceWorker();
    if (!registration) {
      console.warn('⚠️ Failed to register service worker');
      return null;
    }

    // Get messaging instance
    const messaging = getMessagingInstance();
    if (!messaging) {
      console.warn('⚠️ Firebase Messaging instance not available');
      return null;
    }

    // Get VAPID key from environment or use placeholder
    const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || null;
    if (!vapidKey) {
      console.warn('⚠️ FCM VAPID key not configured - using token generation without VAPID');
      // Continue without VAPID key for testing
    }

    // Get FCM token
    let token;
    if (vapidKey) {
      token = await getFCMTokenFromFirebase(messaging, { vapidKey });
    } else {
      try {
        // Try without VAPID key first
        token = await getFCMTokenFromFirebase(messaging);
      } catch (error) {
        console.warn('⚠️ Failed to get FCM token without VAPID key:', error);
        return null;
      }
    }
    
    if (token) {
      console.log('✅ FCM token obtained successfully');
      return token;
    } else {
      console.warn('⚠️ Failed to get FCM token');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
}

/**
 * Initialize FCM and register device token
 */
export async function initializeFCM(retailerId?: string): Promise<string | null> {
  try {
    if (!auth.currentUser) {
      console.warn('⚠️ User not authenticated, cannot initialize FCM');
      return null;
    }

    console.log('🔧 Initializing FCM for user:', auth.currentUser.uid);

    // Get FCM token
    const token = await getFCMToken();
    
    if (!token) {
      console.warn('⚠️ Failed to get FCM token');
      return null;
    }

    // Check if token is already registered
    const isAlreadyRegistered = await checkIfTokenRegistered(token);
    
    if (isAlreadyRegistered) {
      console.log('✅ FCM token already registered, updating last active');
      await updateLastActive(token);
      return token;
    }

    // Register new token with backend
    try {
      // Use provided retailerId or fall back to auth.currentUser.uid
      const userId = retailerId || auth.currentUser.uid;
      
      console.log('🔔 Registering FCM device:', {
        userId,
        userIdType: retailerId ? 'retailerId' : 'auth.uid',
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20) + '...',
        userAgent: navigator.userAgent.substring(0, 50) + '...'
      });
      
      const response = await fetch('/api/fcm/register-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailerId: userId,
          deviceToken: token,
          userAgent: navigator.userAgent,
          isNewUser: false, // Flag for returning users
          timestamp: new Date().toISOString()
        })
      });

      console.log('📡 FCM registration response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Device registered with FCM backend:', result);
        
        // Store current device info for proper logout handling
        storeCurrentDeviceToken(token);
        
        return token;
      } else {
        const errorResult = await response.json();
        console.warn('⚠️ Failed to register device with FCM backend:', response.status, errorResult);
        
        // Still store the token locally even if backend registration fails
        storeCurrentDeviceToken(token);
        return token;
      }
    } catch (backendError) {
      console.warn('⚠️ Error registering device with FCM backend:', backendError);
      
      // Still store the token locally even if backend registration fails
      storeCurrentDeviceToken(token);
      return token;
    }
  } catch (error) {
    console.error('❌ Error initializing FCM:', error);
    return null;
  }
}

/**
 * Check if token is already registered for this user
 */
async function checkIfTokenRegistered(token: string): Promise<boolean> {
  try {
    if (!auth.currentUser) return false;
    
    const response = await fetch('/api/fcm/check-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token,
        userId: auth.currentUser.uid
      })
    });

    if (response.ok) {
      const result = await response.json();
      return result.exists;
    }
    return false;
  } catch (error) {
    console.error('Error checking token registration:', error);
    return false;
  }
}

/**
 * Update last active timestamp for existing token
 */
async function updateLastActive(token: string): Promise<void> {
  try {
    if (!auth.currentUser) return;
    
    await fetch('/api/fcm/update-last-active', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token,
        userId: auth.currentUser.uid
      })
    });
  } catch (error) {
    console.error('Error updating last active:', error);
  }
}

/**
 * Listen for foreground messages
 */
export function onMessageListener() {
  const messaging = getMessagingInstance();
  
  if (!messaging) {
    console.warn('⚠️ Firebase Messaging instance not available for foreground messages');
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('📱 FCM foreground message received:', payload);
      resolve(payload);
    });

    // Return unsubscribe function for cleanup
    return unsubscribe;
  });
}

/**
 * Delete FCM token (for logout)
 */
export async function deleteFCMToken(): Promise<boolean> {
  try {
    console.log('🗑️ Starting FCM token deletion process...');
    
    // Get current device info before deletion
    const deviceInfo = getCurrentDeviceInfo();
    if (deviceInfo) {
      console.log('📱 Current device info:', {
        deviceId: deviceInfo.deviceId,
        tokenPrefix: deviceInfo.token.substring(0, 20) + '...'
      });
    }
    
    const messaging = getMessagingInstance();
    if (!messaging) {
      console.warn('⚠️ Firebase Messaging instance not available for token deletion');
      return false;
    }

    // Get current token before attempting deletion
    let currentToken: string | null = null;
    try {
      currentToken = await getFCMToken();
      console.log('🔍 Current FCM token:', currentToken ? `${currentToken.substring(0, 20)}...` : 'null');
    } catch (tokenError) {
      console.warn('⚠️ Error getting current FCM token:', tokenError);
    }

    // Note: Firebase doesn't provide a direct way to delete tokens in the current SDK
    // Instead, we should unregister the device from our backend
    if (auth.currentUser && currentToken) {
      try {
        console.log('📡 Unregistering current device from backend...');
        
        // Try to get retailerId for proper device cleanup
        const retailerId = localStorage.getItem('retailerId') || auth.currentUser.uid;
        
        const response = await fetch('/api/fcm/unregister-device', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            retailerId: retailerId,
            deviceToken: currentToken,
            userId: auth.currentUser.uid
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Current device unregistered from backend:', result);
        } else {
          console.warn('⚠️ Backend unregistration failed:', response.status);
        }
      } catch (backendError) {
        console.warn('⚠️ Error unregistering device from backend:', backendError);
      }
    } else {
      console.warn('⚠️ No authenticated user or token available for unregistration');
    }

    // Clear current device info from localStorage
    clearCurrentDeviceInfo();

    // Note: No additional cleanup needed here as we only want to remove the current device
    // The cleanup API for all devices should only be called in specific scenarios
    console.log('✅ Current device unregistration completed');

    console.log('✅ FCM token deletion process completed');
    return true;
  } catch (error) {
    console.error('❌ Error deleting FCM token:', error);
    return false;
  }
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof Notification === 'undefined') {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled(): boolean {
  return getNotificationPermission() === 'granted' && isFCMSupported();
}

// Export types for TypeScript