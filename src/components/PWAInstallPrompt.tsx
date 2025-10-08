'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, X, Smartphone, Bell } from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [hasShownBefore, setHasShownBefore] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      const isInstalled = isStandalone || isInWebAppiOS;
      
      console.log('📱 PWA Installation Status:', {
        isStandalone,
        isInWebAppiOS,
        isInstalled
      });
      
      return isInstalled;
    };

    // Check if iOS device
    const checkIOS = () => {
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
      return isIOSDevice;
    };

    // Check if we've already shown the install prompt recently
    const checkIfShownRecently = () => {
      const lastShown = localStorage.getItem('pwa-install-prompt-shown');
      if (lastShown) {
        const timeDiff = Date.now() - parseInt(lastShown);
        const oneWeek = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
        return timeDiff < oneWeek;
      }
      return false;
    };

    const installed = checkInstalled();
    const ios = checkIOS();
    const shownRecently = checkIfShownRecently();

    setIsInstalled(installed);
    setIsIOS(ios);
    setHasShownBefore(shownRecently);

    // Only show install prompt if:
    // 1. App is NOT installed
    // 2. We haven't shown it recently
    if (!installed && !shownRecently) {
      console.log('📱 PWA install prompt can be shown');
    } else {
      console.log('📱 PWA install prompt will NOT be shown:', {
        installed,
        shownRecently
      });
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Only show dialog if app is not installed and not shown recently
      if (!installed && !shownRecently) {
        setShowInstallDialog(true);
        console.log('📱 Install prompt event received, showing dialog');
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallDialog(false);
      setDeferredPrompt(null);
      toast.success('pHLynk app installed successfully!');
      console.log('📱 App installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        toast.success('Installing pHLynk app...');
        console.log('📱 User accepted install prompt');
      } else {
        toast.info('Install cancelled');
        console.log('📱 User declined install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallDialog(false);
      
      // Remember that we showed the prompt
      localStorage.setItem('pwa-install-prompt-shown', Date.now().toString());
    } catch (error) {
      console.error('Error during installation:', error);
      toast.error('Failed to install app');
    }
  };

  const handleDismiss = () => {
    setShowInstallDialog(false);
    setDeferredPrompt(null);
    
    // Remember that we showed the prompt
    localStorage.setItem('pwa-install-prompt-shown', Date.now().toString());
    
    toast.info('You can install the app later from the browser menu');
  };

  const handleNeverShowAgain = () => {
    setShowInstallDialog(false);
    setDeferredPrompt(null);
    
    // Set a very long time to essentially never show again
    localStorage.setItem('pwa-install-prompt-shown', (Date.now() + 365 * 24 * 60 * 60 * 1000).toString());
    
    toast.info('Install prompt disabled');
  };

  // Don't show anything if app is already installed
  if (isInstalled) {
    console.log('📱 App is already installed, no prompt needed');
    return null;
  }

  // Don't show if we've shown it recently
  if (hasShownBefore) {
    console.log('📱 Install prompt shown recently, skipping');
    return null;
  }

  return (
    <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Download className="h-5 w-5 text-blue-600" />
            Install pHLynk App
          </DialogTitle>
          <DialogDescription>
            Get the best experience with our app - install it on your device for offline access and real-time notifications
          </DialogDescription>
        </DialogHeader>
        
        <CardContent className="space-y-4">
          {isIOS ? (
            // iOS Install Instructions
            <div className="space-y-3">
              <div className="text-sm space-y-2">
                <p className="font-medium">To install pHLynk on iOS:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Tap the Share button <span className="font-mono bg-muted px-1 rounded">⎙</span></li>
                  <li>Scroll down and tap "Add to Home Screen" <span className="font-mono bg-muted px-1 rounded">+</span></li>
                  <li>Tap "Add" to install the app</li>
                </ol>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Bell className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  Enable notifications for real-time updates
                </span>
              </div>
            </div>
          ) : (
            // Android Install Options
            <div className="space-y-4">
              <div className="text-sm text-blue-700 bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="h-4 w-4" />
                  <span className="font-medium">Benefits:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Real-time notifications for OTP and payments</li>
                  <li>Works offline with automatic sync</li>
                  <li>Faster loading and native app experience</li>
                  <li>Background notifications even when app is closed</li>
                </ul>
              </div>
              
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleInstallClick}
                  className="w-full"
                  size="lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Install App
                </Button>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleDismiss}
                    className="flex-1"
                  >
                    Maybe Later
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={handleNeverShowAgain}
                    className="flex-1 text-xs"
                  >
                    Don't Show Again
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </DialogContent>
    </Dialog>
  );
}