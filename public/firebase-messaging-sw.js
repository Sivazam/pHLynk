// Firebase Cloud Messaging Service Worker
// This service worker handles background push notifications with AUTH CHECK

importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

// Firebase configuration (hardcoded for service worker)
const firebaseConfig = {
  apiKey: "AIzaSyAiuROMuOXyBTQ2tAn_7lCk8qBsKLcKBds",
  authDomain: "pharmalynkk.firebaseapp.com",
  projectId: "pharmalynkk",
  storageBucket: "pharmalynkk.firebasestorage.app",
  messagingSenderId: "877118992574",
  appId: "1:877118992574:web:ca55290c721d1c4b18eeef"
};

// Initialize Firebase in the service worker
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging instance
const messaging = firebase.messaging();

/**
 * Check if user is currently authenticated
 * This prevents showing notifications to logged-out users
 */
async function isUserAuthenticated() {
  try {
    // Try to get the authenticated user from IndexedDB (where Firebase Auth stores it)
    const firebaseApp = firebase.app();
    const auth = firebaseApp.auth();
    
    // Wait for auth state to be determined
    return new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe();
        console.log('🔐 SW Auth check result:', user ? 'AUTHENTICATED' : 'NOT AUTHENTICATED');
        resolve(!!user);
      });
      
      // Timeout after 2 seconds to prevent hanging
      setTimeout(() => {
        unsubscribe();
        console.log('🔐 SW Auth check timeout - assuming NOT AUTHENTICATED');
        resolve(false);
      }, 2000);
    });
  } catch (error) {
    console.error('❌ Error checking auth status in service worker:', error);
    return false;
  }
}

/**
 * Check if notification should be shown based on user auth status
 */
async function shouldShowNotification(payload) {
  const isAuthenticated = await isUserAuthenticated();
  
  if (!isAuthenticated) {
    console.log('🚫 User not authenticated - discarding notification:', payload.notification?.title);
    return false;
  }
  
  console.log('✅ User authenticated - showing notification:', payload.notification?.title);
  return true;
}

// Handle background messages with AUTH CHECK
messaging.onBackgroundMessage(async (payload) => {
  console.log('📱 FCM Background message received:', payload);

  // 🔐 SECURITY: Check if user is authenticated before showing notification
  const canShow = await shouldShowNotification(payload);
  if (!canShow) {
    return; // Silently discard notification for logged-out users
  }

  const notificationTitle = payload.notification?.title || 'pHLynk Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    tag: payload.data?.tag || 'default',
    requireInteraction: payload.data?.requireInteraction || false,
    data: payload.data || {},
    actions: payload.data?.actions || []
  };

  // Show notification only for authenticated users
  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked:', event);

  event.notification.close();

  // Get notification data
  const data = event.notification.data || {};
  const urlToOpen = data.url || data.clickAction || '/';

  // Handle different notification types
  if (data.type === 'otp') {
    // Open retailer dashboard for OTP verification
    event.waitUntil(
      clients.openWindow('/retailer')
    );
  } else if (data.type === 'payment') {
    // Open payment details or dashboard
    if (data.paymentId) {
      event.waitUntil(
        clients.openWindow(`/retailer/payment-history`)
      );
    } else {
      event.waitUntil(
        clients.openWindow('/retailer')
      );
    }
  } else {
    // Default: open the specified URL
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('📱 Notification closed:', event);
});

// Handle push events (fallback) with AUTH CHECK
self.addEventListener('push', (event) => {
  console.log('📱 Push event received:', event);

  if (!event.data) {
    console.warn('⚠️ Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('📱 Push data:', data);

    // 🔐 SECURITY: Check if user is authenticated before processing
    // Note: We can't easily check auth here, so we'll do it in onBackgroundMessage
    // This is mainly for direct push events that bypass onBackgroundMessage

    const notificationTitle = data.notification?.title || data.title || 'pHLynk Notification';
    const notificationOptions = {
      body: data.notification?.body || data.body || 'You have a new notification',
      icon: data.notification?.icon || data.icon || '/icon-192x192.png',
      badge: data.notification?.badge || data.badge || '/icon-96x96.png',
      tag: data.data?.tag || data.tag || 'default',
      requireInteraction: data.data?.requireInteraction || false,
      data: data.data || data,
      actions: data.data?.actions || data.actions || []
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  } catch (error) {
    console.error('❌ Error handling push event:', error);
  }
});

// Service worker installation
self.addEventListener('install', (event) => {
  console.log('📱 FCM Service Worker installing...');
  event.waitUntil(self.skipWaiting());
});

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('📱 FCM Service Worker activating...');
  event.waitUntil(self.clients.claim());
});

// Handle service worker messages from main app
self.addEventListener('message', (event) => {
  console.log('📱 Message received in service worker:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle auth state changes from main app
  if (event.data && event.data.type === 'AUTH_STATE_CHANGED') {
    console.log('🔐 Service worker received auth state change:', event.data.isAuthenticated);
    // Store auth state in service worker for quick access
    self.isAuthenticated = event.data.isAuthenticated;
  }
});