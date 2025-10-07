'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { notificationDeduplicator } from '@/lib/notification-deduplicator';
import { enhancedFCMManager } from '@/lib/enhanced-fcm-manager';
import { toast } from 'sonner';
import { Trash2, RefreshCw, Bug, Smartphone, Monitor } from 'lucide-react';

export function NotificationDeduplicatorDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const refreshDebugInfo = () => {
    if (!notificationDeduplicator) {
      console.warn('Notification deduplicator not available');
      return;
    }
    
    const info = notificationDeduplicator.getDebugInfo();
    const fcmInfo = enhancedFCMManager.getDebugInfo();
    const notificationHistory = notificationDeduplicator.getNotificationHistory();
    
    setDebugInfo({
      deduplicator: info,
      fcm: fcmInfo
    });
    setHistory(notificationHistory);
  };

  const clearHistory = () => {
    if (!notificationDeduplicator) {
      console.warn('Notification deduplicator not available');
      return;
    }
    
    notificationDeduplicator.clearHistory();
    toast.success('Notification history cleared');
    refreshDebugInfo();
  };

  const sendTestNotification = () => {
    // Test FCM notification
    enhancedFCMManager.sendTestNotification();
    
    // Test PWA notification
    setTimeout(async () => {
      try {
        const { roleBasedNotificationService } = await import('@/services/role-based-notification-service');
        if (roleBasedNotificationService) {
          roleBasedNotificationService.sendTestNotification();
        }
      } catch (error) {
        console.error('Failed to load role-based notification service:', error);
      }
    }, 1000);
    
    toast.info('Test notifications sent (check for duplicates)');
  };

  const sendDuplicateTest = () => {
    // Send multiple identical notifications to test de-duplication
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        enhancedFCMManager.sendTestNotification();
      }, i * 500);
    }
    
    toast.info('Duplicate test notifications sent');
  };

  useEffect(() => {
    refreshDebugInfo();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            <CardTitle>Notification De-duplicator Debug</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshDebugInfo}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearHistory}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
        <CardDescription>
          Debug and test notification de-duplication system
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Test Actions */}
        <div className="space-y-3">
          <h4 className="font-medium">Test Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button onClick={sendTestNotification} size="sm">
              Send Test Notification
            </Button>
            <Button onClick={sendDuplicateTest} variant="outline" size="sm">
              Send Duplicate Test
            </Button>
          </div>
        </div>

        {/* App State */}
        {debugInfo?.deduplicator && (
          <div className="space-y-3">
            <h4 className="font-medium">App State</h4>
            <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {debugInfo.deduplicator.appState.isPWA ? (
                    <Smartphone className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Monitor className="h-4 w-4 text-green-600" />
                  )}
                  <span className="text-sm font-medium">
                    {debugInfo.deduplicator.appState.isPWA ? 'PWA' : 'Browser'}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  Session: {debugInfo.deduplicator.appState.sessionId.substring(0, 12)}...
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    debugInfo.deduplicator.appState.isForeground ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-sm font-medium">
                    {debugInfo.deduplicator.appState.isForeground ? 'Foreground' : 'Background'}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  Active: {Math.round(debugInfo.deduplicator.timeSinceActive / 1000)}s ago
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Stats */}
        {debugInfo?.deduplicator && (
          <div className="space-y-3">
            <h4 className="font-medium">Notification Stats</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {debugInfo.deduplicator.notificationCount}
                </div>
                <div className="text-xs text-blue-600">Active Notifications</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {debugInfo.fcm?.isInitialized ? '✅' : '❌'}
                </div>
                <div className="text-xs text-green-600">FCM Status</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {history.length}
                </div>
                <div className="text-xs text-purple-600">History Items</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent History */}
        {history.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Recent Notifications</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.map((notification, index) => (
                <div key={notification.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{notification.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {notification.type || 'unknown'}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </div>
                  {notification.amount && (
                    <div className="text-xs text-gray-600">
                      Amount: ₹{notification.amount}
                    </div>
                  )}
                  {notification.otp && (
                    <div className="text-xs text-gray-600">
                      OTP: {notification.otp}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Debug Info */}
        {debugInfo && (
          <div className="space-y-3">
            <h4 className="font-medium">Debug Information</h4>
            <details className="text-xs">
              <summary className="cursor-pointer font-mono bg-gray-100 p-2 rounded">
                View Raw Debug Data
              </summary>
              <pre className="mt-2 p-2 bg-gray-50 rounded overflow-x-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1 p-3 bg-blue-50 rounded-lg">
          <p className="font-medium text-blue-800">How to test de-duplication:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>Open the app in both browser and PWA mode</li>
            <li>Send test notifications using the buttons above</li>
            <li>Only one notification should appear per test</li>
            <li>Check the console for de-duplication logs</li>
            <li>Try the duplicate test to verify blocking works</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}