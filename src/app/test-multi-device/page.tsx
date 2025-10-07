'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { logDeviceInfo, isCurrentDeviceRegistered, getCurrentDeviceInfo } from '@/lib/device-manager';
import { initializeFCM, deleteFCMToken } from '@/lib/fcm';

export default function TestMultiDevicePage() {
  const { user } = useAuth();
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    logDeviceInfo();
    setDeviceInfo(getCurrentDeviceInfo());
  }, []);

  const testFCMRegistration = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing FCM registration...');
      
      if (!user || !user.isRetailer) {
        alert('Please login as a retailer first');
        return;
      }

      const retailerId = user.retailerId;
      console.log('👤 Registering device for retailer:', retailerId);

      const fcmToken = await initializeFCM(retailerId);
      console.log('🎯 FCM Token result:', fcmToken ? 'Success' : 'Failed');

      if (fcmToken) {
        setDeviceInfo(getCurrentDeviceInfo());
        alert(`✅ FCM registered successfully!\nDevice ID: ${getCurrentDeviceInfo()?.deviceId}\nToken: ${fcmToken.substring(0, 20)}...`);
      } else {
        alert('❌ FCM registration failed');
      }
    } catch (error) {
      console.error('❌ Test error:', error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const testDeviceUnregister = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing device unregistration...');
      
      if (!user) {
        alert('Please login first');
        return;
      }

      const result = await deleteFCMToken();
      console.log('🗑️ Unregister result:', result);

      setDeviceInfo(getCurrentDeviceInfo());
      
      if (result) {
        alert('✅ Current device unregistered successfully!');
      } else {
        alert('❌ Device unregistration failed');
      }
    } catch (error) {
      console.error('❌ Test error:', error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const refreshDeviceInfo = () => {
    logDeviceInfo();
    setDeviceInfo(getCurrentDeviceInfo());
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>📱 Multi-Device FCM Test</CardTitle>
          <CardDescription>
            Test FCM registration and unregistration for multi-device scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p><strong>User Status:</strong> {user ? `Logged in as ${user.displayName}` : 'Not logged in'}</p>
            <p><strong>Is Retailer:</strong> {user?.isRetailer ? 'Yes' : 'No'}</p>
            {user?.isRetailer && (
              <>
                <p><strong>Retailer ID:</strong> {user.retailerId}</p>
                <p><strong>Phone:</strong> {user.phone}</p>
              </>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={testFCMRegistration} 
              disabled={loading || !user?.isRetailer}
            >
              {loading ? 'Testing...' : '📱 Register FCM'}
            </Button>
            
            <Button 
              onClick={testDeviceUnregister} 
              disabled={loading || !user}
              variant="outline"
            >
              {loading ? 'Testing...' : '🗑️ Unregister Device'}
            </Button>
            
            <Button 
              onClick={refreshDeviceInfo} 
              variant="secondary"
            >
              🔄 Refresh Info
            </Button>
          </div>

          {deviceInfo && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-bold mb-2">Current Device Info:</h3>
              <pre className="text-xs overflow-auto bg-white p-2 rounded">
                {JSON.stringify(deviceInfo, null, 2)}
              </pre>
              <p className="mt-2 text-sm">
                <strong>Is Registered:</strong> {isCurrentDeviceRegistered() ? '✅ Yes' : '❌ No'}
              </p>
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-bold mb-2">🧪 Test Instructions:</h3>
            <ol className="text-sm list-decimal list-inside space-y-1">
              <li>Open this page on Device 1 and click "Register FCM"</li>
              <li>Open this page on Device 2 with same retailer account and click "Register FCM"</li>
              <li>Both devices should now be registered</li>
              <li>On Device 1, click "Unregister Device" (or logout)</li>
              <li>Device 1 should be unregistered, but Device 2 should remain registered</li>
              <li>Test notifications - they should only go to Device 2</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}