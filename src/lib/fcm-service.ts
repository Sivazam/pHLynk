import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { FCMDevice } from '@/types';

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
  private readonly VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || 'BPSKS7O0fnRC92iiqklOjZ8WcYrYrkJ1Dn6kr_9MnnKbPhU9i5sQ1BtL6RLZwBAYs37EOG3eCwD6AdIVE4ycNrA';
  private readonly SERVER_KEY = process.env.FCM_SERVER_KEY || 'BPSKS7O0fnRC92iiqklOjZ8WcYrYrkJ1Dn6kr_9MnnKbPhU9i5sQ1BtL6RLZwBAYs37EOG3eCwD6AdIVE4ycNrA';

  /**
   * Register a device token for a user in their respective collection
   */
  async registerDevice(
    userId: string, 
    deviceToken: string, 
    userAgent: string = 'unknown',
    userType: 'retailer' | 'line_worker' | 'wholesaler' | 'super_admin' = 'retailer'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const collectionName = this.getCollectionName(userType);
      const userRef = doc(db, collectionName, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return { success: false, message: `${userType} not found` };
      }

      const device: FCMDevice = {
        token: deviceToken,
        userAgent,
        registeredAt: new Date(),
        lastActive: new Date(),
        userType
      };

      // Check if device already exists
      const existingDevices = userDoc.data()?.fcmDevices || [];
      const deviceExists = existingDevices.some((d: FCMDevice) => d.token === deviceToken);

      if (deviceExists) {
        // Update last active timestamp
        const updatedDevices = existingDevices.map((d: FCMDevice) =>
          d.token === deviceToken ? { ...d, lastActive: new Date() } : d
        );
        
        await updateDoc(userRef, { fcmDevices: updatedDevices });
        return { success: true, message: 'Device updated successfully' };
      } else {
        // Add new device
        await updateDoc(userRef, {
          fcmDevices: arrayUnion(device)
        });
        return { success: true, message: 'Device registered successfully' };
      }
    } catch (error) {
      console.error('Error registering FCM device:', error);
      return { success: false, message: 'Failed to register device' };
    }
  }

  /**
   * Unregister a device token for a user from their respective collection
   */
  async unregisterDevice(
    userId: string, 
    deviceToken: string,
    userType: 'retailer' | 'line_worker' | 'wholesaler' | 'super_admin' = 'retailer'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const collectionName = this.getCollectionName(userType);
      const userRef = doc(db, collectionName, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return { success: false, message: `${userType} not found` };
      }

      const existingDevices = userDoc.data()?.fcmDevices || [];
      const deviceToRemove = existingDevices.find((d: FCMDevice) => d.token === deviceToken);

      if (deviceToRemove) {
        await updateDoc(userRef, {
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
   * Send notification to all devices for a user
   */
  async sendNotificationToUser(
    userId: string, 
    userType: 'retailer' | 'line_worker' | 'wholesaler' | 'super_admin',
    notification: FCMNotificationData
  ): Promise<{ success: boolean; message: string; sentCount?: number }> {
    try {
      const devices = await this.getUserDevices(userId, userType);
      
      if (devices.length === 0) {
        return { success: false, message: `No devices registered for this ${userType}` };
      }

      // Clean up inactive devices before sending
      await this.cleanupInactiveDevices(userId, userType);
      const activeDevices = await this.getUserDevices(userId, userType);

      if (activeDevices.length === 0) {
        return { success: false, message: `No active devices found for this ${userType}` };
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
              await this.unregisterDevice(userId, device.token, userType);
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
      console.error('Error sending notification to user:', error);
      return { success: false, message: 'Failed to send notification' };
    }
  }

  /**
   * Send notification to all devices for a retailer (backward compatibility)
   */
  async sendNotificationToRetailer(retailerId: string, notification: FCMNotificationData): Promise<{ success: boolean; message: string; sentCount?: number }> {
    return this.sendNotificationToUser(retailerId, 'retailer', notification);
  }

  /**
   * Send notification to all devices for a wholesaler
   */
  async sendNotificationToWholesaler(wholesalerId: string, notification: FCMNotificationData): Promise<{ success: boolean; message: string; sentCount?: number }> {
    return this.sendNotificationToUser(wholesalerId, 'wholesaler', notification);
  }

  /**
   * Send notification to all devices for a line worker
   */
  async sendNotificationToLineWorker(lineWorkerId: string, notification: FCMNotificationData): Promise<{ success: boolean; message: string; sentCount?: number }> {
    return this.sendNotificationToUser(lineWorkerId, 'line_worker', notification);
  }

  /**
   * Send notification to a specific device token
   */
  private async sendToDevice(deviceToken: string, notification: FCMNotificationData): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.SERVER_KEY) {
        console.warn('FCM_SERVER_KEY not configured');
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
    return !!(this.VAPID_KEY && this.SERVER_KEY);
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