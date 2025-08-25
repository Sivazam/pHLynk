'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PWATestPage() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const checkPWA = () => {
      const pwa = window.matchMedia('(display-mode: standalone)').matches || 
                  // @ts-ignore - Safari specific property
                  (window.navigator && window.navigator.standalone) ||
                  document.referrer.includes('android-app://');
      setIsPWA(pwa);
    };

    checkPWA();
    
    // Listen for display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkPWA);
    
    // Cleanup
    return () => {
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', checkPWA);
    };
  }, []);

  const testPWALoading = () => {
    // Clear the session storage to force PWA loading screen
    sessionStorage.removeItem('pwaLoaded');
    
    if (isPWA) {
      // If already in PWA mode, reload to show loading screen
      window.location.reload();
    } else {
      // Show instructions for testing PWA
      alert('To test PWA loading:\n\n1. Install this app as PWA (Add to Home Screen)\n2. Open the installed PWA\n3. You should see the blue loading screen instead of white screen');
    }
  };

  const installPWA = async () => {
    // @ts-ignore - PWA install prompt
    if ('deferredPrompt' in window && window.deferredPrompt) {
      // @ts-ignore - PWA install prompt
      const promptEvent = window.deferredPrompt;
      if (promptEvent) {
        // @ts-ignore - PWA install prompt
        promptEvent.prompt();
        // @ts-ignore - PWA install prompt
        const { outcome } = await promptEvent.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // @ts-ignore - PWA install prompt
        window.deferredPrompt = null;
      }
    } else {
      alert('PWA installation is not available or already installed. Try using your browser\'s "Add to Home Screen" feature.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">PWA Loading Screen Test</h1>
          <p className="text-gray-600 mb-4">
            Test the Progressive Web App loading experience
          </p>
          
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
            isPWA 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {isPWA ? (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Running as PWA
              </>
            ) : (
              <>
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Browser Mode
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                🚀 PWA Loading Screen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Tests the dedicated PWA loading screen that appears when the app is launched as a Progressive Web App.
              </p>
              <Button 
                onClick={testPWALoading}
                className="w-full"
                size="lg"
              >
                Test PWA Loading
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                📱 Install PWA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Install this app as a PWA on your device to test the native app-like experience.
              </p>
              <Button 
                onClick={installPWA}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Install App
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            🎯 PWA Loading Screen Features:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Before (Problem):</h4>
              <ul className="space-y-1 text-blue-700">
                <li>• White screen on PWA launch</li>
                <li>• No loading feedback</li>
                <li>• Poor user experience</li>
                <li>• Looks like app is frozen</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">After (Solution):</h4>
              <ul className="space-y-1 text-blue-700">
                <li>• Blue background (#20439f)</li>
                <li>• Bouncing logo animation</li>
                <li>• Real progress bar with %</li>
                <li>• Loading stage messages</li>
                <li>• Professional loading experience</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="bg-gray-100 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">How to Test:</h4>
            <ol className="text-sm text-gray-600 text-left space-y-1 max-w-md mx-auto">
              <li>1. Click "Install App" to add to home screen</li>
              <li>2. Open the installed PWA from your home screen</li>
              <li>3. You should see the blue loading screen immediately</li>
              <li>4. Watch the progress bar fill and messages change</li>
              <li>5. App redirects to main screen when complete</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}