'use client';

import { getMessaging, getToken as getFCMTokenFromFirebase, onMessage } from 'firebase/messaging';
import { initializeApp } from 'firebase/app';
import { auth } from '@/lib/firebase';

// Firebase configuration - using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCK6Q5h9C7wE5rJ6k2vF8lG9mH3pK4q7r8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pharmalynkk.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pharmalynkk",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "pharmalynkk.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "877118992574",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:877118992574:web:abc123def456ghi789",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX"
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

  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID !== undefined
  );
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
 * Register service worker for FCM
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('⚠️ Service workers are not supported');
    return null;
  }

  try {
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

    // Get VAPID key from environment variables
    const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || "BPSKS7O0fnRC92iiqklOjZ8WcYrYrkJ1Dn6kr_9MnnKbPhU9i5sQ1BtL6RLZwBAYs37EOG3eCwD6AdIVE4ycNrA";
    if (!vapidKey) {
      console.warn('⚠️ FCM VAPID key not configured');
      return null;
    }

    // Get FCM token
    const token = await getFCMTokenFromFirebase(messaging, { vapidKey });
    
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
export async function initializeFCM(): Promise<string | null> {
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

    // Register device with backend
    try {
      const response = await fetch('/api/fcm/register-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailerId: auth.currentUser.uid,
          deviceToken: token,
          userAgent: navigator.userAgent
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Device registered with FCM backend:', result);
        return token;
      } else {
        console.warn('⚠️ Failed to register device with FCM backend:', response.status);
        return token; // Still return token even if backend registration fails
      }
    } catch (backendError) {
      console.warn('⚠️ Error registering device with FCM backend:', backendError);
      return token; // Still return token even if backend registration fails
    }
  } catch (error) {
    console.error('❌ Error initializing FCM:', error);
    return null;
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
    const messaging = getMessagingInstance();
    if (!messaging) {
      return false;
    }

    // Note: Firebase doesn't provide a direct way to delete tokens in the current SDK
    // Instead, we should unregister the device from our backend
    if (auth.currentUser) {
      try {
        const token = await getFCMToken();
        if (token) {
          await fetch('/api/fcm/unregister-device', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              retailerId: auth.currentUser.uid,
              deviceToken: token
            })
          });
        }
      } catch (error) {
        console.warn('⚠️ Error unregistering device from backend:', error);
      }
    }

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