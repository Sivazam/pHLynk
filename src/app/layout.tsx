import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PharmaLync - Verify. Collect. Track",
  description: "Modern pharmaceutical management system built with Firebase authentication and Firestore database. Manage products, inventory, and user accounts securely.",
  keywords: ["PharmaLync", "Pharmacy", "Medical", "Inventory", "Firebase", "Next.js", "TypeScript"],
  authors: [{ name: "PharmaLync Team" }],
  openGraph: {
    title: "PharmaLync - Verify. Collect. Track",
    description: "Comprehensive pharmacy management system with modern web technologies",
    url: "https://PharmaLynck.firebaseapp.com",
    siteName: "PharmaLync",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PharmaLync - Verify. Collect. Track",
    description: "Comprehensive pharmacy management system with modern web technologies",
  },
  manifest: "/manifest.json",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "PharmaLync",
    "format-detection": "telephone=no",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // PWA Detection and Loading Screen with Cache Busting
              (function() {
                // Stable version identifier - only change when actual updates are deployed
                const APP_VERSION = 'PharmaLync-v3-1.0.0';
                
                // Check if running as PWA (standalone mode)
                const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                             window.navigator.standalone ||
                             document.referrer.includes('android-app://');
                
                // If PWA and first load, redirect to loading screen
                if (isPWA && !sessionStorage.getItem('pwaLoaded')) {
                  sessionStorage.setItem('pwaLoaded', 'true');
                  window.location.href = '/pwa-loading';
                }
                
                // Service Worker Registration with Cache Busting
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    // Check for version mismatch and force update if needed
                    const storedVersion = localStorage.getItem('PharmaLync-version');
                    if (storedVersion && storedVersion !== APP_VERSION) {
                      // Force clear old caches and update service worker
                      if ('caches' in window) {
                        caches.keys().then(cacheNames => {
                          return Promise.all(
                            cacheNames.map(cacheName => {
                              if (cacheName.startsWith('pharmalynk-')) {
                                return caches.delete(cacheName);
                              }
                            })
                          );
                        });
                      }
                      // Unregister old service worker
                      navigator.serviceWorker.getRegistrations().then(registrations => {
                        registrations.forEach(registration => {
                          registration.unregister();
                        });
                      }).then(() => {
                        // Register new service worker
                        registerServiceWorker();
                      });
                    } else {
                      // Register service worker normally
                      registerServiceWorker();
                    }
                    
                    // Store current version
                    localStorage.setItem('PharmaLync-version', APP_VERSION);
                  });
                }
                
                function registerServiceWorker() {
                  navigator.serviceWorker.register('/sw.js?v=' + APP_VERSION)
                    .then(function(registration) {
                      console.log('ServiceWorker registration successful', { 
                        scope: registration.scope,
                        version: APP_VERSION 
                      });
                      
                      // Listen for updates - but only show notification if it's a genuine update
                      registration.addEventListener('updatefound', () => {
                        const installingWorker = registration.installing;
                        installingWorker.addEventListener('statechange', () => {
                          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Check if this is a genuine update by comparing versions
                            fetch('/sw.js?v=' + Date.now())
                              .then(response => response.text())
                              .then(swContent => {
                                // Extract version from service worker content
                                const versionMatch = swContent.match(/const CACHE_VERSION = '([^']+)'/);
                                if (versionMatch && versionMatch[1] !== APP_VERSION) {
                                  // This is a genuine update with a different version
                                  console.log('New version available, automatically reloading...', { 
                                    oldVersion: APP_VERSION, 
                                    newVersion: versionMatch[1] 
                                  });
                                  
                                  // Show loading notification
                                  showUpdateNotification();
                                  
                                  // Wait a moment for the notification to be seen, then reload
                                  setTimeout(() => {
                                    window.location.reload();
                                  }, 2000);
                                } else {
                                  // Not a genuine update, just a service worker reload
                                  console.log('Service worker reloaded, no version change');
                                }
                              })
                              .catch(error => {
                                console.error('Failed to check service worker version:', error);
                              });
                          }
                        });
                      });
                    })
                    .catch(function(err) {
                      console.error('ServiceWorker registration failed', err);
                    });
                }
                
                // Show update notification
                function showUpdateNotification() {
                  // Remove any existing notification
                  const existingNotification = document.querySelector('[data-update-notification]');
                  if (existingNotification) {
                    existingNotification.remove();
                  }
                  
                  // Create notification element
                  const notification = document.createElement('div');
                  notification.setAttribute('data-update-notification', 'true');
                  notification.style.cssText = \`
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #3b82f6;
                    color: white;
                    padding: 16px 24px;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    z-index: 10000;
                    font-family: system-ui, -apple-system, sans-serif;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    animation: slideIn 0.3s ease-out;
                  \`;
                  
                  // Add loading spinner
                  notification.innerHTML = \`
                    <div style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top: 2px solid white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <span>Loading updated version...</span>
                  \`;
                  
                  // Add animation styles
                  if (!document.querySelector('#update-notification-styles')) {
                    const style = document.createElement('style');
                    style.id = 'update-notification-styles';
                    style.textContent = \`
                      @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                      }
                      @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                      }
                    \`;
                    document.head.appendChild(style);
                  }
                  
                  document.body.appendChild(notification);
                }
                
                // Listen for cache cleared messages from service worker
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.addEventListener('message', event => {
                    if (event.data && event.data.type === 'CACHE_CLEARED') {
                      console.log('Cache cleared by service worker');
                      // Optionally reload the page
                      window.location.reload();
                    }
                  });
                }
                
                // Manual cache bust function (can be called from dev tools)
                window.forceCacheBust = function() {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.controller.postMessage({ type: 'CACHE_BUST' });
                  }
                };
                
                // Debug function to force update (remove in production)
                window.addEventListener('keydown', function(e) {
                  if (e.ctrlKey && e.shiftKey && e.key === 'U') {
                    localStorage.removeItem('PharmaLync-version');
                    window.forceCacheBust();
                    console.log('Manual cache bust triggered');
                  }
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
