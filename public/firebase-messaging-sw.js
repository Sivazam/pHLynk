// Firebase Cloud Messaging Service Worker
// This service worker handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

// Firebase configuration (hardcoded for service worker)
// Note: Service workers cannot access environment variables, so these values are required
const firebaseConfig = {
  apiKey: "AIzaSyCdOIhLQh9iYBXbE7dre2J9zsmCBuVdwwU",
  authDomain: "plkapp-8c052.firebaseapp.com",
  projectId: "plkapp-8c052",
  storageBucket: "plkapp-8c052.firebasestorage.app",
  messagingSenderId: "333526318951",
  appId: "1:333526318951:web:a8f30f497e7060e264b9c2"
};

// Initialize Firebase in the service worker
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('📱 FCM Background message received:', payload);

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

  // Show notification
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

// Handle push events (fallback)
self.addEventListener('push', (event) => {
  console.log('📱 Push event received:', event);

  if (!event.data) {
    console.warn('⚠️ Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('📱 Push data:', data);

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
});