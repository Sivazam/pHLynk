import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

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
  title: "PharmaLync - Pharmaceutical Management System",
  description: "Modern pharmaceutical management system built with Firebase authentication and Firestore database. Manage products, inventory, and user accounts securely.",
  keywords: ["PharmaLync", "Pharmacy", "Medical", "Inventory", "Firebase", "Next.js", "TypeScript"],
  authors: [{ name: "PharmaLync Team" }],
  openGraph: {
    title: "PharmaLync - Pharmaceutical Management",
    description: "Comprehensive pharmacy management system with modern web technologies",
    url: "https://PharmaLynck.firebaseapp.com",
    siteName: "PharmaLync",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PharmaLync - Pharmaceutical Management System",
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
                // Version identifier for cache busting
                const APP_VERSION = 'PharmaLync-v3-' + Date.now();
                
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
                              if (cacheName.startsWith('PharmaLync-')) {
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
                      logger.success('ServiceWorker registration successful', { 
                        scope: registration.scope,
                        version: APP_VERSION 
                      }, { context: 'PWA' });
                      
                      // Listen for updates
                      registration.addEventListener('updatefound', () => {
                        const installingWorker = registration.installing;
                        installingWorker.addEventListener('statechange', () => {
                          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available
                            logger.info('New version available', { version: APP_VERSION }, { context: 'PWA' });
                            // Optionally notify user or force reload
                            if (confirm('A new version is available. Reload to update?')) {
                              window.location.reload();
                            }
                          }
                        });
                      });
                    })
                    .catch(function(err) {
                      logger.error('ServiceWorker registration failed', err, { context: 'PWA' });
                    });
                }
                
                // Listen for cache cleared messages from service worker
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.addEventListener('message', event => {
                    if (event.data && event.data.type === 'CACHE_CLEARED') {
                      logger.info('Cache cleared by service worker', {}, { context: 'PWA' });
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
                    logger.info('Manual cache bust triggered', {}, { context: 'Debug' });
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
