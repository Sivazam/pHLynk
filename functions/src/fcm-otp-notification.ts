import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Enhanced FCM token lookup for retailer users
async function getFCMTokenForRetailerUser(userId: string): Promise<string | null> {
  try {
    console.log('🔧 Looking for FCM token for retailer user:', userId);
    
    const retailerUserDoc = await admin.firestore().collection('retailerUsers').doc(userId).get();
    
    if (retailerUserDoc.exists) {
      const userData = retailerUserDoc.data();
      console.log('📱 Found retailer user, checking FCM devices...');
      
      // Check for fcmDevices array
      const fcmDevices = userData?.fcmDevices || [];
      if (fcmDevices.length > 0) {
        // Return the most recently active device token
        const activeDevice = fcmDevices.reduce((latest: any, device: any) => {
          const deviceTime = device.lastActive?.toDate?.() || new Date(0);
          const latestTime = latest?.lastActive?.toDate?.() || new Date(0);
          return deviceTime > latestTime ? device : latest;
        }, fcmDevices[0]);
        
        console.log(`✅ Found ${fcmDevices.length} FCM devices, using most recent:`, activeDevice.token?.substring(0, 20) + '...');
        return activeDevice.token || null;
      }
      
      // Fallback to single fcmToken field
      if (userData?.fcmToken) {
        console.log('✅ Found single FCM token (old structure)');
        return userData.fcmToken;
      }
      
      console.log('❌ No FCM devices found for retailer user');
    } else {
      console.log('❌ Retailer user document not found');
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting FCM token for retailer user:', userId, error);
    return null;
  }
}

// New FCM OTP notification function
export const sendFCMOTPNotification = functions.https.onCall(async (request: any) => {
  try {
    console.log('🚀 NEW FCM OTP FUNCTION TRIGGERED');
    console.log('📥 Full request object:', JSON.stringify(request, null, 2));
    
    let data, context;
    
    if (request.data && typeof request.data === 'object') {
      // Callable function format
      console.log('📋 Using callable function format');
      data = request.data;
      context = request;
    } else if (request && typeof request === 'object' && !request.auth) {
      // Direct HTTP format
      console.log('🌐 Using direct HTTP format');
      data = request;
      context = { auth: null, rawRequest: { ip: 'unknown' } };
    } else {
      console.error('❌ Unknown request format:', typeof request);
      throw new functions.https.HttpsError('invalid-argument', 'Invalid request format');
    }
    
    console.log('📤 Extracted data:', JSON.stringify(data, null, 2));
    
    // Input validation
    if (!data.retailerId || typeof data.retailerId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing retailerId');
    }
    if (!data.otp || typeof data.otp !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing OTP');
    }
    if (!data.amount || typeof data.amount !== 'number') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing amount');
    }
    if (!data.paymentId || typeof data.paymentId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing paymentId');
    }
    if (!data.lineWorkerName || typeof data.lineWorkerName !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing lineWorkerName');
    }
    
    console.log('📱 FCM OTP Notification Request:', {
      retailerId: data.retailerId,
      paymentId: data.paymentId,
      amount: data.amount,
      otp: data.otp,
      lineWorkerName: data.lineWorkerName,
      caller: context.auth ? context.auth.uid : 'NEXTJS_API'
    });

    // Get retailer user details
    const retailerUsersQuery = await admin.firestore()
      .collection('retailerUsers')
      .where('retailerId', '==', data.retailerId)
      .limit(1)
      .get();

    if (retailerUsersQuery.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        `Retailer user not found for retailerId: ${data.retailerId}`
      );
    }

    const retailerUser = retailerUsersQuery.docs[0];
    const retailerUserId = retailerUser.id;
    
    // Get FCM token for retailer user using our enhanced function
    const fcmToken = await getFCMTokenForRetailerUser(retailerUserId);
    
    if (!fcmToken) {
      console.warn('⚠️ FCM token not found for retailer user:', retailerUserId);
      return {
        success: false,
        error: 'FCM token not found',
        fallbackToSMS: true
      };
    }

    console.log('✅ FCM token found:', fcmToken.substring(0, 20) + '...');

    // Create FCM message
    const message = {
      notification: {
        title: '🔐 Payment OTP Required',
        body: `OTP: ${data.otp} for ₹${data.amount.toLocaleString()} by ${data.lineWorkerName}`,
      },
      data: {
        type: 'otp',
        otp: data.otp,
        amount: data.amount.toString(),
        paymentId: data.paymentId,
        retailerId: data.retailerId,
        lineWorkerName: data.lineWorkerName,
        tag: `otp-${data.paymentId}`,
        requireInteraction: 'true'
      },
      token: fcmToken,
      android: {
        priority: 'high' as const,
        notification: {
          priority: 'high' as const,
          defaultSound: true,
          defaultVibrateTimings: true
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true
          }
        }
      }
    };

    // Send FCM message
    const response = await admin.messaging().send(message);
    console.log('✅ FCM OTP notification sent successfully:', response);

    // Log FCM delivery
    await admin.firestore().collection('fcmLogs').add({
      type: 'OTP_NOTIFICATION',
      retailerId: data.retailerId,
      paymentId: data.paymentId,
      userId: retailerUserId,
      token: fcmToken.substring(0, 8) + '...',
      status: 'SENT',
      messageId: response,
      sentBy: context.auth?.uid || 'NEXTJS_API',
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      messageId: response,
      type: 'fcm_sent'
    };

  } catch (error) {
    console.error('❌ NEW FCM OTP FUNCTION - Error sending OTP notification:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to send OTP notification',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

console.log('✅ New FCM OTP notification function loaded');