'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { initializeFCM } from '@/lib/fcm';

export default function DebugFCMPage() {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testFCMRegistration = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing FCM registration...');
      
      // Get current user info
      if (!user || !user.isRetailer) {
        setDebugInfo({ error: 'User is not a retailer' });
        return;
      }

      const retailerId = user.retailerId;
      const phone = user.phone;

      console.log('👤 User info:', { retailerId, phone });

      // Call debug API
      const response = await fetch('/api/debug/fcm-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailerId,
          phone
        })
      });

      const result = await response.json();
      console.log('🔍 Debug result:', result);
      setDebugInfo(result);

      // Try to initialize FCM
      console.log('🔔 Trying to initialize FCM...');
      const fcmToken = await initializeFCM(retailerId);
      console.log('🎯 FCM Token result:', fcmToken ? 'Success' : 'Failed');

      setDebugInfo(prev => ({
        ...prev,
        fcmAttempt: {
          success: !!fcmToken,
          token: fcmToken ? `${fcmToken.substring(0, 20)}...` : null
        }
      }));

    } catch (error) {
      console.error('❌ Debug error:', error);
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>🔍 FCM Registration Debug</CardTitle>
          <CardDescription>
            Debug FCM device registration issues for retailers
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

          <Button 
            onClick={testFCMRegistration} 
            disabled={loading || !user?.isRetailer}
            className="w-full"
          >
            {loading ? 'Testing...' : '🧪 Test FCM Registration'}
          </Button>

          {debugInfo && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-bold mb-2">Debug Results:</h3>
              <pre className="text-xs overflow-auto bg-white p-2 rounded">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}