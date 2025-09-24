// PWA Push Notification Service
export class PushNotificationService {
  private static instance: PushNotificationService;
  private subscription: PushSubscription | null = null;
  private isSupported: boolean = false;
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {
    this.checkSupport();
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private async checkSupport() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    
    if (this.isSupported) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered for push notifications');
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
        this.isSupported = false;
      }
    } else {
      console.warn('⚠️ Push notifications not supported in this browser');
    }
  }

  async subscribeToPushNotifications(): Promise<boolean> {
    if (!this.isSupported || !this.registration) {
      console.warn('⚠️ Push notifications not supported');
      return false;
    }

    try {
      // In a real implementation, you would generate a VAPID key pair
      // For now, we'll use a placeholder public key
      const publicVapidKey = 'BMgK4zW7qP1s6vY7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4'; // Replace with your actual VAPID public key
      
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicVapidKey)
      });

      this.subscription = subscription;
      
      // In a real implementation, you would send this subscription to your server
      console.log('✅ Push notification subscription successful:', subscription);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to subscribe to push notifications:', error);
      return false;
    }
  }

  async unsubscribeFromPushNotifications(): Promise<boolean> {
    if (!this.subscription) {
      console.warn('⚠️ No active subscription to unsubscribe');
      return false;
    }

    try {
      await this.subscription.unsubscribe();
      this.subscription = null;
      console.log('✅ Unsubscribed from push notifications');
      return true;
    } catch (error) {
      console.error('❌ Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('❌ Failed to request notification permission:', error);
      return false;
    }
  }

  async sendOTPNotification(otpData: {
    otp: string;
    amount: number;
    paymentId: string;
    retailerName: string;
    lineWorkerName: string;
  }): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('⚠️ Push notifications not supported');
      return false;
    }

    try {
      // For demo purposes, we'll show a local notification
      // In production, this would be sent via your backend
      const title = '🔐 New OTP Generated';
      const body = `OTP: ${otpData.otp} for ₹${otpData.amount.toLocaleString()} by ${otpData.lineWorkerName}`;
      
      const notification = new Notification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: `otp-${otpData.paymentId}`,
        requireInteraction: true,
        actions: [
          {
            action: 'view',
            title: 'View OTP'
          },
          {
            action: 'dismiss',
            title: 'Dismiss'
          }
        ]
      });

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      console.log('✅ OTP notification sent:', { title, body });
      return true;
    } catch (error) {
      console.error('❌ Failed to send OTP notification:', error);
      return false;
    }
  }

  async sendPaymentCompletedNotification(paymentData: {
    amount: number;
    paymentId: string;
    retailerName: string;
    lineWorkerName: string;
  }): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('⚠️ Push notifications not supported');
      return false;
    }

    try {
      const title = '✅ Payment Completed';
      const body = `Payment of ₹${paymentData.amount.toLocaleString()} completed successfully`;
      
      const notification = new Notification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: `payment-${paymentData.paymentId}`,
        requireInteraction: false
      });

      console.log('✅ Payment completion notification sent:', { title, body });
      return true;
    } catch (error) {
      console.error('❌ Failed to send payment completion notification:', error);
      return false;
    }
  }

  async sendTestNotification(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('⚠️ Push notifications not supported');
      return false;
    }

    try {
      const title = '📱 Test Notification';
      const body = 'This is a test notification from PharmaLync PWA';
      
      const notification = new Notification(title, {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: 'test-notification'
      });

      console.log('✅ Test notification sent:', { title, body });
      return true;
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
      return false;
    }
  }

  getSubscription(): PushSubscription | null {
    return this.subscription;
  }

  isPushSupported(): boolean {
    return this.isSupported;
  }

  hasPermission(): boolean {
    return Notification.permission === 'granted';
  }

  // Helper method to convert VAPID key
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
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();