/**
 * Enhanced FCM Manager with De-duplication
 * Handles FCM notifications with duplicate prevention
 */

import { onMessage } from 'firebase/messaging';
import { getMessagingInstance } from './fcm';
import { notificationDeduplicator } from './notification-deduplicator';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';

export interface EnhancedFCMConfig {
  enableToast: boolean;
  enableBrowserNotification: boolean;
  autoCloseDelay: number;
  requireInteraction: boolean;
}

class EnhancedFCMManager {
  private static instance: EnhancedFCMManager;
  private config: EnhancedFCMConfig;
  private isInitialized = false;
  private unsubscribeFunctions: Array<() => void> = [];

  private constructor() {
    this.config = {
      enableToast: true,
      enableBrowserNotification: true,
      autoCloseDelay: 5000,
      requireInteraction: false
    };
  }

  static getInstance(): EnhancedFCMManager {
    if (!EnhancedFCMManager.instance) {
      EnhancedFCMManager.instance = new EnhancedFCMManager();
    }
    return EnhancedFCMManager.instance;
  }

  /**
   * Initialize the enhanced FCM manager
   */
  initialize(config?: Partial<EnhancedFCMConfig>): void {
    if (this.isInitialized) {
      console.warn('Enhanced FCM Manager already initialized');
      return;
    }

    this.config = { ...this.config, ...config };
    this.setupForegroundListener();
    this.isInitialized = true;

    console.log('✅ Enhanced FCM Manager initialized with config:', this.config);
  }

  /**
   * Set up foreground message listener with de-duplication and auth check
   */
  private setupForegroundListener(): void {
    try {
      const messagingInstance = getMessagingInstance();
      if (!messagingInstance) {
        console.warn('⚠️ Firebase Messaging instance not available');
        return;
      }

      const unsubscribe = onMessage(messagingInstance, (payload: any) => {
        console.log('📱 Enhanced FCM message received:', payload);
        
        // 🔐 SECURITY: Check if user is authenticated before processing
        if (!this.isUserAuthenticated()) {
          console.log('🚫 User not authenticated - discarding foreground notification:', payload.notification?.title);
          return;
        }
        
        // 🔥 DUPLICATE PREVENTION: Skip OTP notifications as they're handled by service worker
        const notificationData = payload.data || {};
        if (notificationData.type === 'otp') {
          console.log('🚫 OTP notification handled by service worker - skipping foreground display to prevent duplicates');
          return;
        }
        
        // Check de-duplicator before showing notification (only if available)
        const deduplicator = notificationDeduplicator;
        if (deduplicator) {
          const { shouldShow, reason } = deduplicator.shouldShowNotification(payload);
          
          console.log(`🔍 Notification decision: ${shouldShow ? 'SHOW' : 'BLOCK'} - ${reason}`);
          
          if (shouldShow) {
            this.handleNotification(payload);
          } else {
            console.log('🚫 Notification blocked by de-duplicator:', reason);
          }
        } else {
          // Fallback to showing notification if deduplicator is not available (SSR case)
          console.log('📱 Deduplicator not available, showing notification directly');
          this.handleNotification(payload);
        }
      });

      this.unsubscribeFunctions.push(unsubscribe);
    } catch (error) {
      console.error('❌ Error setting up enhanced FCM listener:', error);
    }
  }

  /**
   * Check if user is currently authenticated
   * This prevents showing notifications to logged-out users
   */
  private isUserAuthenticated(): boolean {
    try {
      // Use Firebase Auth instance to check current user
      return !!auth.currentUser;
    } catch (error) {
      console.error('❌ Error checking auth status in enhanced FCM manager:', error);
      return false;
    }
  }

  /**
   * Handle notification display
   */
  private handleNotification(payload: any): void {
    const notificationTitle = payload.notification?.title || 'pHLynk Notification';
    const notificationBody = payload.notification?.body || 'You have a new notification';
    const notificationData = payload.data || {};

    // Show browser notification if enabled
    if (this.config.enableBrowserNotification) {
      this.showBrowserNotification(notificationTitle, notificationBody, notificationData);
    }

    // Show toast notification if enabled
    if (this.config.enableToast) {
      this.showToastNotification(notificationData);
    }
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(title: string, body: string, data: any): void {
    try {
      const notificationOptions = {
        body,
        icon: data.icon || '/notification-large-192x192.png',
        badge: data.badge || '/badge-72x72.png',
        tag: data.tag || 'default',
        requireInteraction: this.config.requireInteraction,
        data
      };

      const notification = new Notification(title, notificationOptions);
      
      // Auto-close after delay
      if (!this.config.requireInteraction && this.config.autoCloseDelay > 0) {
        setTimeout(() => {
          notification.close();
        }, this.config.autoCloseDelay);
      }

      // Handle notification click
      notification.onclick = () => {
        const urlToOpen = data.url || data.clickAction || '/';
        window.open(urlToOpen, '_blank');
        notification.close();
      };

      console.log('✅ Browser notification shown:', title);
    } catch (error) {
      console.error('❌ Error showing browser notification:', error);
    }
  }

  /**
   * Show toast notification
   */
  private showToastNotification(data: any): void {
    try {
      if (data.type === 'otp') {
        toast.success(`🔐 OTP: ${data.otp} for ₹${data.amount}`, {
          duration: 5000,
          position: 'top-right'
        });
      } else if (data.type === 'payment_completed' || data.type === 'payment-completed') {
        toast.success(`✅ Payment of ₹${data.amount} completed`, {
          duration: 5000,
          position: 'top-right'
        });
      } else {
        toast.info(data.body || 'New notification received', {
          duration: 4000,
          position: 'top-right'
        });
      }

      console.log('✅ Toast notification shown for type:', data.type);
    } catch (error) {
      console.error('❌ Error showing toast notification:', error);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<EnhancedFCMConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('📝 Enhanced FCM config updated:', this.config);
  }

  /**
   * Send test notification
   */
  sendTestNotification(): void {
    const testPayload = {
      notification: {
        title: '🧪 Test Notification',
        body: 'This is a test from Enhanced FCM Manager'
      },
      data: {
        type: 'test',
        tag: 'test-notification',
        timestamp: Date.now().toString()
      }
    };

    const deduplicator = notificationDeduplicator;
    if (deduplicator) {
      const { shouldShow, reason } = deduplicator.shouldShowNotification(testPayload);
      
      if (shouldShow) {
        this.handleNotification(testPayload);
        console.log('🧪 Test notification sent');
      } else {
        console.log('🚫 Test notification blocked:', reason);
        toast.info(`Test notification blocked: ${reason}`);
      }
    } else {
      this.handleNotification(testPayload);
      console.log('🧪 Test notification sent (deduplicator not available)');
    }
  }

  /**
   * Get debug information
   */
  getDebugInfo(): any {
    const deduplicator = notificationDeduplicator;
    return {
      isInitialized: this.isInitialized,
      config: this.config,
      deduplicatorInfo: deduplicator ? deduplicator.getDebugInfo() : null,
      unsubscribeCount: this.unsubscribeFunctions.length
    };
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.unsubscribeFunctions.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error cleaning up FCM listener:', error);
      }
    });
    this.unsubscribeFunctions = [];
    this.isInitialized = false;
    console.log('🧹 Enhanced FCM Manager cleaned up');
  }
}

export const enhancedFCMManager = EnhancedFCMManager.getInstance();