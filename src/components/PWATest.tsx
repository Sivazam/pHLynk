'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Download, Smartphone, Monitor } from 'lucide-react';

export function PWATest() {
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [displayMode, setDisplayMode] = useState('Browser');

  useEffect(() => {
    // Check if PWA is already installed
    setIsPWAInstalled(window.matchMedia('(display-mode: standalone)').matches);
    
    // Set display mode
    setDisplayMode(window.matchMedia('(display-mode: standalone)').matches ? 'Standalone' : 'Browser');
    
    // Check online status
    setIsOnline(navigator.onLine);
    
    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsPWAInstalled(true);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    };
    
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            PWA Status Check
          </CardTitle>
          <CardDescription>
            Check the Progressive Web App functionality and installation status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Installation Status */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              {isPWAInstalled ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
              <span className="font-medium">PWA Installation</span>
            </div>
            <span className={`text-sm ${isPWAInstalled ? 'text-green-600' : 'text-yellow-600'}`}>
              {isPWAInstalled ? 'Installed' : 'Not Installed'}
            </span>
          </div>

          {/* Online Status */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">Connection Status</span>
            </div>
            <span className={`text-sm ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Install Prompt */}
          {showInstallPrompt && (
            <Alert className="border-blue-200 bg-blue-50">
              <Download className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="flex items-center justify-between">
                  <span>This app can be installed on your device!</span>
                  <Button size="sm" onClick={handleInstall} className="ml-2">
                    Install
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Display Mode */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Display Mode</span>
            </div>
            <span className="text-sm text-blue-600">
              {displayMode}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Installation Instructions */}
      {!isPWAInstalled && (
        <Card>
          <CardHeader>
            <CardTitle>How to Install</CardTitle>
            <CardDescription>
              Install this app on your device for better experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p><strong>Chrome (Android):</strong> Tap the menu icon → "Add to Home screen"</p>
              <p><strong>Safari (iOS):</strong> Tap the share icon → "Add to Home Screen"</p>
              <p><strong>Chrome (Desktop):</strong> Click the install icon in the address bar</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}