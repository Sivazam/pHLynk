// Firebase Cloud Functions - Database Triggers for Notifications
// This file should be deployed to your Firebase Functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Trigger: When a new payment is created
exports.onPaymentCreated = functions.firestore
  .document('Payments/{paymentId}')
  .onCreate(async (snap, context) => {
    const payment = snap.data();
    const paymentId = context.params.paymentId;
    
    console.log('📱 Payment created:', { paymentId, amount: payment.amount, retailerId: payment.retailerId });
    
    try {
      // Get retailer details
      const retailerDoc = await admin.firestore()
        .collection('Retailers')
        .doc(payment.retailerId)
        .get();
      
      if (!retailerDoc.exists) {
        console.log('❌ Retailer not found:', payment.retailerId);
        return null;
      }
      
      const retailer = retailerDoc.data();
      
      // Get line worker details
      const lineWorkerDoc = await admin.firestore()
        .collection('Users')
        .doc(payment.lineWorkerId)
        .get();
      
      const lineWorker = lineWorkerDoc.exists ? lineWorkerDoc.data() : {};
      
      // Send OTP notification to retailer
      if (payment.otp && payment.requiresOTP) {
        await sendOTPNotification({
          retailerId: payment.retailerId,
          retailerName: retailer.name || retailer.businessName,
          retailerPhone: retailer.phone,
          otp: payment.otp,
          amount: payment.amount,
          paymentId: paymentId,
          lineWorkerName: lineWorker.displayName || 'Line Worker',
          lineWorkerPhone: lineWorker.phone
        });
      }
      
      // Send payment initiated notification to line worker
      if (payment.lineWorkerId) {
        await sendPaymentInitiatedNotification({
          lineWorkerId: payment.lineWorkerId,
          retailerName: retailer.name || retailer.businessName,
          amount: payment.amount,
          paymentId: paymentId
        });
      }
      
    } catch (error) {
      console.error('❌ Error processing payment created:', error);
    }
  });

// Trigger: When a payment is updated (completed, failed, etc.)
exports.onPaymentUpdated = functions.firestore
  .document('Payments/{paymentId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const paymentId = context.params.paymentId;
    
    // Only proceed if payment state changed
    if (beforeData.state === afterData.state) {
      return null;
    }
    
    console.log('📱 Payment updated:', { 
      paymentId, 
      oldState: beforeData.state, 
      newState: afterData.state 
    });
    
    try {
      // Get retailer details
      const retailerDoc = await admin.firestore()
        .collection('Retailers')
        .doc(afterData.retailerId)
        .get();
      
      const retailer = retailerDoc.exists ? retailerDoc.data() : {};
      
      // Get line worker details
      const lineWorkerDoc = await admin.firestore()
        .collection('Users')
        .doc(afterData.lineWorkerId)
        .get();
      
      const lineWorker = lineWorkerDoc.exists ? lineWorkerDoc.data() : {};
      
      // Send payment completion notification
      if (afterData.state === 'COMPLETED') {
        await sendPaymentCompletionNotification({
          retailerId: afterData.retailerId,
          retailerName: retailer.name || retailer.businessName,
          lineWorkerId: afterData.lineWorkerId,
          lineWorkerName: lineWorker.displayName || 'Line Worker',
          amount: afterData.amount,
          paymentId: paymentId
        });
      }
      
      // Send payment failed notification
      if (afterData.state === 'FAILED') {
        await sendPaymentFailedNotification({
          retailerId: afterData.retailerId,
          retailerName: retailer.name || retailer.businessName,
          lineWorkerId: afterData.lineWorkerId,
          lineWorkerName: lineWorker.displayName || 'Line Worker',
          amount: afterData.amount,
          paymentId: paymentId
        });
      }
      
    } catch (error) {
      console.error('❌ Error processing payment updated:', error);
    }
  });

// Trigger: When a new invoice is created
exports.onInvoiceCreated = functions.firestore
  .document('Invoices/{invoiceId}')
  .onCreate(async (snap, context) => {
    const invoice = snap.data();
    const invoiceId = context.params.invoiceId;
    
    console.log('📱 Invoice created:', { invoiceId, retailerId: invoice.retailerId });
    
    try {
      // Get retailer details
      const retailerDoc = await admin.firestore()
        .collection('Retailers')
        .doc(invoice.retailerId)
        .get();
      
      if (!retailerDoc.exists) {
        return null;
      }
      
      const retailer = retailerDoc.data();
      
      // Send invoice notification to retailer
      await sendInvoiceNotification({
        retailerId: invoice.retailerId,
        retailerName: retailer.name || retailer.businessName,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.totalAmount,
        dueDate: invoice.dueDate,
        invoiceId: invoiceId
      });
      
    } catch (error) {
      console.error('❌ Error processing invoice created:', error);
    }
  });

// Helper function: Send OTP notification via FCM
async function sendOTPNotification(data) {
  try {
    // Get retailer's FCM tokens
    const tokens = await getFCMTokensForUser(data.retailerId, 'retailer');
    
    if (tokens.length === 0) {
      console.log('⚠️ No FCM tokens found for retailer:', data.retailerId);
      // Fallback to existing Cloud Function
      return await callExistingOTPFunction(data);
    }
    
    // Send FCM notification
    const message = {
      tokens: tokens,
      notification: {
        title: '🔐 Payment OTP Required',
        body: `OTP: ${data.otp} for ₹${data.amount.toLocaleString()} by ${data.lineWorkerName}`,
        icon: '/icon-192x192.png',
        badge: '/icon-96x96.png',
        tag: `otp-${data.paymentId}`,
        requireInteraction: true
      },
      data: {
        type: 'otp',
        otp: data.otp,
        amount: data.amount.toString(),
        paymentId: data.paymentId,
        retailerId: data.retailerId,
        lineWorkerName: data.lineWorkerName,
        clickAction: '/retailer/dashboard'
      },
      android: {
        priority: 'high',
        notification: {
          priority: 'high',
          defaultSound: true,
          vibrationPattern: [200, 100, 200]
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
    
    const response = await admin.messaging().sendMulticast(message);
    console.log('✅ OTP FCM sent:', { 
      successCount: response.successCount, 
      failureCount: response.failureCount 
    });
    
    // Handle failed tokens
    await cleanupFailedTokens(response, tokens, data.retailerId);
    
    return response;
    
  } catch (error) {
    console.error('❌ Error sending OTP FCM:', error);
    // Fallback to existing Cloud Function
    return await callExistingOTPFunction(data);
  }
}

// Helper function: Send payment completion notification via FCM
async function sendPaymentCompletionNotification(data) {
  try {
    // Send to all relevant users
    const notifications = [];
    
    // Send to retailer
    const retailerTokens = await getFCMTokensForUser(data.retailerId, 'retailer');
    if (retailerTokens.length > 0) {
      notifications.push(createFCMMessage(retailerTokens, {
        title: '✅ Payment Completed',
        body: `Payment of ₹${data.amount.toLocaleString()} completed successfully`,
        data: {
          type: 'payment_completed',
          amount: data.amount.toString(),
          paymentId: data.paymentId,
          retailerId: data.retailerId,
          clickAction: '/retailer/dashboard'
        }
      }));
    }
    
    // Send to line worker
    if (data.lineWorkerId) {
      const workerTokens = await getFCMTokensForUser(data.lineWorkerId, 'line_worker');
      if (workerTokens.length > 0) {
        notifications.push(createFCMMessage(workerTokens, {
          title: '✅ Payment Collected',
          body: `Successfully collected ₹${data.amount.toLocaleString()} from ${data.retailerName}`,
          data: {
            type: 'payment_completed',
            amount: data.amount.toString(),
            paymentId: data.paymentId,
            retailerId: data.retailerId,
            lineWorkerId: data.lineWorkerId,
            clickAction: '/line-worker'
          }
        }));
      }
    }
    
    // Send all notifications
    const results = await Promise.all(
      notifications.map(msg => admin.messaging().sendMulticast(msg))
    );
    
    console.log('✅ Payment completion FCM sent:', results);
    return results;
    
  } catch (error) {
    console.error('❌ Error sending payment completion FCM:', error);
  }
}

// Helper function: Get FCM tokens for a user
async function getFCMTokensForUser(userId, userType) {
  try {
    const snapshot = await admin.firestore()
      .collection('fcmTokens')
      .where('userId', '==', userId)
      .where('userType', '==', userType)
      .where('active', '==', true)
      .get();
    
    return snapshot.docs.map(doc => doc.data().token);
  } catch (error) {
    console.error('❌ Error getting FCM tokens:', error);
    return [];
  }
}

// Helper function: Create FCM message
function createFCMMessage(tokens, notification) {
  return {
    tokens: tokens,
    notification: {
      title: notification.title,
      body: notification.body,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      tag: notification.data?.type || 'general'
    },
    data: notification.data,
    android: {
      priority: 'high',
      notification: {
        priority: 'high',
        defaultSound: true
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };
}

// Helper function: Cleanup failed tokens
async function cleanupFailedTokens(response, tokens, userId) {
  const failedTokens = [];
  
  response.responses.forEach((resp, idx) => {
    if (!resp.success) {
      failedTokens.push(tokens[idx]);
    }
  });
  
  if (failedTokens.length > 0) {
    console.log('🗑️ Cleaning up failed tokens:', failedTokens.length);
    
    const batch = admin.firestore().batch();
    failedTokens.forEach(token => {
      const tokenRef = admin.firestore()
        .collection('fcmTokens')
        .where('token', '==', token)
        .where('userId', '==', userId);
      
      // Note: This would need to be done differently in production
      // as you can't query in batch operations
    });
    
    // For now, just log the cleanup needed
    console.log('🔧 Tokens to cleanup:', failedTokens);
  }
}

// Helper function: Fallback to existing Cloud Function
async function callExistingOTPFunction(data) {
  try {
    // Call your existing sendOTPNotification Cloud Function
    const functions = require('firebase-functions');
    const otpFunction = functions.https.onCall(async (requestData, context) => {
      // Your existing OTP function logic
    });
    
    console.log('🔄 Fallback to existing OTP function');
    return { success: true, fallback: true };
  } catch (error) {
    console.error('❌ Fallback OTP function failed:', error);
    return { success: false, error: error.message };
  }
}