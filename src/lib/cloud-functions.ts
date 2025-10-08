/**
 * Cloud Functions Client Service
 * Handles communication with deployed Firebase Cloud Functions
 */

// Cloud Function URLs (deployed)
const CLOUD_FUNCTIONS_BASE_URL = 'https://us-central1-plkapp-8c052.cloudfunctions.net';

interface CloudFunctionResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
  messageId?: string;
  type?: string;
  fallbackToSMS?: boolean;
}

interface SendOTPNotificationData {
  retailerId: string;
  otp: string;
  amount: number;
  paymentId: string;
  lineWorkerName: string;
}

interface SendPaymentCompletionNotificationData {
  retailerId: string;
  amount: number;
  paymentId: string;
  recipientType?: 'retailer' | 'wholesaler';
  title?: string;
  body?: string;
  retailerName?: string;
  lineWorkerName?: string;
  wholesalerId?: string;
  clickAction?: string;
}

/**
 * Call Firebase Cloud Function (HTTP callable format)
 */
async function callCloudFunction<T = any>(
  functionName: string,
  data: any
): Promise<CloudFunctionResponse<T>> {
  try {
    const url = `${CLOUD_FUNCTIONS_BASE_URL}/${functionName}`;
    
    console.log(`🌐 Calling cloud function: ${functionName}`, {
      url,
      dataKeys: Object.keys(data),
      dataPreview: JSON.stringify(data).substring(0, 200) + '...'
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add Firebase Auth token if available
        ...(typeof window !== 'undefined' && localStorage.getItem('authToken') && {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        })
      },
      body: JSON.stringify({ data })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Cloud function ${functionName} error:`, {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`Cloud function error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`✅ Cloud function ${functionName} response:`, result);
    
    return result;
  } catch (error) {
    console.error(`❌ Error calling cloud function ${functionName}:`, error);
    throw error;
  }
}

/**
 * Send OTP notification via Cloud Function
 */
export async function sendOTPNotificationViaCloudFunction(
  data: SendOTPNotificationData
): Promise<CloudFunctionResponse> {
  try {
    console.log('🔐 Sending OTP notification via sendFCMNotification cloud function:', {
      retailerId: data.retailerId,
      paymentId: data.paymentId,
      amount: data.amount,
      lineWorkerName: data.lineWorkerName
    });

    const response = await callCloudFunction('sendFCMNotification', data);
    
    if (response.success || response.type === 'fcm_sent') {
      console.log('✅ OTP notification sent successfully via sendFCMNotification:', {
        messageId: response.messageId,
        type: response.type
      });
      return {
        success: true,
        messageId: response.messageId,
        type: response.type,
        data: response.data
      };
    } else {
      console.warn('⚠️ OTP notification failed via sendFCMNotification:', response.error);
      return {
        success: false,
        error: response.error || 'Unknown error',
        fallbackToSMS: response.fallbackToSMS
      };
    }
  } catch (error) {
    console.error('❌ Error sending OTP notification via sendFCMNotification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallbackToSMS: true // Fallback to SMS on cloud function failure
    };
  }
}

/**
 * Send payment completion notification via Cloud Function
 */
export async function sendPaymentCompletionNotificationViaCloudFunction(
  data: SendPaymentCompletionNotificationData
): Promise<CloudFunctionResponse> {
  try {
    console.log('💰 Sending payment completion notification via cloud function:', {
      retailerId: data.retailerId,
      paymentId: data.paymentId,
      amount: data.amount,
      recipientType: data.recipientType || 'retailer'
    });

    const response = await callCloudFunction('sendPaymentCompletionNotification', data);
    
    if (response.success) {
      console.log('✅ Payment completion notification sent successfully via cloud function:', {
        messageId: response.messageId,
        deviceCount: response.data?.deviceCount || 0
      });
      return {
        success: true,
        messageId: response.messageId,
        data: response.data
      };
    } else {
      console.warn('⚠️ Payment completion notification failed via cloud function:', response.error);
      return {
        success: false,
        error: response.error || 'Unknown error'
      };
    }
  } catch (error) {
    console.error('❌ Error sending payment completion notification via cloud function:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send test FCM notification via Cloud Function
 */
export async function sendTestFCMNotificationViaCloudFunction(): Promise<CloudFunctionResponse> {
  try {
    console.log('🧪 Sending test FCM notification via cloud function');

    const response = await callCloudFunction('sendTestFCMNotification', {});
    
    if (response.success || response.type === 'fcm_sent') {
      console.log('✅ Test FCM notification sent successfully via cloud function:', {
        messageId: response.messageId
      });
      return {
        success: true,
        messageId: response.messageId,
        type: response.type
      };
    } else {
      console.warn('⚠️ Test FCM notification failed via cloud function:', response.error);
      return {
        success: false,
        error: response.error || 'Unknown error'
      };
    }
  } catch (error) {
    console.error('❌ Error sending test FCM notification via cloud function:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if Cloud Functions are available
 */
export function areCloudFunctionsAvailable(): boolean {
  return typeof CLOUD_FUNCTIONS_BASE_URL === 'string' && CLOUD_FUNCTIONS_BASE_URL.length > 0;
}

/**
 * Get Cloud Function base URL
 */
export function getCloudFunctionsBaseUrl(): string {
  return CLOUD_FUNCTIONS_BASE_URL;
}