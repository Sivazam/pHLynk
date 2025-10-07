// Role-based PWA Notification Service
// This service ensures notifications are only sent to users with appropriate roles

import { notificationDeduplicator } from '@/lib/notification-deduplicator';

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
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.initializeServiceWorker();
    } else {
      console.warn('🖥️ RoleBasedNotificationService: Server environment detected - skipping initialization');
      this.isSupported = false;
    }
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
    console.log('🔧 Initializing service worker for notifications...', {
      hasServiceWorker: 'serviceWorker' in navigator,
      hasNotification: 'Notification' in window,
      hasPushManager: 'PushManager' in window
    });

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        console.log('🔧 Registering service worker...');
        
        // Register service worker
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service worker registered:', {
          scope: this.serviceWorkerRegistration.scope,
          active: !!this.serviceWorkerRegistration.active,
          installing: !!this.serviceWorkerRegistration.installing,
          waiting: !!this.serviceWorkerRegistration.waiting
        });
        
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
          hasActiveWorker: !!this.serviceWorkerRegistration?.active,
          notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'undefined'
        });
      } catch (error) {
        console.error('❌ Failed to initialize service worker:', error);
        this.isSupported = false;
      }
    } else {
      console.warn('⚠️ Service workers not supported in this environment', {
        hasWindow: typeof window !== 'undefined',
        hasServiceWorker: 'serviceWorker' in navigator
      });
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
    console.log('🚀 sendNotificationToRole called:', {
      notificationData,
      isSupported: this.isSupported,
      currentUserRole: this.currentUserRole,
      permission: typeof Notification !== 'undefined' ? Notification.permission : 'undefined'
    });

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
    
    // Check de-duplicator before showing notification
    const fcmPayload = {
      notification: {
        title: payload.title,
        body: payload.body
      },
      data: {
        type: notificationData.type,
        ...notificationData.data,
        tag: payload.tag
      }
    };
    
    // Check de-duplicator before showing notification (only if available)
    const deduplicator = notificationDeduplicator;
    if (deduplicator) {
      const { shouldShow, reason } = deduplicator.shouldShowNotification(fcmPayload);
      
      if (!shouldShow) {
        console.log(`🚫 PWA notification blocked by de-duplicator: ${reason}`);
        return false;
      }
      
      console.log(`✅ PWA notification approved by de-duplicator: ${reason}`);
    } else {
      console.log('📱 Deduplicator not available, proceeding with notification');
    }
    
    try {
      console.log('📱 Sending notification:', { 
        userRole, 
        targetRole: notificationData.targetRole, 
        payload,
        isPWA: this.isPWAInstalled(),
        hasServiceWorker: !!this.serviceWorkerRegistration?.active,
        userAgent: navigator.userAgent,
        isMobile: this.isMobileDevice(),
        permission: Notification.permission
      });
      
      // Enhanced notification sending with multiple fallback strategies
      let notificationSent = false;
      
      // Strategy 1: Direct notification (most reliable for mobile)
      if (Notification.permission === 'granted') {
        try {
          console.log('🔔 Strategy 1: Trying direct notification');
          const notification = this.createMobileOptimizedNotification(payload, notificationData);
          notificationSent = true;
          console.log('✅ Direct notification sent successfully');
          
          // Store in fallback storage for redundancy
          this.storeFallbackNotification(payload, notificationData);
          
        } catch (directError) {
          console.warn('⚠️ Direct notification failed:', directError);
        }
      } else {
        console.warn('⚠️ Notification permission not granted:', Notification.permission);
      }
      
      // Strategy 2: Service worker notification (if direct failed)
      if (!notificationSent && this.serviceWorkerRegistration && this.serviceWorkerRegistration.active) {
        try {
          console.log('📡 Strategy 2: Trying service worker notification');
          this.serviceWorkerRegistration.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload,
            originalData: notificationData
          });
          notificationSent = true;
          console.log('✅ Service worker notification sent successfully');
          
          // Store in fallback storage for redundancy
          this.storeFallbackNotification(payload, notificationData);
          
        } catch (swError) {
          console.warn('⚠️ Service worker notification failed:', swError);
        }
      }
      
      // Strategy 3: In-app notification fallback
      if (!notificationSent) {
        console.log('📱 Strategy 3: Using in-app notification fallback');
        this.createInAppNotification(payload, notificationData);
        notificationSent = true;
        console.log('✅ In-app notification created successfully');
      }
      
      // Strategy 4: Audio alert fallback for critical notifications
      if (notificationData.type === 'otp' && this.isMobileDevice()) {
        console.log('🔊 Strategy 4: Playing audio alert for OTP');
        this.playNotificationSound();
      }
      
      if (notificationSent) {
        console.log(`✅ Notification sent to role: ${userRole}`, payload);
        return true;
      } else {
        console.error('❌ All notification strategies failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      return false;
    }
  }

  private createMobileOptimizedNotification(payload: PWANotificationPayload, notificationData: NotificationData): Notification {
    // Enhanced notification options for mobile devices
    const notificationOptions: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/icon-96x96.png',
      tag: payload.tag,
      requireInteraction: payload.requireInteraction,
      // Mobile-specific enhancements
      silent: false
    };

    // Add mobile-specific enhancements
    if (this.isMobileDevice()) {
      // For mobile, ensure the notification is more interactive
      notificationOptions.requireInteraction = notificationData.type === 'otp';
      
      // Add sound for mobile (if supported)
      if ('sound' in Notification.prototype) {
        (notificationOptions as any).sound = '/notification-sound.mp3';
      }
    }

    const notification = new Notification(payload.title, notificationOptions);

    // Add actions if supported and available
    if (payload.actions && payload.actions.length > 0 && 'actions' in Notification.prototype) {
      // Type assertion for actions support
      (notification as any).actions = payload.actions;
    }

    // Trigger vibration for mobile devices (if supported)
    if (this.isMobileDevice() && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Handle notification click
    notification.onclick = () => {
      this.handleNotificationClick(notificationData);
      notification.close();
    };

    // Auto-close after appropriate time
    const autoCloseTime = this.isMobileDevice() ? 7000 : 5000; // Longer for mobile
    if (!payload.requireInteraction) {
      setTimeout(() => {
        notification.close();
      }, autoCloseTime);
    }

    return notification;
  }

  private isMobileDevice(): boolean {
    const userAgent = navigator.userAgent;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
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
    const roleMatches = normalizedTargetRole === normalizedUserRole;
    
    // 🔐 SECURITY: Additional check - verify user is actually authenticated
    // This prevents notifications to logged-out users who still have role data in localStorage
    const isUserAuthenticated = this.checkUserAuthentication();
    
    const shouldReceive = roleMatches && isUserAuthenticated;
    
    console.log(`🔍 Notification check:`, {
      targetRole,
      userRole,
      roleMatches,
      isUserAuthenticated,
      shouldReceive
    });
    
    return shouldReceive;
  }

  /**
   * Check if user is actually authenticated (not just has role data in localStorage)
   */
  private checkUserAuthentication(): boolean {
    try {
      // Check if Firebase auth user exists
      if (typeof window !== 'undefined' && 'firebase' in window) {
        // Try to get current Firebase user
        const auth = (window as any).firebase?.auth?.();
        if (auth && auth.currentUser) {
          console.log('✅ User is authenticated via Firebase');
          return true;
        }
      }
      
      // Check for retailer-specific authentication indicators
      const retailerId = localStorage.getItem('retailerId');
      const hasUserSession = sessionStorage.getItem('auth_session') || 
                            sessionStorage.getItem('firebase_session');
      
      // Additional check: verify we don't have logout indicators
      const recentlyLoggedOut = localStorage.getItem('logged_out_at');
      if (recentlyLoggedOut) {
        const logoutTime = parseInt(recentlyLoggedOut);
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        if (logoutTime > fiveMinutesAgo) {
          console.log('🚫 User recently logged out - blocking notifications');
          return false;
        }
      }
      
      const isAuthenticated = !!(retailerId && hasUserSession);
      
      console.log(`🔍 Authentication check:`, {
        retailerId: !!retailerId,
        hasUserSession: !!hasUserSession,
        recentlyLoggedOut: !!recentlyLoggedOut,
        isAuthenticated
      });
      
      return isAuthenticated;
    } catch (error) {
      console.warn('⚠️ Error checking user authentication:', error);
      return false; // Err on the side of security
    }
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

  // Fallback notification storage for redundancy
  private storeFallbackNotification(payload: PWANotificationPayload, notificationData: NotificationData): void {
    try {
      const fallbackNotifications = JSON.parse(localStorage.getItem('fallbackNotifications') || '[]');
      fallbackNotifications.push({
        payload,
        notificationData,
        timestamp: new Date().toISOString(),
        shown: false
      });
      
      // Keep only last 10 notifications
      if (fallbackNotifications.length > 10) {
        fallbackNotifications.splice(0, fallbackNotifications.length - 10);
      }
      
      localStorage.setItem('fallbackNotifications', JSON.stringify(fallbackNotifications));
      console.log('📝 Notification stored in fallback storage');
    } catch (error) {
      console.warn('⚠️ Failed to store fallback notification:', error);
    }
  }

  // Create in-app notification as fallback
  private createInAppNotification(payload: PWANotificationPayload, notificationData: NotificationData): void {
    try {
      // Create a custom event for in-app notification
      const event = new CustomEvent('inAppNotification', {
        detail: {
          payload,
          notificationData,
          timestamp: new Date().toISOString()
        }
      });
      
      window.dispatchEvent(event);
      console.log('📱 In-app notification event dispatched');
      
      // Also store for when user returns to the app
      this.storeFallbackNotification(payload, notificationData);
      
    } catch (error) {
      console.warn('⚠️ Failed to create in-app notification:', error);
    }
  }

  // Play notification sound as fallback
  private playNotificationSound(): void {
    try {
      // Create audio context for sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // 800Hz tone
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      console.log('🔊 Notification sound played');
    } catch (error) {
      console.warn('⚠️ Failed to play notification sound:', error);
    }
  }

  // Check for and show missed notifications
  checkMissedNotifications(): void {
    try {
      const fallbackNotifications = JSON.parse(localStorage.getItem('fallbackNotifications') || '[]');
      const unseenNotifications = fallbackNotifications.filter(n => !n.shown);
      
      if (unseenNotifications.length > 0) {
        console.log(`📱 Found ${unseenNotifications.length} missed notifications`);
        
        unseenNotifications.forEach((notification, index) => {
          setTimeout(() => {
            this.createInAppNotification(notification.payload, notification.notificationData);
          }, index * 1000); // Show notifications with 1-second delay
        });
        
        // Mark all as shown
        fallbackNotifications.forEach(n => n.shown = true);
        localStorage.setItem('fallbackNotifications', JSON.stringify(fallbackNotifications));
      }
    } catch (error) {
      console.warn('⚠️ Failed to check missed notifications:', error);
    }
  }
}

// Export singleton instance with lazy initialization (client-side only)
export const roleBasedNotificationService = typeof window !== 'undefined' 
  ? RoleBasedNotificationService.getInstance() 
  : null;