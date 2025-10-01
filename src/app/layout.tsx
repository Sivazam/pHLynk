import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

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
  title: "pHLynk - Verify. Collect. Track",
  description: "Modern pharmaceutical management system built with Firebase authentication and Firestore database. Manage products, inventory, and user accounts securely.",
  keywords: ["pHLynk", "Pharmacy", "Medical", "Inventory", "Firebase", "Next.js", "TypeScript"],
  authors: [{ name: "pHLynk Team" }],
  openGraph: {
    title: "pHLynk - Verify. Collect. Track",
    description: "Comprehensive pharmacy management system with modern web technologies",
    url: "https://pHLynk.firebaseapp.com",
    siteName: "pHLynk",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "pHLynk - Verify. Collect. Track",
    description: "Comprehensive pharmacy management system with modern web technologies",
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  manifest: "/manifest.json",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "pHLynk",
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
          <PWAInstallPrompt />
          {children}
        </AuthProvider>
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // PWA Detection and Loading Screen with Cache Busting
              (function() {
                // Stable version identifier - UPDATE THIS FOR EACH DEPLOYMENT
                const APP_VERSION = 'pHLynk-v3-1.1.0';
                
                // Check if running as PWA (standalone mode)
                const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                             window.navigator.standalone ||
                             document.referrer.includes('android-app://');
                
                // If PWA and first load, redirect to loading screen
                if (isPWA && !sessionStorage.getItem('pwaLoaded')) {
                  sessionStorage.setItem('pwaLoaded', 'true');
                  // Initialize background notifications for PWA
                  if ('Notification' in window && Notification.permission === 'granted') {
                    console.log('📱 PWA detected, notifications already enabled');
                  }
                  window.location.href = '/pwa-loading';
                }
                
                // Service Worker Registration with Cache Busting
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    // DISABLED: Version checking to prevent infinite reload loops
                    // const storedVersion = localStorage.getItem('pHLynk-version');
                    // if (storedVersion && storedVersion !== APP_VERSION) {
                    //   // Version checking disabled
                    // }
                    
                    // Store current version without checking
                    localStorage.setItem('pHLynk-version', APP_VERSION);
                    
                    // Register service worker normally
                    registerServiceWorker();
                    
                    // Initialize background notifications for PWA
                    if (isPWA && 'Notification' in window) {
                      if (Notification.permission === 'default') {
                        // Request permission for PWA users
                        Notification.requestPermission().then(permission => {
                          if (permission === 'granted') {
                            console.log('📱 Background notifications enabled for PWA');
                          }
                        });
                      } else if (Notification.permission === 'granted') {
                        console.log('📱 Background notifications already enabled for PWA');
                      }
                    }
                  });
                }
                
                function registerServiceWorker() {
                  navigator.serviceWorker.register('/sw.js?v=' + APP_VERSION)
                    .then(function(registration) {
                      console.log('ServiceWorker registration successful', { 
                        scope: registration.scope,
                        version: APP_VERSION 
                      });
                      
                      // Listen for updates - DISABLED to prevent infinite reload loops
                      // registration.addEventListener('updatefound', () => {
                      //   const installingWorker = registration.installing;
                      //   installingWorker.addEventListener('statechange', () => {
                      //     if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      //       // Version checking logic disabled to prevent reload loops
                      //       console.log('Service worker updated, but automatic reload disabled');
                      //     }
                      //   });
                      // });
                    })
                    .catch(function(err) {
                      console.error('ServiceWorker registration failed', err);
                    });
                }
                
                // Show update notification - DISABLED to prevent infinite reload loops
                // function showUpdateNotification() {
                //   // Function removed to prevent automatic reloads
                // }
                
                // Remove any existing update notification that might be stuck
                if (typeof window !== 'undefined') {
                  const existingNotification = document.querySelector('[data-update-notification]');
                  if (existingNotification) {
                    existingNotification.remove();
                  }
                  
                  // Clear problematic version storage to prevent reload loops
                  localStorage.removeItem('pHLynk-version');
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
                    localStorage.removeItem('pHLynk-version');
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
