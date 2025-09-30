// Role-based PWA Notification Service
// This service ensures notifications are only sent to users with appropriate roles

export interface NotificationData {
  type: 'otp' | 'payment_completed' | 'test' | 'system';
  targetRole: 'super_admin' | 'wholesaler' | 'line_worker' | 'retailer' | 'all';
  data: any;
}

export interface PWANotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
  }>;
}

class RoleBasedNotificationService {
  private static instance: RoleBasedNotificationService;
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  isSupported: boolean = false;

  private constructor() {
    this.initializeServiceWorker();
  }

  static getInstance(): RoleBasedNotificationService {
    if (!RoleBasedNotificationService.instance) {
      RoleBasedNotificationService.instance = new RoleBasedNotificationService();
    }
    return RoleBasedNotificationService.instance;
  }

  private async initializeServiceWorker() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        this.isSupported = 'Notification' in window && 'PushManager' in window;
        console.log('✅ Role-based notification service initialized');
      } catch (error) {
        console.error('❌ Failed to initialize service worker:', error);
        this.isSupported = false;
      }
    } else {
      this.isSupported = false;
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!this.isSupported || typeof Notification === 'undefined') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      
      if (granted) {
        console.log('✅ Notification permission granted');
        // Subscribe to push notifications for background support
        await this.subscribeToPushNotifications();
      }
      
      return granted;
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  }

  private async subscribeToPushNotifications(): Promise<void> {
    if (!this.serviceWorkerRegistration) return;

    try {
      // For PWA background notifications, we need push subscription
      // In production, this would use your VAPID keys
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          'BMgK4zW7qP1s6vY7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4'
        )
      });

      console.log('✅ Push subscription created for background notifications');
      
      // In production, send subscription to server
      // await this.sendSubscriptionToServer(subscription);
    } catch (error) {
      console.warn('⚠️ Push subscription failed:', error);
    }
  }

  async sendNotificationToRole(notificationData: NotificationData): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('⚠️ Notifications not supported');
      return false;
    }

    // Get current user role from localStorage or auth context
    const currentUserRole = this.getCurrentUserRole();
    
    // Check if current user should receive this notification
    if (!this.shouldUserReceiveNotification(notificationData.targetRole, currentUserRole)) {
      console.log(`🔕 Notification filtered out - User role: ${currentUserRole}, Target: ${notificationData.targetRole}`);
      return false;
    }

    // Create notification payload based on type
    const payload = this.createNotificationPayload(notificationData);
    
    try {
      // Send notification via service worker for background support
      if (this.serviceWorkerRegistration) {
        // Send message to service worker
        this.serviceWorkerRegistration.active?.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload
        });
      }

      // Also show immediate notification for active users
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/icon-96x96.png',
        tag: payload.tag,
        requireInteraction: payload.requireInteraction,
        actions: payload.actions
      });

      // Handle notification click
      notification.onclick = () => {
        this.handleNotificationClick(notificationData);
        notification.close();
      };

      console.log(`✅ Notification sent to role: ${currentUserRole}`, payload);
      return true;
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return false;
    }
  }

  private shouldUserReceiveNotification(targetRole: string, userRole: string): boolean {
    // If target is 'all', everyone receives it
    if (targetRole === 'all') {
      return true;
    }
    
    // Only send to users with matching role
    return targetRole === userRole;
  }

  private getCurrentUserRole(): string {
    try {
      // Get user data from localStorage (where auth context stores it)
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.role || 'unknown';
      }
    } catch (error) {
      console.warn('⚠️ Could not determine user role:', error);
    }
    return 'unknown';
  }

  private createNotificationPayload(notificationData: NotificationData): PWANotificationPayload {
    const { type, data } = notificationData;

    switch (type) {
      case 'otp':
        return {
          title: '🔐 Payment OTP Required',
          body: `OTP: ${data.otp} for ₹${data.amount.toLocaleString()} by ${data.lineWorkerName}`,
          icon: '/icon-192x192.png',
          badge: '/icon-96x96.png',
          tag: `otp-${data.paymentId}`,
          requireInteraction: true,
          actions: [
            { action: 'view', title: 'View OTP' },
            { action: 'dismiss', title: 'Dismiss' }
          ]
        };

      case 'payment_completed':
        return {
          title: '✅ Payment Completed',
          body: `Payment of ₹${data.amount.toLocaleString()} completed successfully`,
          icon: '/icon-192x192.png',
          badge: '/icon-96x96.png',
          tag: `payment-${data.paymentId}`,
          requireInteraction: false
        };

      case 'test':
        return {
          title: '📱 Test Notification',
          body: 'This is a test notification from pHLynk',
          icon: '/icon-192x192.png',
          badge: '/icon-96x96.png',
          tag: 'test-notification',
          requireInteraction: false
        };

      default:
        return {
          title: '🔔 Notification',
          body: 'You have a new notification',
          icon: '/icon-192x192.png',
          badge: '/icon-96x96.png',
          tag: 'general-notification',
          requireInteraction: false
        };
    }
  }

  private handleNotificationClick(notificationData: NotificationData) {
    // Focus the window if possible
    if (typeof window !== 'undefined') {
      window.focus();
      
      // Navigate to relevant page based on notification type
      switch (notificationData.type) {
        case 'otp':
          // Navigate to OTP verification page
          window.location.href = '/line-worker';
          break;
        case 'payment_completed':
          // Navigate to dashboard
          window.location.href = '/dashboard';
          break;
        default:
          // Default to dashboard
          window.location.href = '/dashboard';
      }
    }
  }

  // Specific methods for different notification types
  async sendOTPToRetailer(otpData: {
    otp: string;
    amount: number;
    paymentId: string;
    retailerName: string;
    lineWorkerName: string;
  }): Promise<boolean> {
    return this.sendNotificationToRole({
      type: 'otp',
      targetRole: 'retailer', // ONLY retailers receive OTP notifications
      data: otpData
    });
  }

  async sendPaymentCompletedToAll(paymentData: {
    amount: number;
    paymentId: string;
    retailerName: string;
    lineWorkerName: string;
  }): Promise<boolean> {
    return this.sendNotificationToRole({
      type: 'payment_completed',
      targetRole: 'all', // All users see payment completion
      data: paymentData
    });
  }

  async sendTestNotification(): Promise<boolean> {
    return this.sendNotificationToRole({
      type: 'test',
      targetRole: 'all',
      data: {}
    });
  }

  hasPermission(): boolean {
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  }

  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  // Helper method to convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = Buffer.from(base64, 'base64');
    return new Uint8Array(rawData);
  }
}

// Export singleton instance
export const roleBasedNotificationService = RoleBasedNotificationService.getInstance();