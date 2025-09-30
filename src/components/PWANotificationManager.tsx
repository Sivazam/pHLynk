'use client';

import { useEffect, useState } from 'react';
import { roleBasedNotificationService } from '@/services/role-based-notification-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, CheckCircle, XCircle, Settings, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

interface PWANotificationManagerProps {
  userRole?: 'SUPER_ADMIN' | 'WHOLESALER_ADMIN' | 'LINE_WORKER' | 'RETAILER';
  className?: string;
}

export function PWANotificationManager({ userRole, className }: PWANotificationManagerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Set the user role in the notification service
    if (userRole) {
      roleBasedNotificationService.setCurrentRole(userRole);
    }

    // Check notification support and permission status
    const checkNotificationStatus = () => {
      const supported = roleBasedNotificationService.isNotificationSupported();
      const hasPermission = roleBasedNotificationService.hasPermission();
      
      setIsSupported(supported);
      setHasPermission(hasPermission);
      
      // For role-based service, subscription is handled automatically
      setIsSubscribed(hasPermission);
      
      console.log('📱 PWA Notification Status:', {
        supported,
        hasPermission,
        subscribed: hasPermission,
        userRole
      });
    };

    checkNotificationStatus();

    // Listen for permission changes
    if (typeof window !== 'undefined' && 'navigator' in window) {
      const handlePermissionChange = () => {
        checkNotificationStatus();
      };

      // Listen for storage changes (in case permission is granted in another tab)
      const handleStorageChange = () => {
        checkNotificationStatus();
      };

      window.addEventListener('focus', handlePermissionChange);
      window.addEventListener('storage', handleStorageChange);

      return () => {
        window.removeEventListener('focus', handlePermissionChange);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [userRole]);

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    setIsLoading(true);
    try {
      const granted = await roleBasedNotificationService.requestNotificationPermission();
      setHasPermission(granted);
      
      if (granted) {
        toast.success('Notification permission granted!');
        
        // For role-based service, subscription is automatic
        setIsSubscribed(true);
        
        toast.success('Successfully subscribed to PWA notifications!');
      } else {
        toast.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
    } finally {
      setIsLoading(false);
    }
  };

  const subscribe = async () => {
    if (!hasPermission) {
      toast.error('Please grant notification permission first');
      return;
    }

    setIsLoading(true);
    try {
      // For role-based service, subscription is automatic with permission
      setIsSubscribed(true);
      toast.success('Successfully subscribed to PWA notifications!');
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      toast.error('Failed to subscribe to notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      // For role-based service, just set subscription to false
      setIsSubscribed(false);
      toast.success('Successfully unsubscribed from PWA notifications');
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
      toast.error('Failed to unsubscribe from notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!isSupported || !hasPermission) {
      toast.error('Please enable notifications first');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🧪 Sending test notification...');
      const sent = await roleBasedNotificationService.sendTestNotification();
      if (sent) {
        toast.success('Test notification sent!');
        console.log('✅ Test notification sent successfully');
      } else {
        toast.error('Failed to send test notification');
        console.error('❌ Test notification failed');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsLoading(false);
    }
  };

  // Debug function to check notification status
  const debugNotificationStatus = () => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const isStandalone = (window.navigator as any).standalone;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    
    console.log('🔍 PWA Notification Debug Info:', {
      isSupported,
      hasPermission,
      isSubscribed,
      userRole,
      notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'Not supported',
      serviceWorkerSupported: 'serviceWorker' in navigator,
      pushManagerSupported: 'PushManager' in window,
      currentUserRole: roleBasedNotificationService.getCurrentRole(),
      platform: {
        isPWA,
        isStandalone,
        isIOS,
        isChrome,
        userAgent: navigator.userAgent
      }
    });
    
    // Show user-friendly status
    if (isIOS) {
      toast.info('iOS detected: Make sure you added this app to Home Screen for full PWA features');
    } else if (isChrome && !isPWA) {
      toast.info('Chrome detected: Look for the install icon (+) in the address bar to install as PWA');
    } else if (hasPermission) {
      toast.success('Notifications are enabled and working!');
    } else {
      toast.warning('Please enable notifications to receive OTP and payment alerts');
    }
  };

  // Check platform and show appropriate guidance
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

  // Don't render anything if notifications are not supported
  if (!isSupported) {
    return (
      <Card className={`border-yellow-200 bg-yellow-50 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-yellow-800">
            <Smartphone className="h-4 w-4" />
            <span className="text-sm">
              PWA notifications are not supported in this browser
            </span>
          </div>
          {isIOS && (
            <div className="mt-2 text-xs text-yellow-700">
              <p>For iOS users:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Add this app to your Home Screen</li>
                <li>Ensure notifications are enabled in Settings</li>
                <li>Check Safari Website Settings</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <CardTitle className="text-lg">PWA Notifications</CardTitle>
            {isSubscribed && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Active
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Get instant notifications for OTP and payment events
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            {hasPermission ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium">
              {hasPermission ? 'Permission Granted' : 'Permission Required'}
            </span>
          </div>
          {userRole && (
            <Badge variant="secondary" className="text-xs">
              {userRole.replace('_', ' ')}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2">
          {!hasPermission ? (
            <Button
              onClick={requestPermission}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Requesting Permission...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Enable Notifications
                </>
              )}
            </Button>
          ) : (
            <>
              {isSubscribed ? (
                <Button
                  onClick={unsubscribe}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
                      Unsubscribing...
                    </>
                  ) : (
                    <>
                      <BellOff className="h-4 w-4 mr-2" />
                      Unsubscribe from Notifications
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={subscribe}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Subscribe to Notifications
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-medium">Notification Settings</div>
            
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>OTP Notifications</span>
                <Badge variant="outline" className="text-xs">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Payment Success</span>
                <Badge variant="outline" className="text-xs">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Real-time Updates</span>
                <Badge variant="outline" className="text-xs">Enabled</Badge>
              </div>
            </div>

            <Button
              onClick={sendTestNotification}
              disabled={isLoading || !hasPermission}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4 mr-2" />
                  Send Test Notification
                </>
              )}
            </Button>

            <Button
              onClick={debugNotificationStatus}
              variant="ghost"
              size="sm"
              className="w-full text-xs"
            >
              🐛 Debug Status (Check Console)
            </Button>
          </div>
        )}

        {/* Info Text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Notifications work even when the app is in background</p>
          <p>• Available on supported browsers and devices</p>
          <p>• You can disable notifications anytime</p>
          
          {/* Platform-specific guidance */}
          {isIOS && !isPWA && (
            <div className="mt-2 p-2 bg-blue-50 rounded text-blue-700">
              <p className="font-medium">iOS Users:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Tap Share → Add to Home Screen</li>
                <li>Enable notifications in Settings → Notifications</li>
                <li>Check Settings → Safari → Website Settings</li>
              </ul>
            </div>
          )}
          
          {isChrome && !isPWA && (
            <div className="mt-2 p-2 bg-green-50 rounded text-green-700">
              <p className="font-medium">Chrome Users:</p>
              <p>Look for the install icon (⊕) in the address bar to install as PWA for better notification support</p>
            </div>
          )}
          
          {isPWA && (
            <div className="mt-2 p-2 bg-purple-50 rounded text-purple-700">
              <p className="font-medium">✅ PWA Installed</p>
              <p>Full notification support is available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}