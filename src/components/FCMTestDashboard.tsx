'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Smartphone, Bell, Cloud, TestTube } from 'lucide-react';
import { initializeFCM, deleteFCMToken, areNotificationsEnabled } from '@/lib/fcm';
import { sendTestFCMNotificationViaCloudFunction } from '@/lib/cloud-functions';
import { auth } from '@/lib/firebase';

interface FCMTestResult {
  success: boolean;
  message: string;
  timestamp: Date;
  type: 'token' | 'cloud' | 'notification';
}

export default function FCMTestDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<FCMTestResult[]>([]);
  const [fcmStatus, setFcmStatus] = useState<{
    enabled: boolean;
    tokenStored: boolean;
    userId?: string;
  }>({ enabled: false, tokenStored: false });

  useEffect(() => {
    checkFCMStatus();
  }, []);

  const checkFCMStatus = async () => {
    try {
      const enabled = areNotificationsEnabled();
      const userId = auth.currentUser?.uid;
      
      setFcmStatus({
        enabled,
        tokenStored: !!userId,
        userId
      });
    } catch (error) {
      console.error('Error checking FCM status:', error);
    }
  };

  const addTestResult = (result: Omit<FCMTestResult, 'timestamp'>) => {
    setTestResults(prev => [
      { ...result, timestamp: new Date() },
      ...prev.slice(0, 9) // Keep only last 10 results
    ]);
  };

  const testFCMTokenStorage = async () => {
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        addTestResult({
          success: false,
          message: 'User not authenticated',
          type: 'token'
        });
        return;
      }

      // Determine user type based on current URL or localStorage
      let userType = 'retailers';
      if (window.location.pathname.includes('/wholesaler')) {
        userType = 'wholesalers';
      } else if (window.location.pathname.includes('/line-worker')) {
        userType = 'lineWorkers';
      } else if (window.location.pathname.includes('/super-admin')) {
        userType = 'superAdmins';
      }

      const token = await initializeFCM(user.uid, userType as any);
      
      if (token) {
        addTestResult({
          success: true,
          message: `FCM token stored successfully for ${userType}. Token: ${token.substring(0, 20)}...`,
          type: 'token'
        });
        setFcmStatus(prev => ({ ...prev, tokenStored: true }));
      } else {
        addTestResult({
          success: false,
          message: 'Failed to store FCM token',
          type: 'token'
        });
      }
    } catch (error) {
      addTestResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'token'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testCloudFunction = async () => {
    setIsLoading(true);
    try {
      const result = await sendTestFCMNotificationViaCloudFunction();
      
      if (result.success) {
        addTestResult({
          success: true,
          message: `Cloud function test successful. Message ID: ${result.messageId}`,
          type: 'cloud'
        });
      } else {
        addTestResult({
          success: false,
          message: `Cloud function test failed: ${result.error}`,
          type: 'cloud'
        });
      }
    } catch (error) {
      addTestResult({
        success: false,
        message: `Cloud function error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'cloud'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testFullFlow = async () => {
    setIsLoading(true);
    try {
      // Step 1: Test FCM token storage
      await testFCMTokenStorage();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 2: Test cloud function
      await testCloudFunction();
      
      addTestResult({
        success: true,
        message: 'Full FCM flow test completed',
        type: 'notification'
      });
    } catch (error) {
      addTestResult({
        success: false,
        message: `Full flow test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'notification'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearFCMToken = async () => {
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        addTestResult({
          success: false,
          message: 'User not authenticated',
          type: 'token'
        });
        return;
      }

      let userType = 'retailers';
      if (window.location.pathname.includes('/wholesaler')) {
        userType = 'wholesalers';
      } else if (window.location.pathname.includes('/line-worker')) {
        userType = 'lineWorkers';
      } else if (window.location.pathname.includes('/super-admin')) {
        userType = 'superAdmins';
      }

      const success = await deleteFCMToken(userType as any);
      
      if (success) {
        addTestResult({
          success: true,
          message: 'FCM token cleared successfully',
          type: 'token'
        });
        setFcmStatus(prev => ({ ...prev, tokenStored: false }));
      } else {
        addTestResult({
          success: false,
          message: 'Failed to clear FCM token',
          type: 'token'
        });
      }
    } catch (error) {
      addTestResult({
        success: false,
        message: `Error clearing token: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'token'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Smartphone className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">FCM Integration Test</h1>
          <p className="text-muted-foreground">Test FCM token storage and cloud function notifications</p>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            FCM Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={fcmStatus.enabled ? 'default' : 'secondary'}>
                {fcmStatus.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
              <span className="text-sm">Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={fcmStatus.tokenStored ? 'default' : 'secondary'}>
                {fcmStatus.tokenStored ? 'Stored' : 'Not Stored'}
              </Badge>
              <span className="text-sm">FCM Token</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {fcmStatus.userId ? fcmStatus.userId.substring(0, 8) + '...' : 'No User'}
              </Badge>
              <span className="text-sm">User ID</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Test Controls
          </CardTitle>
          <CardDescription>
            Test different aspects of the FCM integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button 
              onClick={testFCMTokenStorage} 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              Test Token Storage
            </Button>
            
            <Button 
              onClick={testCloudFunction} 
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
              Test Cloud Function
            </Button>
            
            <Button 
              onClick={testFullFlow} 
              disabled={isLoading}
              variant="secondary"
              className="flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
              Full Flow Test
            </Button>
            
            <Button 
              onClick={clearFCMToken} 
              disabled={isLoading}
              variant="destructive"
              className="flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Clear Token
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            Recent test results (last 10)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tests run yet. Try running some tests above.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={result.type === 'token' ? 'default' : result.type === 'cloud' ? 'secondary' : 'outline'}>
                        {result.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm break-words">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert>
        <TestTube className="h-4 w-4" />
        <AlertDescription>
          <strong>Testing Instructions:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>First, test FCM token storage to ensure your device token is properly stored in your user document</li>
            <li>Then, test the cloud function to verify it can send notifications to your stored tokens</li>
            <li>Use the full flow test to test the complete integration</li>
            <li>Check your browser's notification permissions if tests fail</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
}