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
      </body>
    </html>
  );
}
