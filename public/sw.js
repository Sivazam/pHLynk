const CACHE_NAME = 'pharmalynk-v2';
const urlsToCache = [
  '/',
  '/pwa-loading',
  '/splash.html',
  '/logoMain.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.ico'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // For navigation requests, try to return cached splash screen first
        if (event.request.mode === 'navigate') {
          // Check if this is a PWA launch and first load
          return caches.match('/splash.html').then(splashResponse => {
            if (splashResponse && shouldShowSplashScreen()) {
              return splashResponse;
            }
            return caches.match('/').then(mainResponse => {
              if (mainResponse) {
                return mainResponse;
              }
              return fetch(event.request);
            });
          });
        }
        
        return fetch(event.request).then(
          response => {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            var responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          }
        );
      })
  );
});

// Helper function to determine if splash screen should be shown
function shouldShowSplashScreen() {
  // This is a simplified check - in a real implementation, 
  // you might want to check headers or other indicators
  return true;
}

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});