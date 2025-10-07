'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SimpleSearchBox } from '@/components/SimpleSearchBox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { realtimeNotificationService } from '@/services/realtime-notifications';
import { notificationService } from '@/services/notification-service';

export function SearchFocusTest() {
  const [searchTerm, setSearchTerm] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const startNotifications = () => {
    if (isListening) return;
    
    setIsListening(true);
    addTestResult('Starting real-time notifications...');
    
    // Simulate a user session
    const testUserId = 'test-user-focus';
    const testTenantId = 'test-tenant';
    
    realtimeNotificationService.startListening(
      testUserId,
      'WHOLESALER_ADMIN',
      testTenantId,
      (newNotifications) => {
        setNotifications(newNotifications);
        setNotificationCount(newNotifications.filter(n => !n.read).length);
        addTestResult(`Received ${newNotifications.length} notifications`);
      }
    );
  };

  const stopNotifications = () => {
    if (!isListening) return;
    
    setIsListening(false);
    addTestResult('Stopping real-time notifications...');
    
    const testUserId = 'test-user-focus';
    realtimeNotificationService.stopListening(testUserId);
  };

  const simulateNotification = () => {
    addTestResult('Simulating notification...');
    
    // Add a test notification directly to the service
    const testNotification = {
      type: 'success' as const,
      title: 'Test Notification',
      message: `Test notification at ${new Date().toLocaleTimeString()}`,
      timestamp: new Date(),
      read: false
    };
    
    notificationService.addNotification(testNotification);
    addTestResult('Test notification added');
  };

  const simulateRapidNotifications = () => {
    addTestResult('Simulating rapid notifications...');
    
    // Add multiple notifications rapidly to test focus preservation
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const testNotification = {
          type: 'info' as const,
          title: `Rapid Test ${i + 1}`,
          message: `Rapid notification ${i + 1} at ${new Date().toLocaleTimeString()}`,
          timestamp: new Date(),
          read: false
        };
        
        notificationService.addNotification(testNotification);
        addTestResult(`Rapid notification ${i + 1} added`);
      }, i * 200); // Add notifications every 200ms
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
    notificationService.clearNotifications();
    setNotifications([]);
    setNotificationCount(0);
    addTestResult('Test results cleared');
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (isListening) {
        const testUserId = 'test-user-focus';
        realtimeNotificationService.stopListening(testUserId);
      }
    };
  }, [isListening]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Input Focus Test</CardTitle>
          <CardDescription>
            Test that search input maintains focus during real-time notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <SimpleSearchBox
                placeholder="Type here to test focus preservation..."
                value={searchTerm}
                onChange={setSearchTerm}
                className="w-full"
              />
            </div>
            <Badge variant={isListening ? "default" : "secondary"}>
              {isListening ? "Listening" : "Not Listening"}
            </Badge>
            <Badge variant="outline">
              {notificationCount} notifications
            </Badge>
          </div>
          
          <div className="text-sm text-gray-600">
            Current search term: "{searchTerm}"
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
          <CardDescription>
            Simulate notifications and test focus behavior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={startNotifications}
              disabled={isListening}
              variant={isListening ? "secondary" : "default"}
            >
              Start Notifications
            </Button>
            <Button
              onClick={stopNotifications}
              disabled={!isListening}
              variant="outline"
            >
              Stop Notifications
            </Button>
            <Button
              onClick={simulateNotification}
              disabled={!isListening}
              variant="outline"
            >
              Simulate Single Notification
            </Button>
            <Button
              onClick={simulateRapidNotifications}
              disabled={!isListening}
              variant="outline"
            >
              Simulate Rapid Notifications
            </Button>
            <Button
              onClick={clearTestResults}
              variant="destructive"
            >
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            Real-time test results and notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Recent Activity:</h4>
              <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                {testResults.length > 0 ? (
                  testResults.map((result, index) => (
                    <div key={index} className="text-sm py-1 border-b border-gray-200 last:border-0">
                      {result}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-center py-4">
                    No test results yet. Start notifications and simulate some events.
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Recent Notifications:</h4>
              <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.slice(0, 10).map((notification, index) => (
                    <div key={notification.id || index} className="text-sm py-2 border-b border-gray-200 last:border-0">
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-gray-600">{notification.message}</div>
                      <div className="text-xs text-gray-500">
                        {notification.timestamp?.toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500 text-center py-4">
                    No notifications yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>1. Click "Start Notifications" to begin listening for real-time updates</p>
            <p>2. Type something in the search input above</p>
            <p>3. Click "Simulate Single Notification" or "Simulate Rapid Notifications"</p>
            <p>4. The search input should maintain focus while notifications are being processed</p>
            <p>5. Check the test results to see the notification processing timeline</p>
            <p className="text-blue-600 font-medium">
              If the search input loses focus during notifications, the fix is not working properly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
