// Enhanced Notification Service - Combines real-time + FCM
import { notificationService } from './notification-service';
import { realtimeNotificationService } from './realtime-notifications';
import { roleBasedNotificationService } from './role-based-notification-service';
import { sendOTPNotificationViaCloudFunction, sendPaymentCompletionNotificationViaCloudFunction } from '@/lib/cloud-functions';

export interface EnhancedNotificationItem {
  id: string;
  type: 'warning' | 'success' | 'info' | 'otp';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  role: 'super_admin' | 'wholesaler' | 'line_worker' | 'retailer';
  tenantId?: string;
  fcmDelivered?: boolean;
  inAppDelivered?: boolean;
  // Additional fields for different notification types
  workerName?: string;
  retailerName?: string;
  amount?: number;
  paymentId?: string;
  otp?: string;
}

class EnhancedNotificationService {
  private static instance: EnhancedNotificationService;
  private currentUserRole: string = 'unknown';
  private currentTenantId: string = 'system';
  private fcmEnabled: boolean = false;

  private constructor() {}

  static getInstance(): EnhancedNotificationService {
    if (!EnhancedNotificationService.instance) {
      EnhancedNotificationService.instance = new EnhancedNotificationService();
    }
    return EnhancedNotificationService.instance;
  }

  // Initialize the service with user context
  initialize(userRole: string, tenantId: string = 'system'): void {
    this.currentUserRole = userRole.toLowerCase();
    this.currentTenantId = tenantId;
    
    // Set role in notification service
    notificationService.setRole(userRole);
    
    // Set role in role-based service
    if (typeof window !== 'undefined' && roleBasedNotificationService) {
      roleBasedNotificationService.setCurrentRole(userRole);
    }
    
    console.log(`🔔 Enhanced notifications initialized for role: ${userRole}, tenant: ${tenantId}`);
  }

  // Add notification with dual delivery (in-app + FCM)
  async addNotification(
    notification: Omit<EnhancedNotificationItem, 'id' | 'inAppDelivered' | 'fcmDelivered'>,
    targetRole?: string
  ): Promise<string> {
    const notificationId = notificationService.addNotification({
      type: notification.type === 'otp' ? 'info' : notification.type,
      title: notification.title,
      message: notification.message,
      timestamp: notification.timestamp,
      read: notification.read,
      workerName: notification.workerName,
      retailerName: notification.retailerName,
      amount: notification.amount,
      paymentId: notification.paymentId
    }, notification.tenantId || this.currentTenantId);

    // Also send via FCM/PWA if it's an important notification
    if (this.shouldSendFCM(notification as any)) {
      try {
        if (roleBasedNotificationService) {
          const fcmSuccess = await roleBasedNotificationService.sendNotificationToRole({
          type: notification.type === 'otp' ? 'otp' : 
                notification.type === 'success' ? 'payment_completed' : 
                notification.type === 'warning' ? 'system' : 'test',
          targetRole: (targetRole || notification.role || this.currentUserRole) as any,
          data: {
            paymentId: notification.paymentId,
            otp: notification.otp,
            amount: notification.amount,
            retailerName: notification.retailerName,
            workerName: notification.workerName,
            lineWorkerName: notification.workerName,
            title: notification.title,
            message: notification.message
          }
        });
        
        console.log(`🔔 FCM delivery ${fcmSuccess ? 'succeeded' : 'failed'} for notification: ${notificationId}`);
        }
      } catch (error) {
        console.warn('⚠️ FCM delivery failed:', error);
      }
    }

    return notificationId;
  }

  // Check if notification should be sent via FCM
  private shouldSendFCM(notification: EnhancedNotificationItem): boolean {
    // Send FCM for critical notifications
    return (
      notification.type === 'otp' ||
      (notification.type === 'success' && notification.amount && notification.amount > 5000) ||
      notification.type === 'warning'
    );
  }

  // Role-specific notification methods
  async sendOTPNotification(retailerId: string, otp: string, amount: number, lineWorkerName: string, lineWorkerId?: string): Promise<boolean> {
    // Add to in-app notifications
    this.addNotification({
      type: 'otp',
      title: '🔐 Payment OTP Required',
      message: `OTP: ${otp} for ₹${amount.toLocaleString()} by ${lineWorkerName}`,
      timestamp: new Date(),
      read: false,
      role: 'retailer',
      tenantId: this.currentTenantId,
      otp,
      amount,
      workerName: lineWorkerName
    }, 'retailer');

    // Send via Cloud Function
    try {
      const result = await sendOTPNotificationViaCloudFunction({
        retailerId,
        otp,
        amount,
        paymentId: `otp-${Date.now()}`,
        lineWorkerName,
        lineWorkerId: lineWorkerId || ''
      });
      
      console.log(`🔔 Cloud function OTP delivery ${result.success ? 'succeeded' : 'failed'} for retailer: ${retailerId}`);
      return result.success ?? false;
    } catch (error) {
      console.warn('⚠️ Cloud function OTP delivery failed:', error);
      return false;
    }
  }

  async sendPaymentCompletedNotification(
    workerName: string,
    retailerName: string,
    amount: number,
    paymentId: string,
    targetRole: 'line_worker' | 'wholesaler' | 'super_admin' = 'line_worker',
    retailerId?: string
  ): Promise<boolean> {
    // Add to in-app notifications
    this.addNotification({
      type: 'success',
      title: '✅ Payment Completed',
      message: `Payment of ₹${amount.toLocaleString()} completed from ${retailerName}`,
      timestamp: new Date(),
      read: false,
      role: targetRole,
      tenantId: this.currentTenantId,
      amount,
      workerName,
      retailerName,
      paymentId
    }, targetRole);

    // Send via Cloud Function for high-value payments
    const shouldSendCloudNotification = amount > 5000;
    if (shouldSendCloudNotification && retailerId) {
      try {
        const result = await sendPaymentCompletionNotificationViaCloudFunction({
          retailerId,
          amount,
          paymentId,
          recipientType: targetRole === 'wholesaler' ? 'wholesaler' : 'retailer',
          retailerName,
          lineWorkerName: workerName,
          title: '✅ Payment Completed',
          body: `Payment of ₹${amount.toLocaleString()} completed from ${retailerName}`
        });
        
        console.log(`🔔 Cloud function payment delivery ${result.success ? 'succeeded' : 'failed'} for ${targetRole}: ${retailerId}`);
        return result.success ?? false;
      } catch (error) {
        console.warn('⚠️ Cloud function payment delivery failed:', error);
        return false;
      }
    }
    return true;
  }

  // Get notifications for current user
  getNotifications(): EnhancedNotificationItem[] {
    const baseNotifications = notificationService.getNotifications(this.currentTenantId);
    
    return baseNotifications.map(notification => ({
      ...notification,
      role: this.currentUserRole as any,
      tenantId: this.currentTenantId,
      inAppDelivered: true,
      fcmDelivered: false // We don't track this yet
    }));
  }

  // Get unread count
  getUnreadCount(): number {
    return notificationService.getUnreadCount(this.currentTenantId);
  }

  // Mark as read
  markAsRead(id: string): void {
    notificationService.markAsRead(id, this.currentTenantId);
  }

  // Mark all as read
  markAllAsRead(): void {
    notificationService.markAllAsRead(this.currentTenantId);
  }

  // Start real-time listening
  startRealtimeListening(userId: string, callback: (notifications: EnhancedNotificationItem[]) => void): void {
    realtimeNotificationService.startListening(
      userId,
      this.currentUserRole.toUpperCase(),
      this.currentTenantId === 'all' ? 'system' : this.currentTenantId,
      (notifications) => {
        // Transform notifications to enhanced format
        const enhancedNotifications: EnhancedNotificationItem[] = notifications.map(n => ({
          ...n,
          role: this.currentUserRole as any,
          tenantId: this.currentTenantId,
          inAppDelivered: true,
          fcmDelivered: false
        }));
        
        callback(enhancedNotifications);
      }
    );
  }

  // Stop real-time listening
  stopRealtimeListening(userId: string): void {
    realtimeNotificationService.stopListening(userId);
  }

  // Enable/disable FCM
  setFCMEnabled(enabled: boolean): void {
    this.fcmEnabled = enabled;
    console.log(`🔔 FCM ${enabled ? 'enabled' : 'disabled'} for enhanced notifications`);
  }

  // Test notification system
  async testNotification(): Promise<{ inApp: boolean; fcm: boolean }> {
    console.log('🧪 Testing enhanced notification system...');
    
    // Test in-app notification
    const notificationId = this.addNotification({
      type: 'info',
      title: '📱 Test Notification',
      message: 'This is a test of the enhanced notification system',
      timestamp: new Date(),
      read: false,
      role: this.currentUserRole as any,
      tenantId: this.currentTenantId
    });

    // Test FCM notification
    let fcmSuccess = false;
    try {
      if (roleBasedNotificationService) {
        fcmSuccess = await roleBasedNotificationService.sendNotificationToRole({
        type: 'test',
        targetRole: this.currentUserRole as any,
        data: {}
      });
      }
    } catch (error) {
      console.warn('⚠️ FCM test failed:', error);
    }

    return {
      inApp: !!notificationId,
      fcm: fcmSuccess
    };
  }

  // Test high-value payment notification
  async testHighValuePayment(): Promise<boolean> {
    console.log('🧪 Testing high-value payment notification...');
    
    return await this.sendPaymentCompletedNotification(
      'Test Line Worker',
      'Test Retailer',
      6000, // High value > 5000
      'test-payment-' + Date.now(),
      this.currentUserRole as any
    );
  }

  // Test OTP notification
  async testOTPNotification(): Promise<boolean> {
    console.log('🧪 Testing OTP notification...');
    
    return await this.sendOTPNotification(
      'test-retailer-id',
      '123456',
      1000,
      'Test Line Worker'
    );
  }
}

// Export singleton instance
export const enhancedNotificationService = EnhancedNotificationService.getInstance();