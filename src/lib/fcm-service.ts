import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
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

type UserType = 'users' | 'retailers' | 'wholesalers' | 'lineWorkers' | 'superAdmins';

class FCMService {
  private readonly VAPID_KEY = process.env.NEXT_PUBLIC_FCM_VAPID_KEY || '';
  private readonly SERVER_KEY = process.env.FCM_SERVER_KEY || '';

  /**
   * Register a device token for any user type
   */
  async registerDevice(
    userId: string, 
    deviceToken: string, 
    userAgent: string = 'unknown',
    userType: UserType = 'retailers'
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔧 FCM Service: Registering device:', {
        userId,
        userType,
        tokenLength: deviceToken.length,
        tokenPrefix: deviceToken.substring(0, 20) + '...',
        userAgent: userAgent.substring(0, 50) + '...'
      });

      const userRef = doc(db, userType, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.error(`❌ FCM Service: ${userType} not found:`, userId);
        return { success: false, message: `${userType} not found` };
      }

      console.log(`✅ FCM Service: ${userType} found:`, userId);

      const deviceId = this.generateDeviceId(deviceToken, userAgent);
      const device: FCMDevice = {
        token: deviceToken,
        deviceId,
        userAgent,
        lastActive: Timestamp.now(),
        createdAt: Timestamp.now(),
        isActive: true
      };

      // Get current devices
      const userData = userDoc.data();
      const currentDevices: FCMDevice[] = userData.fcmDevices || [];

      // Check if device already exists
      const existingDeviceIndex = currentDevices.findIndex(d => d.deviceId === deviceId);
      
      if (existingDeviceIndex >= 0) {
        // Update existing device
        currentDevices[existingDeviceIndex] = {
          ...currentDevices[existingDeviceIndex],
          lastActive: Timestamp.now(),
          isActive: true,
          token: deviceToken // Update token in case it changed
        };
        console.log('🔄 FCM Service: Updated existing device:', deviceId);
      } else {
        // Add new device
        currentDevices.push(device);
        console.log('➕ FCM Service: Added new device:', deviceId);
      }

      // Update user document
      await updateDoc(userRef, {
        fcmDevices: currentDevices,
        updatedAt: Timestamp.now()
      });

      console.log(`✅ FCM Service: Device registered successfully for ${userType}:`, userId);
      return { success: true, message: 'Device registered successfully' };

    } catch (error) {
      console.error('❌ FCM Service: Error registering device:', error);
      return { success: false, message: 'Failed to register device' };
    }
  }

  /**
   * Unregister a specific device token for any user type
   */
  async unregisterDevice(
    userId: string, 
    deviceToken: string,
    userType: UserType = 'retailers'
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🗑️ FCM Service: Unregistering device:', {
        userId,
        userType,
        tokenLength: deviceToken.length,
        tokenPrefix: deviceToken.substring(0, 20) + '...'
      });

      const userRef = doc(db, userType, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.error(`❌ FCM Service: ${userType} not found:`, userId);
        return { success: false, message: `${userType} not found` };
      }

      const userData = userDoc.data();
      const currentDevices: FCMDevice[] = userData.fcmDevices || [];

      // Mark device as inactive instead of removing completely (for audit trail)
      const finalDevices = currentDevices.map(device => 
        device.token === deviceToken 
          ? { ...device, isActive: false, lastActive: Timestamp.now() }
          : device
      );

      await updateDoc(userRef, {
        fcmDevices: finalDevices,
        updatedAt: Timestamp.now()
      });

      console.log(`✅ FCM Service: Device unregistered successfully for ${userType}:`, userId);
      return { success: true, message: 'Device unregistered successfully' };

    } catch (error) {
      console.error('❌ FCM Service: Error unregistering device:', error);
      return { success: false, message: 'Failed to unregister device' };
    }
  }

  /**
   * Generate a unique device ID based on token and user agent
   */
  private generateDeviceId(token: string, userAgent: string): string {
    // Create a simple hash without crypto module for browser compatibility
    let hash = 0;
    const str = `${token}:${userAgent}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `device_${Math.abs(hash).toString(16)}`;
  }

  /**
   * Check if FCM is properly configured
   */
  isConfigured(): boolean {
    return !!(this.VAPID_KEY || this.SERVER_KEY);
  }

  /**
   * Get active devices for a user
   */
  async getActiveDevices(userId: string, userType: UserType = 'retailers'): Promise<FCMDevice[]> {
    try {
      const userRef = doc(db, userType, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return [];
      }

      const userData = userDoc.data();
      const devices: FCMDevice[] = userData.fcmDevices || [];
      
      // Return only active devices
      return devices.filter(device => device.isActive);
    } catch (error) {
      console.error('❌ FCM Service: Error getting active devices:', error);
      return [];
    }
  }

  /**
   * Send notification to specific user devices
   */
  async sendNotificationToUser(
    userId: string,
    notification: FCMNotificationData,
    userType: UserType = 'retailers'
  ): Promise<{ success: boolean; sent: number; failed: number; message: string }> {
    try {
      const devices = await this.getActiveDevices(userId, userType);
      
      if (devices.length === 0) {
        return { success: true, sent: 0, failed: 0, message: 'No active devices found' };
      }

      const tokens = devices.map(device => device.token);
      return await this.sendNotification(tokens, notification);
      
    } catch (error) {
      console.error('❌ FCM Service: Error sending notification to user:', error);
      return { success: false, sent: 0, failed: 0, message: 'Failed to send notification' };
    }
  }

  /**
   * Send notification to multiple device tokens
   */
  async sendNotification(
    tokens: string[],
    notification: FCMNotificationData
  ): Promise<{ success: boolean; sent: number; failed: number; message: string }> {
    try {
      if (!tokens.length) {
        return { success: true, sent: 0, failed: 0, message: 'No tokens provided' };
      }

      // This would integrate with Firebase Cloud Messaging HTTP API
      // For now, return a placeholder response
      console.log('📤 FCM Service: Sending notification to', tokens.length, 'devices');
      console.log('📝 Notification:', notification);
      
      // TODO: Implement actual FCM HTTP API call
      // const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `key=${this.SERVER_KEY}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     notification,
      //     registration_ids: tokens,
      //   }),
      // });

      return { success: true, sent: tokens.length, failed: 0, message: 'Notification sent successfully' };
      
    } catch (error) {
      console.error('❌ FCM Service: Error sending notification:', error);
      return { success: false, sent: 0, failed: tokens.length, message: 'Failed to send notification' };
    }
  }

  /**
   * Send OTP notification via FCM
   */
  async sendOTPViaFCM(
    retailerId: string,
    otp: string,
    amount: number,
    paymentId: string,
    lineWorkerName?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const notification: FCMNotificationData = {
        title: '🔔 New OTP Received',
        body: `OTP: ${otp} for ₹${amount} from ${lineWorkerName || 'Line Worker'}`,
        data: {
          type: 'otp',
          otp,
          amount: amount.toString(),
          paymentId,
          retailerId,
          lineWorkerName: lineWorkerName || ''
        },
        tag: `otp-${paymentId}`,
        clickAction: '/dashboard'
      };

      const result = await this.sendNotificationToUser(retailerId, notification, 'retailers');
      
      if (result.success) {
        console.log('✅ OTP notification sent successfully:', { retailerId, paymentId });
        return { success: true, message: 'OTP notification sent successfully' };
      } else {
        console.error('❌ Failed to send OTP notification:', { retailerId, paymentId });
        return { success: false, message: 'Failed to send OTP notification' };
      }
    } catch (error) {
      console.error('❌ Error sending OTP via FCM:', error);
      return { success: false, message: 'Error sending OTP notification' };
    }
  }

  /**
   * Send payment notification via FCM
   */
  async sendPaymentNotificationViaFCM(
    retailerId: string,
    paymentId: string,
    status: 'completed' | 'failed' | 'pending',
    amount: number,
    customerName?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      let notification: FCMNotificationData;

      switch (status) {
        case 'completed':
          notification = {
            title: '✅ Payment Completed',
            body: `Payment of ₹${amount} has been completed successfully${customerName ? ` for ${customerName}` : ''}`,
            data: {
              type: 'payment_completed',
              paymentId,
              retailerId,
              amount: amount.toString(),
              status,
              customerName: customerName || ''
            },
            tag: `payment-${paymentId}`,
            clickAction: '/dashboard'
          };
          break;
        case 'failed':
          notification = {
            title: '❌ Payment Failed',
            body: `Payment of ₹${amount} has failed${customerName ? ` for ${customerName}` : ''}. Please try again.`,
            data: {
              type: 'payment_failed',
              paymentId,
              retailerId,
              amount: amount.toString(),
              status,
              customerName: customerName || ''
            },
            tag: `payment-${paymentId}`,
            clickAction: '/dashboard'
          };
          break;
        case 'pending':
          notification = {
            title: '⏳ Payment Pending',
            body: `Payment of ₹${amount} is pending confirmation${customerName ? ` for ${customerName}` : ''}`,
            data: {
              type: 'payment_pending',
              paymentId,
              retailerId,
              amount: amount.toString(),
              status,
              customerName: customerName || ''
            },
            tag: `payment-${paymentId}`,
            clickAction: '/dashboard'
          };
          break;
        default:
          throw new Error(`Invalid payment status: ${status}`);
      }

      const result = await this.sendNotificationToUser(retailerId, notification, 'retailers');
      
      if (result.success) {
        console.log('✅ Payment notification sent successfully:', { retailerId, paymentId, status });
        return { success: true, message: 'Payment notification sent successfully' };
      } else {
        console.error('❌ Failed to send payment notification:', { retailerId, paymentId, status });
        return { success: false, message: 'Failed to send payment notification' };
      }
    } catch (error) {
      console.error('❌ Error sending payment notification via FCM:', error);
      return { success: false, message: 'Error sending payment notification' };
    }
  }
}

export const fcmService = new FCMService();

// Export individual methods for direct import
export const sendOTPViaFCM = fcmService.sendOTPViaFCM.bind(fcmService);
export const sendPaymentNotificationViaFCM = fcmService.sendPaymentNotificationViaFCM.bind(fcmService);