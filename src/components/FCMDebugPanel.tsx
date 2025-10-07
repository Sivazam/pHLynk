'use client';

import { useState, useEffect } from 'react';
import { forceServiceWorkerUpdate } from '@/lib/fcm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Trash2, CheckCircle, XCircle } from 'lucide-react';

/**
 * TEMPORARY DEBUG PANEL for FCM Service Worker issues
 * This component should be removed after FCM issues are resolved
 */
export default function FCMDebugPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [serviceWorkerInfo, setServiceWorkerInfo] = useState<string>('');
  const [isClient, setIsClient] = useState(false);

  // Ensure this only runs on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      checkServiceWorker();
    }
  }, [isClient]);

  const checkServiceWorker = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setServiceWorkerInfo('Service Workers not supported');
      return;
    }

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      const info = registrations.map(reg => ({
        scope: reg.scope,
        active: reg.active?.scriptURL || 'None',
        waiting: reg.waiting?.scriptURL || 'None',
        installing: reg.installing?.scriptURL || 'None'
      }));
      
      setServiceWorkerInfo(JSON.stringify(info, null, 2));
    } catch (error) {
      setServiceWorkerInfo('Error checking Service Workers: ' + (error instanceof Error ? error.message : 'Unknown'));
    }
  };

  const handleForceUpdate = async () => {
    if (typeof window === 'undefined') return;
    
    setIsLoading(true);
    setResult(null);
    
    try {
      const updateResult = await forceServiceWorkerUpdate();
      setResult(updateResult);
      
      // Check Service Worker status after update
      setTimeout(checkServiceWorker, 1000);
      
    } catch (error) {
      setResult({
        success: false,
        message: 'Unexpected error: ' + (error instanceof Error ? error.message : 'Unknown')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearBrowserCache = () => {
    if (typeof window === 'undefined') return;
    
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Clear localStorage
    localStorage.clear();
    
    setResult({
      success: true,
      message: 'Browser cache and localStorage cleared. Please refresh the page.'
    });
  };

  // Don't render on server side
  if (!isClient) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="border-2 border-orange-200 bg-orange-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold text-orange-800">
                🔧 FCM Debug Panel
              </CardTitle>
              <CardDescription className="text-xs text-orange-600">
                TEMPORARY - Remove after FCM fixes
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              v2.0.2
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Status Display */}
          {result && (
            <Alert className={result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className="text-sm">
                  {result.message}
                </AlertDescription>
              </div>
            </Alert>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleForceUpdate}
              disabled={isLoading}
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Force SW Update
            </Button>
            
            <Button
              onClick={clearBrowserCache}
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear Cache
            </Button>
          </div>
          
          {/* Service Worker Info */}
          <div className="mt-3">
            <Button
              onClick={checkServiceWorker}
              size="sm"
              variant="ghost"
              className="text-xs text-gray-600 h-6 px-2"
            >
              Check Service Workers
            </Button>
            
            {serviceWorkerInfo && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer">Service Worker Info</summary>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                  {serviceWorkerInfo}
                </pre>
              </details>
            )}
          </div>
          
          {/* Instructions */}
          <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
            <strong>Usage:</strong>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Click "Force SW Update"</li>
              <li>Refresh the page</li>
              <li>Test FCM notifications</li>
              <li>Remove this panel when working</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}