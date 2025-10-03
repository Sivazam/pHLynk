'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bell, TestTube, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function TestNotificationsPage() {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkNotificationSupport();
    checkPermissionStatus();
  }, []);

  const checkNotificationSupport = () => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    console.log('🔔 Notification support check:', { supported });
  };

  const checkPermissionStatus = () => {
    if ('Notification' in window) {
      const status = Notification.permission;
      setPermissionStatus(status);
      console.log('🔔 Notification permission status:', status);
    }
  };

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error('Notifications not supported on this device');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      
      if (permission === 'granted') {
        toast.success('Notification permission granted!');
        // Test immediate notification
        new Notification('📱 pHLynk Test', {
          body: 'Notifications are now enabled!',
          icon: '/icon-192x192.png',
          badge: '/icon-96x96.png',
          tag: 'test-permission'
        });
      } else {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast.error('Failed to request notification permission');
    }
  };

  const testDirectNotification = () => {
    if (!isSupported || permissionStatus !== 'granted') {
      toast.error('Please grant notification permission first');
      return;
    }

    try {
      const notification = new Notification('🧪 Direct Test Notification', {
        body: 'This is a direct browser notification test',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: 'direct-test',
        requireInteraction: true
      });

      notification.onclick = () => {
        console.log('📱 Direct notification clicked');
        notification.close();
      };

      toast.success('Direct notification sent!');
      addTestResult('Direct Notification', 'success', 'Direct browser notification created successfully');
    } catch (error) {
      console.error('Direct notification failed:', error);
      toast.error('Direct notification failed');
      addTestResult('Direct Notification', 'error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testServiceWorkerNotification = async () => {
    if (!isSupported || permissionStatus !== 'granted') {
      toast.error('Please grant notification permission first');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      registration.active?.postMessage({
        type: 'SEND_TEST_NOTIFICATION'
      });

      toast.success('Service worker notification sent!');
      addTestResult('Service Worker Notification', 'success', 'Message sent to service worker');
    } catch (error) {
      console.error('Service worker notification failed:', error);
      toast.error('Service worker notification failed');
      addTestResult('Service Worker Notification', 'error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testRoleBasedNotification = async () => {
    if (!isSupported || permissionStatus !== 'granted') {
      toast.error('Please grant notification permission first');
      return;
    }

    try {
      // Import and test the role-based notification service
      const { roleBasedNotificationService } = await import('@/services/role-based-notification-service');
      
      if (!roleBasedNotificationService) {
        throw new Error('Role-based notification service not available');
      }
      
      const result = await roleBasedNotificationService.sendTestNotification();
      
      if (result) {
        toast.success('Role-based notification sent!');
        addTestResult('Role-based Notification', 'success', 'Test notification sent via role-based service');
      } else {
        toast.error('Role-based notification failed');
        addTestResult('Role-based Notification', 'error', 'Service returned false');
      }
    } catch (error) {
      console.error('Role-based notification failed:', error);
      toast.error('Role-based notification failed');
      addTestResult('Role-based Notification', 'error', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testCloudFunction = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-cloud-functions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success('Cloud function test completed!');
        addTestResult('Cloud Functions Test', 'success', `Tested ${result.results?.length || 0} functions`);
        console.log('Cloud function test results:', result);
      } else {
        toast.error('Cloud function test failed');
        addTestResult('Cloud Functions Test', 'error', result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Cloud function test failed:', error);
      toast.error('Cloud function test failed');
      addTestResult('Cloud Functions Test', 'error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const testFCMNotification = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/fcm/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'test-token',
          title: '🧪 FCM Test',
          body: 'This is a test FCM notification',
          data: { type: 'test', timestamp: Date.now().toString() }
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast.success('FCM test completed!');
        addTestResult('FCM Test', 'success', 'FCM notification sent successfully');
      } else {
        toast.error('FCM test failed');
        addTestResult('FCM Test', 'error', result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('FCM test failed:', error);
      toast.error('FCM test failed');
      addTestResult('FCM Test', 'error', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const addTestResult = (testName: string, status: 'success' | 'error' | 'warning', message: string) => {
    setTestResults(prev => [...prev, {
      testName,
      status,
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <TestTube className="h-6 w-6" />
        <h1 className="text-2xl font-bold">PWA Notification Tests</h1>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Status
          </CardTitle>
          <CardDescription>
            Check the current status of PWA notifications on this device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Browser Support:</span>
            <Badge variant={isSupported ? 'default' : 'destructive'}>
              {isSupported ? 'Supported' : 'Not Supported'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Permission Status:</span>
            <Badge variant={
              permissionStatus === 'granted' ? 'default' : 
              permissionStatus === 'denied' ? 'destructive' : 'secondary'
            }>
              {permissionStatus}
            </Badge>
          </div>
          {permissionStatus !== 'granted' && (
            <Button onClick={requestPermission} className="w-full">
              Request Notification Permission
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Tests</CardTitle>
          <CardDescription>
            Test different notification methods to identify issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={testDirectNotification}
              disabled={!isSupported || permissionStatus !== 'granted'}
              variant="outline"
            >
              Test Direct Notification
            </Button>
            <Button 
              onClick={testServiceWorkerNotification}
              disabled={!isSupported || permissionStatus !== 'granted'}
              variant="outline"
            >
              Test Service Worker
            </Button>
            <Button 
              onClick={testRoleBasedNotification}
              disabled={!isSupported || permissionStatus !== 'granted'}
              variant="outline"
            >
              Test Role-based Service
            </Button>
            <Button 
              onClick={testCloudFunction}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? 'Testing...' : 'Test Cloud Functions'}
            </Button>
            <Button 
              onClick={testFCMNotification}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? 'Testing...' : 'Test FCM'}
            </Button>
            <Button 
              onClick={clearResults}
              variant="ghost"
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              Results from notification tests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded">
                  {result.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {result.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                  {result.status === 'warning' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                  <span className="flex-1 text-sm">{result.testName}</span>
                  <span className="text-xs text-muted-foreground">{result.timestamp}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}