// Stable cache version - only change when actual updates are deployed
const CACHE_VERSION = 'pharmalynk-v3-1.0.0';
const CACHE_NAME = CACHE_VERSION;
const STATIC_CACHE_NAME = 'pharmalynk-static-v3';
const RUNTIME_CACHE_NAME = 'pharmalynk-runtime-v3';

// Static assets that should be cached long-term
const STATIC_ASSETS = [
  '/logoMain.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.ico',
  '/manifest.json'
];

// Core pages that should be cached for offline use
const CORE_PAGES = [
  '/',
  '/pwa-loading'
];

// Cache busting query parameter for dynamic content
const CACHE_BUST_PARAM = '_v=' + CACHE_VERSION;

// Install event - cache static resources
self.addEventListener('install', event => {
  console.log('Service Worker installing with version:', CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Cache core pages
      caches.open(CACHE_NAME).then(cache => {
        console.log('Caching core pages');
        return cache.addAll(CORE_PAGES.map(url => url + '?' + CACHE_BUST_PARAM));
      })
    ])
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches and take control immediately
self.addEventListener('activate', event => {
  console.log('Service Worker activating with version:', CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE_NAME && 
                cacheName !== RUNTIME_CACHE_NAME &&
                cacheName.startsWith('pharmalynk-')) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all open clients immediately
      self.clients.claim()
    ])
  );
});

// Push notification event - handle OTP notifications
self.addEventListener('push', event => {
  console.log('📱 Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    console.log('Push notification data:', data);
    
    const options = {
      body: data.body || 'New notification received',
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      tag: data.tag || 'default',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      data: data.data || {},
      // Mobile-specific enhancements
      silent: false,
      vibrate: [200, 100, 200] // Vibration pattern for mobile
    };
    
    // Add sound if supported
    if ('sound' in Notification.prototype) {
      options.sound = '/notification-sound.mp3';
    }
    
    // Customize for OTP notifications
    if (data.type === 'otp') {
      options.body = `🔐 OTP: ${data.otp} for ₹${data.amount}`;
      options.tag = `otp-${data.paymentId}`;
      options.requireInteraction = true;
      options.actions = [
        {
          action: 'view',
          title: 'View OTP',
          icon: '/icon-96x96.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icon-96x96.png'
        }
      ];
    }
    
    // Customize for payment completion
    if (data.type === 'payment-completed' || data.type === 'payment_completed') {
      options.body = `✅ Payment of ₹${data.amount} completed successfully`;
      options.tag = `payment-${data.paymentId}`;
      options.requireInteraction = false;
    }
    
    // Customize for test notifications
    if (data.type === 'test') {
      options.body = '📱 This is a test notification from pHLynk';
      options.tag = 'test-notification';
      options.requireInteraction = false;
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'PharmaLync', options)
    );
  }
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', event => {
  console.log('📱 Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view' || event.action === 'open') {
    // Open the retailer dashboard or specific payment
    const urlToOpen = event.notification.data.url || '/';
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // Check if there's already a window open
          for (const client of clientList) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // If no window is open, open a new one
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
  
  // Handle dismiss action
  if (event.action === 'dismiss') {
    console.log('📱 Notification dismissed');
  }
});

// Notification close event
self.addEventListener('notificationclose', event => {
  console.log('📱 Notification closed:', event.notification.tag);
});

// Handle subscription to push notifications
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SUBSCRIBE_TO_PUSH') {
    console.log('📱 Subscribing to push notifications');
    
    event.waitUntil(
      self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.data.publicKey
      })
      .then(subscription => {
        console.log('✅ Push notification subscription successful');
        
        // Send subscription back to client
        event.ports[0].postMessage({
          type: 'SUBSCRIPTION_SUCCESS',
          subscription: subscription
        });
      })
      .catch(error => {
        console.error('❌ Push notification subscription failed:', error);
        
        event.ports[0].postMessage({
          type: 'SUBSCRIPTION_ERROR',
          error: error.message
        });
      })
    );
  }
  
  if (event.data && event.data.type === 'SEND_TEST_NOTIFICATION') {
    console.log('📱 Sending test notification');
    
    event.waitUntil(
      self.registration.showNotification('Test Notification', {
        body: 'This is a test notification from PharmaLync',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: 'test-notification'
      })
    );
  }
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    console.log('📱 Showing role-based notification:', event.data.payload);
    
    const payload = event.data.payload;
    
    // Enhanced notification options for mobile
    const notificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/icon-96x96.png',
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions || [],
      data: {
        type: event.data.type,
        originalData: event.data.originalData
      },
      // Mobile-specific enhancements
      silent: false,
      vibrate: [200, 100, 200] // Vibration pattern for mobile
    };
    
    // Add sound if supported
    if ('sound' in Notification.prototype) {
      notificationOptions.sound = '/notification-sound.mp3';
    }
    
    // Additional mobile-specific handling
    if (payload.tag && payload.tag.includes('otp')) {
      notificationOptions.requireInteraction = true;
    }
    
    event.waitUntil(
      self.registration.showNotification(payload.title, notificationOptions)
    );
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_BUST') {
    // Force clear all caches and reload
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('pharmalynk-')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Notify all clients to reload
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      });
    });
  }
});

// Fetch event - intelligent caching strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (STATIC_ASSETS.includes(url.pathname)) {
    // Static assets - try cache first, then network
    event.respondWith(handleStaticAsset(event.request));
  } else if (url.pathname === '/sw.js' || url.pathname === '/manifest.json') {
    // Service worker and manifest - always network first to get latest version
    event.respondWith(handleVersionedFiles(event.request));
  } else if (event.request.mode === 'navigate') {
    // Navigation requests - network first, fallback to cache
    event.respondWith(handleNavigationRequest(event.request));
  } else if (url.pathname.startsWith('/api/')) {
    // API requests - network only
    event.respondWith(handleApiRequest(event.request));
  } else {
    // Other requests - cache first with network fallback
    event.respondWith(handleRuntimeRequest(event.request));
  }
});

// Handle static assets (images, icons, etc.)
async function handleStaticAsset(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Static asset fetch failed:', error);
    throw error;
  }
}

// Handle versioned files (service worker, manifest)
async function handleVersionedFiles(request) {
  try {
    // Always fetch from network to get the latest version
    const response = await fetch(request);
    
    // Cache the response for future use
    if (response && response.status === 200) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Fallback to cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first for fresh content
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network request failed, trying cache for navigation');
    
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cached response, try to return the main page
    const mainPageResponse = await caches.match('/?' + CACHE_BUST_PARAM);
    if (mainPageResponse) {
      return mainPageResponse;
    }
    
    throw error;
  }
}

// Handle API requests
async function handleApiRequest(request) {
  // Always fetch from network for API requests
  return fetch(request);
}

// Handle runtime requests (other assets)
async function handleRuntimeRequest(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Runtime request failed:', error);
    throw error;
  }
}

// Message handler for communication from client
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_BUST') {
    // Force clear all caches and reload
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName.startsWith('pharmalynk-')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Notify all clients to reload
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      });
    });
  }
});