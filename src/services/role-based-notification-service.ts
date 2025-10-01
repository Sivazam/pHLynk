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
  private currentUserRole: string = 'unknown';

  private constructor() {
    this.initializeServiceWorker();
  }

  static getInstance(): RoleBasedNotificationService {
    if (!RoleBasedNotificationService.instance) {
      RoleBasedNotificationService.instance = new RoleBasedNotificationService();
    }
    return RoleBasedNotificationService.instance;
  }

  // Method to set the current user role (called from frontend components)
  setCurrentRole(role: string): void {
    this.currentUserRole = role.toLowerCase();
    console.log(`🔐 Set current user role: ${this.currentUserRole}`);
  }

  // Public getter for current user role
  getCurrentRole(): string {
    return this.currentUserRole !== 'unknown' ? this.currentUserRole : this.getCurrentUserRole();
  }

  private async initializeServiceWorker() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        console.log('🔧 Initializing service worker for notifications...');
        
        // Register service worker
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service worker registered:', this.serviceWorkerRegistration);
        
        // Wait for service worker to be active
        if (this.serviceWorkerRegistration.active) {
          console.log('✅ Service worker is already active');
        } else {
          console.log('⏳ Waiting for service worker to become active...');
          await new Promise((resolve) => {
            const listener = () => {
              if (this.serviceWorkerRegistration?.active) {
                console.log('✅ Service worker became active');
                resolve(true);
              }
            };
            this.serviceWorkerRegistration?.addEventListener('controllerchange', listener);
            // Fallback timeout
            setTimeout(() => {
              console.log('⏰ Service worker activation timeout');
              resolve(true);
            }, 3000);
          });
        }
        
        this.isSupported = 'Notification' in window && 'PushManager' in window;
        console.log('✅ Role-based notification service initialized', {
          supported: this.isSupported,
          hasActiveWorker: !!this.serviceWorkerRegistration?.active
        });
      } catch (error) {
        console.error('❌ Failed to initialize service worker:', error);
        this.isSupported = false;
      }
    } else {
      console.warn('⚠️ Service workers not supported in this environment');
      this.isSupported = false;
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    if (!this.isSupported || typeof Notification === 'undefined') {
      console.warn('⚠️ Notifications not supported in this environment');
      return false;
    }

    try {
      console.log('🔔 Requesting notification permission...');
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      
      if (granted) {
        console.log('✅ Notification permission granted');
        
        // Check if we're in a PWA installed environment
        const isPWA = this.isPWAInstalled();
        console.log('📱 PWA Environment:', {
          isStandalone: isPWA,
          isInWebApp: window.matchMedia('(display-mode: standalone)').matches,
          isInBrowser: !isPWA
        });
        
        // Subscribe to push notifications for background support
        await this.subscribeToPushNotifications();
        
        // Test immediate notification to verify it works
        await this.testImmediateNotification();
      } else {
        console.warn('❌ Notification permission denied');
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
        ) as unknown as ArrayBuffer
      });

      console.log('✅ Push subscription created for background notifications');
      
      // In production, send subscription to server
      // await this.sendSubscriptionToServer(subscription);
    } catch (error) {
      console.warn('⚠️ Push subscription failed:', error);
    }
  }

  async sendTestNotification(): Promise<boolean> {
    return this.sendNotificationToRole({
      type: 'test',
      targetRole: 'all',
      data: {}
    });
  }

  async sendNotificationToRole(notificationData: NotificationData): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('⚠️ Notifications not supported');
      return false;
    }

    // Get current user role from stored value or detect it
    const userRole = this.currentUserRole !== 'unknown' ? this.currentUserRole : this.getCurrentUserRole();
    
    // Check if current user should receive this notification
    if (!this.shouldUserReceiveNotification(notificationData.targetRole, userRole)) {
      console.log(`🔕 Notification filtered out - User role: ${userRole}, Target: ${notificationData.targetRole}`);
      return false;
    }

    // Create notification payload based on type
    const payload = this.createNotificationPayload(notificationData);
    
    try {
      console.log('📱 Sending notification:', { 
        userRole, 
        targetRole: notificationData.targetRole, 
        payload,
        isPWA: this.isPWAInstalled(),
        hasServiceWorker: !!this.serviceWorkerRegistration?.active
      });
      
      // Enhanced notification sending with fallbacks
      let notificationSent = false;
      
      // Try service worker first (best for PWA)
      if (this.serviceWorkerRegistration && this.serviceWorkerRegistration.active) {
        try {
          console.log('📡 Sending message to service worker');
          this.serviceWorkerRegistration.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload
          });
          notificationSent = true;
        } catch (swError) {
          console.warn('⚠️ Service worker notification failed:', swError);
        }
      }
      
      // Fallback to immediate notification (works in browser and PWA)
      if (Notification.permission === 'granted') {
        try {
          console.log('🔔 Showing immediate notification as fallback/primary');
          
          // Create notification options with proper typing
          const notificationOptions: NotificationOptions = {
            body: payload.body,
            icon: payload.icon || '/icon-192x192.png',
            badge: payload.badge || '/icon-96x96.png',
            tag: payload.tag,
            requireInteraction: payload.requireInteraction
          };

          const notification = new Notification(payload.title, notificationOptions);

          // Handle notification click
          notification.onclick = () => {
            this.handleNotificationClick(notificationData);
            notification.close();
          };

          // Auto-close after 5 seconds for non-interactive notifications
          if (!payload.requireInteraction) {
            setTimeout(() => {
              notification.close();
            }, 5000);
          }
          
          notificationSent = true;
        } catch (immediateError) {
          console.warn('⚠️ Immediate notification failed:', immediateError);
        }
      }
      
      if (notificationSent) {
        console.log(`✅ Notification sent to role: ${userRole}`, payload);
        return true;
      } else {
        console.error('❌ All notification methods failed');
        return false;
      }
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
    
    // Normalize roles to lowercase for comparison
    const normalizedTargetRole = targetRole.toLowerCase();
    const normalizedUserRole = userRole.toLowerCase();
    
    // Only send to users with matching role
    return normalizedTargetRole === normalizedUserRole;
  }

  private getCurrentUserRole(): string {
    try {
      // Get user data from localStorage (where auth context stores it)
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        
        // Check if user is a retailer
        if (user.isRetailer) {
          return 'retailer';
        }
        
        // Check roles array for other user types
        if (user.roles && Array.isArray(user.roles)) {
          // Convert role names to lowercase for consistency
          const role = user.roles[0]?.toLowerCase();
          if (role) {
            return role;
          }
        }
        
        // Fallback to role property if it exists
        if (user.role) {
          return user.role.toLowerCase();
        }
      }
      
      // Additional check: if we have retailerId in localStorage, assume retailer
      const retailerId = localStorage.getItem('retailerId');
      if (retailerId) {
        return 'retailer';
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

    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  // Check if PWA is installed
  private isPWAInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone || 
           document.referrer.includes('android-app://');
  }

  // Test immediate notification
  private async testImmediateNotification(): Promise<void> {
    try {
      console.log('🧪 Testing immediate notification...');
      const notification = new Notification('📱 PharmaLync Notifications', {
        body: 'Notifications are now enabled! You will receive alerts for OTP and payment events.',
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: 'test-enabled',
        requireInteraction: false
      });

      // Auto-close after 3 seconds
      setTimeout(() => {
        notification.close();
      }, 3000);

      console.log('✅ Test notification sent successfully');
    } catch (error) {
      console.error('❌ Failed to send test notification:', error);
    }
  }
}

// Export singleton instance
export const roleBasedNotificationService = RoleBasedNotificationService.getInstance();