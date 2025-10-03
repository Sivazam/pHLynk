'use client';

import { useEffect, useState } from 'react';
import { onMessageListener, isFCMSupported, initializeFCM, getFCMToken, getMessagingInstance } from '@/lib/fcm';
import { onMessage } from 'firebase/messaging';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';

interface FCMNotificationManagerProps {
  userId?: string;
  className?: string;
}

export default function FCMNotificationManager({ userId, className }: FCMNotificationManagerProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check FCM support
    const supported = isFCMSupported();
    setIsSupported(supported);
    
    if (!supported) {
      console.warn('⚠️ FCM is not supported in this environment');
      return;
    }

    // Initialize FCM when user is authenticated
    const initializeFCMForUser = async () => {
      if (auth.currentUser) {
        setIsLoading(true);
        try {
          console.log('🔧 Initializing FCM for user:', auth.currentUser.uid);
          
          const token = await initializeFCM();
          
          if (token) {
            setFcmToken(token);
            setIsInitialized(true);
            console.log('✅ FCM initialized successfully for user:', auth.currentUser.uid);
          } else {
            console.warn('⚠️ FCM initialization failed for user:', auth.currentUser.uid);
          }
        } catch (error) {
          console.error('❌ Error initializing FCM:', error);
          toast.error('Failed to initialize notifications');
        } finally {
          setIsLoading(false);
        }
      }
    };

    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        initializeFCMForUser();
      } else {
        // User logged out, reset state
        setFcmToken(null);
        setIsInitialized(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  useEffect(() => {
    if (!isInitialized) return;

    // Listen for foreground messages
    const setupForegroundListener = async () => {
      try {
        const messagingInstance = getMessagingInstance();
        if (!messagingInstance) {
          console.warn('⚠️ Firebase Messaging instance not available');
          return () => {};
        }

        const unsubscribe = onMessage(messagingInstance, (payload: any) => {
          console.log('📱 FCM Foreground message received:', payload);
          
          // Show notification when app is in foreground
          if (payload.notification) {
            const notificationTitle = payload.notification.title || 'pHLynk Notification';
            const notificationOptions = {
              body: payload.notification.body || 'You have a new notification',
              icon: '/icon-192x192.png',
              badge: '/icon-96x96.png',
              tag: payload.data?.tag || 'default',
              requireInteraction: payload.data?.requireInteraction || false,
              data: payload.data || {}
            };

            // Create and show notification
            const notification = new Notification(notificationTitle, notificationOptions);
            
            // Auto-close after appropriate time
            if (!payload.data?.requireInteraction) {
              setTimeout(() => {
                notification.close();
              }, 5000);
            }

            // Handle notification click
            notification.onclick = () => {
              const urlToOpen = payload.data?.url || '/';
              window.open(urlToOpen, '_blank');
              notification.close();
            };

            // Also show toast for better UX
            if (payload.data?.type === 'otp') {
              toast.success(`🔐 OTP: ${payload.data?.otp} for ₹${payload.data?.amount}`);
            } else if (payload.data?.type === 'payment_completed' || payload.data?.type === 'payment-completed') {
              toast.success(`✅ Payment of ₹${payload.data?.amount} completed`);
            } else {
              toast.info(payload.notification.body || 'New notification received');
            }
          }
        });

        return unsubscribe;
      } catch (error) {
        console.error('❌ Error setting up FCM foreground listener:', error);
        return () => {};
      }
    };

    const cleanup = setupForegroundListener();
    
    return () => {
      cleanup.then(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [isInitialized]);

  // Function to manually request permission
  const requestPermission = async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    setIsLoading(true);
    try {
      const token = await initializeFCM();
      
      if (token) {
        setFcmToken(token);
        setIsInitialized(true);
        toast.success('Notifications enabled successfully!');
      } else {
        toast.error('Failed to enable notifications');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to send test notification
  const sendTestNotification = async () => {
    if (!isSupported || !isInitialized) {
      toast.error('Please enable notifications first');
      return;
    }

    try {
      // Show a test notification directly
      const notification = new Notification('📱 Test Notification', {
        body: 'This is a test FCM notification from pHLynk',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: 'test-notification',
        requireInteraction: false
      });

      setTimeout(() => {
        notification.close();
      }, 5000);

      toast.success('Test notification sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  };

  // Debug function to check FCM status
  const debugFCMStatus = () => {
    console.log('🔍 FCM Debug Info:', {
      isSupported,
      isInitialized,
      fcmToken,
      currentUser: auth.currentUser?.uid,
      notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'Not supported',
      serviceWorkerSupported: 'serviceWorker' in navigator,
      pushManagerSupported: 'PushManager' in window,
      userAgent: navigator.userAgent
    });

    if (isSupported && isInitialized && fcmToken) {
      toast.success('✅ FCM is fully configured and working!');
    } else if (isSupported && !isInitialized) {
      toast.info('⚠️ FCM supported but not initialized. Click "Enable Notifications".');
    } else {
      toast.error('❌ FCM is not supported or not working');
    }
  };

  // Don't render anything if FCM is not supported
  if (!isSupported) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Status Display */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">
            {isInitialized ? 'FCM Active' : 'FCM Inactive'}
          </span>
        </div>
        {fcmToken && (
          <div className="text-xs text-gray-500">
            Token: {fcmToken.substring(0, 8)}...
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col space-y-2">
        {!isInitialized ? (
          <button
            onClick={requestPermission}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                Enabling Notifications...
              </>
            ) : (
              'Enable FCM Notifications'
            )}
          </button>
        ) : (
          <div className="space-y-2">
            <button
              onClick={sendTestNotification}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Send Test Notification
            </button>
            
            <button
              onClick={debugFCMStatus}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
            >
              🐛 Debug FCM Status
            </button>
          </div>
        )}
      </div>

      {/* Info Text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• FCM notifications work even when the app is in background</p>
        <p>• Available on supported browsers and devices</p>
        <p>• Real-time OTP and payment notifications</p>
      </div>
    </div>
  );
}