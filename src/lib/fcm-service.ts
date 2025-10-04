import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';

export interface FCMDevice {
  token: string;
  userAgent: string;
  registeredAt: Date;
  lastActive: Date;
}

export interface FCMNotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
  icon?: string;
  badge?: string;
  tag?: string;
  clickAction?: string;
}

class FCMService {
  private readonly VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || '';
  private readonly SERVER_KEY = process.env.FCM_SERVER_KEY || '';

  /**
   * Register a device token for a retailer
   */
  async registerDevice(retailerId: string, deviceToken: string, userAgent: string = 'unknown'): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔧 FCM Service: Registering device:', {
        retailerId,
        tokenLength: deviceToken.length,
        tokenPrefix: deviceToken.substring(0, 20) + '...',
        userAgent: userAgent.substring(0, 50) + '...'
      });

      const retailerRef = doc(db, 'retailers', retailerId);
      const retailerDoc = await getDoc(retailerRef);

      if (!retailerDoc.exists()) {
        console.error('❌ FCM Service: Retailer not found:', retailerId);
        return { success: false, message: 'Retailer not found' };
      }

      console.log('✅ FCM Service: Retailer found:', retailerId);

      const device: FCMDevice = {
        token: deviceToken,
        userAgent,
        registeredAt: new Date(),
        lastActive: new Date()
      };

      // Check if device already exists
      const existingDevices = retailerDoc.data()?.fcmDevices || [];
      console.log('📱 FCM Service: Existing devices count:', existingDevices.length);
      
      const deviceExists = existingDevices.some((d: FCMDevice) => d.token === deviceToken);
      console.log('🔍 FCM Service: Device exists?', deviceExists);

      if (deviceExists) {
        console.log('🔄 FCM Service: Updating existing device last active timestamp');
        // Update last active timestamp
        const updatedDevices = existingDevices.map((d: FCMDevice) =>
          d.token === deviceToken ? { ...d, lastActive: new Date() } : d
        );
        
        await updateDoc(retailerRef, { fcmDevices: updatedDevices });
        console.log('✅ FCM Service: Device updated successfully');
        return { success: true, message: 'Device updated successfully' };
      } else {
        console.log('➕ FCM Service: Adding new device to retailers collection');
        // Add new device
        await updateDoc(retailerRef, {
          fcmDevices: arrayUnion(device)
        });
        console.log('✅ FCM Service: Device registered successfully in retailers collection');
        return { success: true, message: 'Device registered successfully' };
      }
    } catch (error) {
      console.error('❌ FCM Service: Error registering FCM device:', error);
      return { success: false, message: 'Failed to register device' };
    }
  }

  /**
   * Unregister a device token for a retailer
   */
  async unregisterDevice(retailerId: string, deviceToken: string): Promise<{ success: boolean; message: string }> {
    try {
      const retailerRef = doc(db, 'retailers', retailerId);
      const retailerDoc = await getDoc(retailerRef);

      if (!retailerDoc.exists()) {
        return { success: false, message: 'Retailer not found' };
      }

      const existingDevices = retailerDoc.data()?.fcmDevices || [];
      const deviceToRemove = existingDevices.find((d: FCMDevice) => d.token === deviceToken);

      if (deviceToRemove) {
        await updateDoc(retailerRef, {
          fcmDevices: arrayRemove(deviceToRemove)
        });
        return { success: true, message: 'Device unregistered successfully' };
      } else {
        return { success: false, message: 'Device not found' };
      }
    } catch (error) {
      console.error('Error unregistering FCM device:', error);
      return { success: false, message: 'Failed to unregister device' };
    }
  }

  /**
   * Get all registered devices for a retailer
   */
  async getRetailerDevices(retailerId: string): Promise<FCMDevice[]> {
    try {
      const retailerRef = doc(db, 'retailers', retailerId);
      const retailerDoc = await getDoc(retailerRef);

      if (!retailerDoc.exists()) {
        return [];
      }

      return retailerDoc.data()?.fcmDevices || [];
    } catch (error) {
      console.error('Error getting retailer devices:', error);
      return [];
    }
  }

  /**
   * Get all registered devices for a user from their respective collection
   */
  async getUserDevices(userId: string, userType: 'retailer' | 'line_worker' | 'wholesaler' | 'super_admin'): Promise<FCMDevice[]> {
    try {
      const collectionName = this.getCollectionName(userType);
      const userRef = doc(db, collectionName, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return [];
      }

      return userDoc.data()?.fcmDevices || [];
    } catch (error) {
      console.error('Error getting user devices:', error);
      return [];
    }
  }

  /**
   * Get the appropriate collection name for a user type
   */
  private getCollectionName(userType: string): string {
    switch (userType) {
      case 'retailer':
        return 'retailers';
      case 'wholesaler':
      case 'wholesaler_admin':
      case 'super_admin':
        return 'tenants';
      case 'line_worker':
        return 'users';
      default:
        throw new Error(`Unknown user type: ${userType}`);
    }
  }

  /**
   * Clean up inactive devices (older than 30 days) for a user
   */
  async cleanupInactiveDevices(userId: string, userType: 'retailer' | 'line_worker' | 'wholesaler' | 'super_admin'): Promise<void> {
    try {
      const devices = await this.getUserDevices(userId, userType);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const activeDevices = devices.filter(device => 
        new Date(device.lastActive) > thirtyDaysAgo
      );

      if (activeDevices.length !== devices.length) {
        const collectionName = this.getCollectionName(userType);
        const userRef = doc(db, collectionName, userId);
        await updateDoc(userRef, { fcmDevices: activeDevices });
        console.log(`Cleaned up ${devices.length - activeDevices.length} inactive devices for ${userType} ${userId}`);
      }
    } catch (error) {
      console.error('Error cleaning up inactive devices:', error);
    }
  }

  /**
   * Send notification to all devices for a retailer
   */
  async sendNotificationToRetailer(retailerId: string, notification: FCMNotificationData): Promise<{ success: boolean; message: string; sentCount?: number }> {
    try {
      const devices = await this.getRetailerDevices(retailerId);
      
      if (devices.length === 0) {
        return { success: false, message: 'No devices registered for this retailer' };
      }

      // Clean up inactive devices before sending
      await this.cleanupInactiveDevices(retailerId, 'retailer');
      const activeDevices = await this.getRetailerDevices(retailerId);

      if (activeDevices.length === 0) {
        return { success: false, message: 'No active devices found for this retailer' };
      }

      let successCount = 0;
      let failureCount = 0;

      // Send to each device
      for (const device of activeDevices) {
        try {
          const result = await this.sendToDevice(device.token, notification);
          if (result.success) {
            successCount++;
          } else {
            failureCount++;
            // If device token is invalid, remove it
            if (result.error === 'UNREGISTERED' || result.error === 'INVALID_ARGUMENT') {
              await this.unregisterDevice(retailerId, device.token);
            }
          }
        } catch (error) {
          console.error(`Failed to send to device ${device.token}:`, error);
          failureCount++;
        }
      }

      return {
        success: successCount > 0,
        message: `Sent to ${successCount} device(s), ${failureCount} failed`,
        sentCount: successCount
      };
    } catch (error) {
      console.error('Error sending notification to retailer:', error);
      return { success: false, message: 'Failed to send notification' };
    }
  }

  /**
   * Send notification to a specific device token
   */
  private async sendToDevice(deviceToken: string, notification: FCMNotificationData): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.SERVER_KEY) {
        console.warn('⚠️ FCM_SERVER_KEY not configured - cannot send notifications');
        return { success: false, error: 'FCM_NOT_CONFIGURED' };
      }

      const message = {
        to: deviceToken,
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icon-192x192.png',
          badge: notification.badge || '/badge-72x72.png',
          tag: notification.tag,
          click_action: notification.clickAction
        },
        data: notification.data || {},
        priority: 'high',
        timeToLive: 2419200 // 28 days
      };

      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${this.SERVER_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      const responseData = await response.json();

      if (response.ok && responseData.success === 1) {
        return { success: true };
      } else {
        console.error('FCM API Error:', responseData);
        return { success: false, error: responseData.results?.[0]?.error || 'UNKNOWN_ERROR' };
      }
    } catch (error) {
      console.error('Error sending FCM notification:', error);
      return { success: false, error: 'NETWORK_ERROR' };
    }
  }

  /**
   * Get VAPID key for client-side registration
   */
  getVapidKey(): string {
    return this.VAPID_KEY;
  }

  /**
   * Check if FCM is properly configured
   */
  isConfigured(): boolean {
    // For device registration, we only need the database connection
    // The server key is only needed for sending notifications
    return true; // Allow registration for testing
  }
}

// Export singleton instance
export const fcmService = new FCMService();

// Helper functions for specific notification types
export async function sendOTPViaFCM(
  retailerId: string,
  otp: string,
  retailerName: string,
  paymentId?: string,
  amount?: number
): Promise<{ success: boolean; message: string; sentCount?: number }> {
  const notification: FCMNotificationData = {
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
    clickAction: '/retailer/dashboard'
  };

  return await fcmService.sendNotificationToRetailer(retailerId, notification);
}

export async function sendPaymentNotificationViaFCM(
  retailerId: string,
  paymentId: string,
  status: 'completed' | 'failed' | 'pending',
  amount: number,
  customerName?: string
): Promise<{ success: boolean; message: string; sentCount?: number }> {
  const statusConfig = {
    completed: {
      title: '✅ Payment Completed',
      body: `Payment of ₹${amount.toLocaleString()} received${customerName ? ` from ${customerName}` : ''}`
    },
    failed: {
      title: '❌ Payment Failed',
      body: `Payment of ₹${amount.toLocaleString()} failed${customerName ? ` from ${customerName}` : ''}`
    },
    pending: {
      title: '⏳ Payment Pending',
      body: `Payment of ₹${amount.toLocaleString()} is pending${customerName ? ` from ${customerName}` : ''}`
    }
  };

  const config = statusConfig[status];

  const notification: FCMNotificationData = {
    title: config.title,
    body: config.body,
    data: {
      type: 'payment',
      paymentId,
      status,
      amount: amount.toString(),
      customerName: customerName || ''
    },
    icon: '/icon-192x192.png',
    tag: `payment-${paymentId}`,
    clickAction: '/retailer/dashboard'
  };

  return await fcmService.sendNotificationToRetailer(retailerId, notification);
}