import { JWT } from 'google-auth-library';

interface FCMv1Message {
  message: {
    token?: string;
    topic?: string;
    notification?: {
      title: string;
      body: string;
      icon?: string;
      badge?: string;
      tag?: string;
      clickAction?: string;
    };
    data?: Record<string, string>;
    android?: {
      priority?: 'normal' | 'high';
      ttl?: string;
      notification?: {
        icon?: string;
        color?: string;
        sound?: string;
        clickAction?: string;
      };
    };
    webpush?: {
      headers?: Record<string, string>;
      notification?: {
        title: string;
        body: string;
        icon?: string;
        badge?: string;
        tag?: string;
        requireInteraction?: boolean;
        actions?: Array<{
          action: string;
          title: string;
          icon?: string;
        }>;
      };
      data?: Record<string, string>;
      fcmOptions?: {
        link?: string;
      };
    };
    apns?: {
      headers?: Record<string, string>;
      payload?: {
        aps?: {
          alert?: {
            title: string;
            body: string;
          };
          badge?: number;
          sound?: string;
          'content-available'?: number;
          'mutable-content'?: number;
          category?: string;
        };
      };
    };
  };
}

interface FCMv1Response {
  name: string;
}

class FCMv1Service {
  private readonly projectId: string;
  private readonly clientEmail: string;
  private readonly privateKey: string;
  private jwt: JWT;

  constructor() {
    // Load service account credentials
    this.projectId = process.env.FIREBASE_PROJECT_ID || 'pharmalynkk';
    this.clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 'pharmalynkk@appspot.gserviceaccount.com';
    this.privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';

    if (!this.projectId || !this.clientEmail || !this.privateKey) {
      console.warn('⚠️ Firebase service account credentials not fully configured');
    }

    // Initialize JWT client
    this.jwt = new JWT({
      email: this.clientEmail,
      key: this.privateKey,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
  }

  /**
   * Get OAuth2 access token for FCM v1 API
   */
  private async getAccessToken(): Promise<string> {
    try {
      const tokens = await this.jwt.authorize();
      return tokens.access_token || '';
    } catch (error) {
      console.error('❌ Error getting access token:', error);
      throw new Error('Failed to get access token for FCM v1 API');
    }
  }

  /**
   * Send notification using FCM HTTP v1 API
   */
  async sendNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    options?: {
      priority?: 'normal' | 'high';
      ttl?: number;
      icon?: string;
      badge?: string;
      tag?: string;
      clickAction?: string;
      requireInteraction?: boolean;
    }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const accessToken = await this.getAccessToken();
      
      const message: FCMv1Message = {
        message: {
          token,
          notification: {
            title,
            body
          },
          data: data || {},
          webpush: {
            headers: {
              'Urgency': options?.priority === 'high' ? 'high' : 'normal'
            },
            notification: {
              title,
              body,
              icon: options?.icon || '/icon-192x192.png',
              badge: options?.badge || '/icon-96x96.png',
              tag: options?.tag,
              requireInteraction: options?.requireInteraction || false,
              actions: data?.actions ? JSON.parse(data.actions) : undefined
            },
            data: data || {},
            fcmOptions: {
              link: options?.clickAction || '/'
            }
          },
          android: {
            priority: options?.priority || 'normal',
            ttl: options?.ttl ? `${options.ttl}s` : '2419200s', // 28 days default
            notification: {
              icon: options?.icon || '/icon-192x192.png',
              color: '#4CAF50',
              sound: 'default',
              clickAction: options?.clickAction
            }
          }
        }
      };

      const url = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });

      if (response.ok) {
        const result: FCMv1Response = await response.json();
        console.log('✅ FCM v1 notification sent successfully:', result.name);
        return { 
          success: true, 
          messageId: result.name 
        };
      } else {
        const errorData = await response.json();
        console.error('❌ FCM v1 API Error:', errorData);
        return { 
          success: false, 
          error: errorData.error?.message || 'Unknown FCM v1 error' 
        };
      }
    } catch (error) {
      console.error('❌ Error sending FCM v1 notification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send notification to multiple tokens
   */
  async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
    options?: {
      priority?: 'normal' | 'high';
      ttl?: number;
      icon?: string;
      badge?: string;
      tag?: string;
      clickAction?: string;
      requireInteraction?: boolean;
    }
  ): Promise<{ success: boolean; successCount: number; failureCount: number; results: Array<{ success: boolean; messageId?: string; error?: string }> }> {
    const results: Array<{ success: boolean; messageId?: string; error?: string }> = [];
    let successCount = 0;
    let failureCount = 0;

    for (const token of tokens) {
      const result = await this.sendNotification(token, title, body, data, options);
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    return {
      success: successCount > 0,
      successCount,
      failureCount,
      results
    };
  }

  /**
   * Check if FCM v1 service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.projectId && this.clientEmail && this.privateKey);
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): { configured: boolean; missing: string[] } {
    const missing: string[] = [];
    if (!this.projectId) missing.push('FIREBASE_PROJECT_ID');
    if (!this.clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
    if (!this.privateKey) missing.push('FIREBASE_PRIVATE_KEY');
    
    return {
      configured: missing.length === 0,
      missing
    };
  }
}

// Export singleton instance
export const fcmV1Service = new FCMv1Service();

// Helper functions for specific notification types
export async function sendOTPViaFCMv1(
  token: string,
  otp: string,
  retailerName: string,
  paymentId?: string,
  amount?: number
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const data: Record<string, string> = {
    type: 'otp',
    otp: otp,
    retailerName,
    timestamp: Date.now().toString()
  };

  if (paymentId) data.paymentId = paymentId;
  if (amount) data.amount = amount.toString();

  return await fcmV1Service.sendNotification(
    token,
    '🔐 OTP Verification Required',
    `Your OTP code is: ${otp}`,
    data,
    {
      priority: 'high',
      tag: `otp-${paymentId || Date.now()}`,
      clickAction: '/retailer/dashboard',
      requireInteraction: true
    }
  );
}

export async function sendPaymentNotificationViaFCMv1(
  token: string,
  paymentId: string,
  status: 'completed' | 'failed' | 'pending',
  amount: number,
  customerName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
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

  const data: Record<string, string> = {
    type: 'payment',
    paymentId,
    status,
    amount: amount.toString(),
    timestamp: Date.now().toString()
  };

  if (customerName) data.customerName = customerName;

  return await fcmV1Service.sendNotification(
    token,
    config.title,
    config.body,
    data,
    {
      priority: status === 'completed' ? 'normal' : 'high',
      tag: `payment-${paymentId}`,
      clickAction: '/retailer/dashboard'
    }
  );
}