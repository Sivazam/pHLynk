// Web Push API service for client-side notifications
// This works as a fallback when FCM server key is not available

interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface WebPushNotification {
  title: string;
  body: string;
  data?: Record<string, any>;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
}

class WebPushService {
  private vapidPublicKey: string;
  private subscriptions: Map<string, WebPushSubscription[]> = new Map();

  constructor() {
    // Use the VAPID public key from environment
    this.vapidPublicKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || '';
    
    if (!this.vapidPublicKey || this.vapidPublicKey === 'your_vapid_key_here') {
      console.warn('⚠️ VAPID public key not configured - Web Push will not work');
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(retailerId: string): Promise<PushSubscription | null> {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications not supported');
        return null;
      }

      if (!this.vapidPublicKey) {
        console.warn('VAPID public key not configured');
        return null;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      console.log('✅ Web Push subscription successful:', subscription);
      
      // Store subscription for retailer
      if (!this.subscriptions.has(retailerId)) {
        this.subscriptions.set(retailerId, []);
      }
      this.subscriptions.get(retailerId)!.push(subscription.toJSON() as WebPushSubscription);
      
      return subscription;
    } catch (error) {
      console.error('Error subscribing to Web Push:', error);
      return null;
    }
  }

  /**
   * Send notification to all subscriptions for a retailer
   */
  async sendNotification(retailerId: string, notification: WebPushNotification): Promise<{ success: boolean; sentCount: number; error?: string }> {
    try {
      const retailerSubscriptions = this.subscriptions.get(retailerId) || [];
      
      if (retailerSubscriptions.length === 0) {
        return { success: false, sentCount: 0, error: 'No subscriptions found for retailer' };
      }

      let sentCount = 0;
      
      // For demo purposes, we'll show a local notification
      // In production, you'd send this to a backend service that delivers push notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        for (const subscription of retailerSubscriptions) {
          try {
            // Create local notification as fallback
            const localNotification = new Notification(notification.title, {
              body: notification.body,
              icon: notification.icon || '/icon-192x192.png',
              badge: notification.badge || '/badge-72x72.png',
              tag: notification.tag,
              requireInteraction: notification.requireInteraction || false,
              data: notification.data || {}
            });

            sentCount++;
            
            // Auto-close after 5 seconds
            setTimeout(() => {
              localNotification.close();
            }, 5000);
            
          } catch (error) {
            console.error('Error showing local notification:', error);
          }
        }
      }

      console.log(`📱 Web Push: Sent ${sentCount} local notifications for retailer ${retailerId}`);
      
      return {
        success: sentCount > 0,
        sentCount
      };
    } catch (error) {
      console.error('Error sending Web Push notification:', error);
      return { success: false, sentCount: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Convert URL base64 to Uint8Array for VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Check if Web Push is supported
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 
           'PushManager' in window && 
           'Notification' in window &&
           !!this.vapidPublicKey;
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      throw new Error('Notification permission denied');
    }

    const permission = await Notification.requestPermission();
    return permission;
  }
}

// Export singleton instance
export const webPushService = new WebPushService();

// Helper function for OTP notifications
export async function sendOTPWebPush(
  retailerId: string,
  otp: string,
  retailerName: string,
  paymentId?: string,
  amount?: number
): Promise<{ success: boolean; message: string; sentCount?: number }> {
  const notification: WebPushNotification = {
    title: '🔐 OTP Verification Required',
    body: `Your OTP code is: ${otp}`,
    data: {
      type: 'otp',
      otp: otp,
      retailerId,
      paymentId: paymentId || '',
      amount: amount?.toString() || '',
      retailerName
    },
    icon: '/icon-192x192.png',
    tag: `otp-${paymentId || Date.now()}`,
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      }
    ]
  };

  const result = await webPushService.sendNotification(retailerId, notification);
  
  return {
    success: result.success,
    message: result.success 
      ? `OTP notification sent to ${result.sentCount} device(s)`
      : result.error || 'Failed to send OTP notification',
    sentCount: result.sentCount
  };
}