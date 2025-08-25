import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "PharmaLynk - Pharmaceutical Management System",
  description: "Modern pharmaceutical management system built with Firebase authentication and Firestore database. Manage products, inventory, and user accounts securely.",
  keywords: ["PharmaLynk", "Pharmacy", "Medical", "Inventory", "Firebase", "Next.js", "TypeScript"],
  authors: [{ name: "PharmaLynk Team" }],
  openGraph: {
    title: "PharmaLynk - Pharmaceutical Management",
    description: "Comprehensive pharmacy management system with modern web technologies",
    url: "https://pharmalynkk.firebaseapp.com",
    siteName: "PharmaLynk",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PharmaLynk - Pharmaceutical Management System",
    description: "Comprehensive pharmacy management system with modern web technologies",
  },
  manifest: "/manifest.json",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "PharmaLynk",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // PWA Detection and Loading Screen
              (function() {
                // Check if running as PWA (standalone mode)
                const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                             window.navigator.standalone ||
                             document.referrer.includes('android-app://');
                
                // If PWA and first load, redirect to loading screen
                if (isPWA && !sessionStorage.getItem('pwaLoaded')) {
                  sessionStorage.setItem('pwaLoaded', 'true');
                  window.location.href = '/pwa-loading';
                }
                
                // Service Worker Registration
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js')
                      .then(function(registration) {
                        console.log('ServiceWorker registration successful with scope: ', registration.scope);
                      })
                      .catch(function(err) {
                        console.log('ServiceWorker registration failed: ', err);
                      });
                  });
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
