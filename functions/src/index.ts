import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// OTP Generation Cloud Function
export const generateOTP = functions.https.onCall(async (data: {
  retailerId: string;
  paymentId: string;
  amount: number;
  lineWorkerName?: string;
  retailerName?: string;
  retailerArea?: string;
  wholesalerName?: string;
  collectionDate?: string;
}, context: functions.https.CallableContext) => {
  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    // Validate input data
    const { retailerId, paymentId, amount, lineWorkerName, retailerName, retailerArea, wholesalerName, collectionDate } = data;
    
    if (!retailerId || !paymentId || !amount) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: retailerId, paymentId, amount'
      );
    }

    console.log('🔐 CLOUD FUNCTION - OTP Generation Request:', {
      retailerId,
      paymentId,
      amount,
      lineWorkerName,
      uid: context.auth.uid
    });

    // Check if user has permission to generate OTP
    const callerDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    if (!callerDoc.exists) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'User not found'
      );
    }

    const callerData = callerDoc.data();
    if (!callerData) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'User data not found'
      );
    }
    const userRoles = callerData.roles || [];
    
    // Only allow LINE_WORKER and WHOLESALER_ADMIN roles to generate OTPs
    if (!userRoles.includes('LINE_WORKER') && !userRoles.includes('WHOLESALER_ADMIN')) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Insufficient permissions to generate OTP'
      );
    }

    // Get retailer user details
    const retailerUsersQuery = await admin.firestore()
      .collection('retailerUsers')
      .where('retailerId', '==', retailerId)
      .limit(1)
      .get();

    if (retailerUsersQuery.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        'Retailer user not found'
      );
    }

    const retailerUser = retailerUsersQuery.docs[0].data();
    
    if (!retailerUser.phone) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Retailer phone number not found'
      );
    }

    // Check if there's already an active OTP for this payment
    const existingOTPQuery = await admin.firestore()
      .collection('otps')
      .where('paymentId', '==', paymentId)
      .where('isUsed', '==', false)
      .where('expiresAt', '>', new Date())
      .limit(1)
      .get();

    if (!existingOTPQuery.empty) {
      const existingOTP = existingOTPQuery.docs[0].data();
      const expiresAt = existingOTP.expiresAt.toDate();
      const timeRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / 1000);
      
      throw new functions.https.HttpsError(
        'already-exists',
        `Active OTP already exists. Please wait ${timeRemaining} seconds for the current OTP to expire.`
      );
    }

    // Generate secure OTP
    const otp = generateSecureOTP();
    console.log('🔐 CLOUD FUNCTION - Generated OTP:', otp);

    // Calculate expiration time (7 minutes)
    const expiresAt = new Date(Date.now() + 7 * 60 * 1000);

    // Create OTP document
    const otpData = {
      paymentId,
      code: otp,
      amount,
      lineWorkerName: lineWorkerName || 'Line Worker',
      retailerId,
      retailerUserId: retailerUsersQuery.docs[0].id,
      retailerPhone: retailerUser.phone,
      generatedBy: context.auth.uid,
      generatedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
      isUsed: false,
      attempts: 0,
      security: {
        lastAttemptAt: null,
        consecutiveFailures: 0,
        breachDetected: false,
        cooldownUntil: null
      }
    };

    // Save OTP to Firestore
    const otpRef = await admin.firestore().collection('otps').add(otpData);
    console.log('✅ CLOUD FUNCTION - OTP saved to Firestore with ID:', otpRef.id);

    // Add OTP to retailer's activeOTPs array
    const retailerRef = admin.firestore().collection('retailers').doc(retailerId);
    const retailerDoc = await retailerRef.get();
    
    if (retailerDoc.exists) {
      const retailerData = retailerDoc.data();
      if (!retailerData) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Retailer data not found'
        );
      }
      const activeOTPs = retailerData.activeOTPs || [];
      
      const retailerOTPData = {
        paymentId,
        code: otp,
        amount,
        lineWorkerName: lineWorkerName || 'Line Worker',
        otpId: otpRef.id,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isUsed: false
      };

      await retailerRef.update({
        activeOTPs: admin.firestore.FieldValue.arrayUnion(retailerOTPData)
      });
      
      console.log('✅ CLOUD FUNCTION - OTP added to retailer document');
    }

    // Update payment state to OTP_SENT
    const paymentRef = admin.firestore().collection('payments').doc(paymentId);
    await paymentRef.update({
      state: 'OTP_SENT',
      'timeline.otpSentAt': admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ CLOUD FUNCTION - Payment state updated to OTP_SENT');

    // Return success response
    return {
      success: true,
      otpId: otpRef.id,
      code: otp, // In production, you might want to remove this from response
      expiresAt: expiresAt.toISOString(),
      retailerName: retailerUser.name,
      retailerPhone: retailerUser.phone
    };

  } catch (error) {
    console.error('❌ CLOUD FUNCTION - Error generating OTP:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to generate OTP',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

// Helper function to generate secure OTP
function generateSecureOTP(): string {
  // Generate 4 random digits
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Randomly insert R and X at different positions
  const positions = [0, 1, 2, 3, 4, 5];
  const rPosition = positions.splice(Math.floor(Math.random() * positions.length), 1)[0];
  const xPosition = positions.splice(Math.floor(Math.random() * positions.length), 1)[0];
  
  // Build the OTP with R and X inserted
  let otp = digits.split('');
  otp.splice(rPosition, 0, 'R');
  otp.splice(xPosition + (xPosition > rPosition ? 1 : 0), 0, 'X');
  
  return otp.join('');
}

// OTP Verification Cloud Function
export const verifyOTP = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    // Validate input data
    const { paymentId, otp } = data;
    
    if (!paymentId || !otp) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: paymentId, otp'
      );
    }

    console.log('🔐 CLOUD FUNCTION - OTP Verification Request:', {
      paymentId,
      otp: otp.substring(0, 2) + '****', // Log partial OTP for security
      uid: context.auth.uid
    });

    // Get OTP document
    const otpQuery = await admin.firestore()
      .collection('otps')
      .where('paymentId', '==', paymentId)
      .where('isUsed', '==', false)
      .where('expiresAt', '>', new Date())
      .limit(1)
      .get();

    if (otpQuery.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        'OTP not found or expired'
      );
    }

    const otpDoc = otpQuery.docs[0];
    const otpData = otpDoc.data();

    // Check security limits
    const security = otpData.security || {};
    const now = new Date();
    
    // Check cooldown
    if (security.cooldownUntil && security.cooldownUntil.toDate() > now) {
      const remainingTime = Math.ceil((security.cooldownUntil.toDate().getTime() - now.getTime()) / 1000);
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Too many attempts. Please wait ${remainingTime} seconds before trying again.`
      );
    }

    // Check attempts
    if (otpData.attempts >= 3) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many failed attempts. Please request a new OTP.'
      );
    }

    // Verify OTP
    if (otpData.code !== otp) {
      // Update attempt tracking
      const attempts = otpData.attempts + 1;
      const consecutiveFailures = (security.consecutiveFailures || 0) + 1;
      
      const securityUpdate: any = {
        lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
        consecutiveFailures
      };

      // Check for cooldown trigger
      if (attempts >= 3) {
        securityUpdate.cooldownUntil = admin.firestore.Timestamp.fromDate(
          new Date(now.getTime() + 2 * 60 * 1000) // 2 minutes cooldown
        );
      }

      // Check for breach detection (6 consecutive failures)
      if (consecutiveFailures >= 6) {
        securityUpdate.breachDetected = true;
        
        // Send security alert to wholesaler
        await sendSecurityAlert(otpData.retailerId, consecutiveFailures);
      }

      await otpDoc.ref.update({
        attempts: attempts,
        security: securityUpdate
      });

      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid OTP'
      );
    }

    // OTP is correct - mark as used and update payment
    await otpDoc.ref.update({
      isUsed: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedBy: context.auth.uid
    });

    // Update payment state to COMPLETED
    const paymentRef = admin.firestore().collection('payments').doc(paymentId);
    await paymentRef.update({
      state: 'COMPLETED',
      'timeline.completedAt': admin.firestore.FieldValue.serverTimestamp(),
      'timeline.verifiedAt': admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Remove OTP from retailer's activeOTPs array
    const retailerRef = admin.firestore().collection('retailers').doc(otpData.retailerId);
    const retailerDoc = await retailerRef.get();
    
    if (retailerDoc.exists) {
      const retailerData = retailerDoc.data();
      if (!retailerData) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Retailer data not found'
        );
      }
      const activeOTPs = retailerData.activeOTPs || [];
      
      // Remove the OTP from activeOTPs array
      const updatedOTPs = activeOTPs.filter((activeOTP: any) => 
        activeOTP.paymentId !== paymentId
      );

      await retailerRef.update({
        activeOTPs: updatedOTPs
      });
      
      console.log('✅ CLOUD FUNCTION - OTP removed from retailer document');
    }

    // COMPLETELY DELETE the OTP document after successful verification
    await otpDoc.ref.delete();
    console.log('🗑️ CLOUD FUNCTION - OTP document completely deleted from Firestore');

    console.log('✅ CLOUD FUNCTION - OTP verified successfully');

    return {
      success: true,
      verified: true,
      message: 'OTP verified successfully'
    };

  } catch (error) {
    console.error('❌ CLOUD FUNCTION - Error verifying OTP:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to verify OTP',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

// Helper function to send security alert
async function sendSecurityAlert(retailerId: string, consecutiveFailures: number) {
  try {
    // Get retailer details to find wholesaler
    const retailerDoc = await admin.firestore().collection('retailers').doc(retailerId).get();
    if (!retailerDoc.exists) return;

    const retailerData = retailerDoc.data();
    if (!retailerData) {
      return;
    }
    
    // Find line worker assigned to this retailer
    const lineWorkerQuery = await admin.firestore()
      .collection('users')
      .where('assignedAreas', 'array-contains', retailerData.areaId)
      .where('roles', 'array-contains', 'LINE_WORKER')
      .limit(1)
      .get();

    if (!lineWorkerQuery.empty) {
      const lineWorkerDoc = lineWorkerQuery.docs[0];
      const lineWorkerData = lineWorkerDoc.data();
      
      // Get wholesaler info
      if (lineWorkerData.wholesalerId) {
        const wholesalerDoc = await admin.firestore()
          .collection('users')
          .doc(lineWorkerData.wholesalerId)
          .get();

        if (wholesalerDoc.exists) {
          const wholesalerData = wholesalerDoc.data();
          
          if (wholesalerData && wholesalerData.phone) {
            console.log('🚨 CLOUD FUNCTION - Security alert sent to wholesaler:', {
              wholesalerId: wholesalerDoc.id,
              lineWorkerName: lineWorkerData.displayName,
              consecutiveFailures
            });
            
            // In production, you would send actual SMS here
            // For now, we'll just log the alert
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ CLOUD FUNCTION - Error sending security alert:', error);
  }
}

// Cleanup expired OTPs (scheduled function)
export const cleanupExpiredOTPs = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async (context: functions.EventContext) => {
    try {
      const now = new Date();
      const cutoffTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      
      // Delete expired OTPs older than 1 hour
      const expiredOTPsQuery = await admin.firestore()
        .collection('otps')
        .where('expiresAt', '<', cutoffTime)
        .get();

      const batch = admin.firestore().batch();
      expiredOTPsQuery.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      
      console.log(`🗑️ CLOUD FUNCTION - Cleaned up ${expiredOTPsQuery.size} expired OTPs`);
      
      return null;
    } catch (error) {
      console.error('❌ CLOUD FUNCTION - Error cleaning up expired OTPs:', error);
      return null;
    }
  });

// SMS Notification Functions
export const sendRetailerPaymentSMS = functions.https.onCall(async (data: {
  retailerId: string;
  paymentId: string;
  amount: number;
  lineWorkerName: string;
  retailerName: string;
  retailerArea: string;
  wholesalerName: string;
  collectionDate: string;
}, context: functions.https.CallableContext) => {
  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    console.log('📞 CLOUD FUNCTION - Retailer Payment SMS Request:', {
      retailerId: data.retailerId,
      paymentId: data.paymentId,
      amount: data.amount,
      lineWorkerName: data.lineWorkerName,
      uid: context.auth.uid
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
        'Retailer user not found'
      );
    }

    const retailerUser = retailerUsersQuery.docs[0].data();
    
    if (!retailerUser.phone) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Retailer phone number not found'
      );
    }

    // Format phone number
    const formattedPhone = retailerUser.phone.replace(/\D/g, '');
    
    // Prepare SMS variables
    const variablesValues: string[] = [
      data.amount.toString(),
      retailerUser.name || data.retailerName,
      retailerUser.address || data.retailerArea,
      data.lineWorkerName,
      data.wholesalerName,
      data.collectionDate
    ];
    
    const formattedVariables = variablesValues.join('%7C'); // URL-encoded pipe character

    // Get Fast2SMS configuration
    const fast2smsApiKey = functions.config().fast2sms?.key;
    const senderId = 'SNSYST';
    const messageId = '199054'; // RetailerNotify template ID
    const entityId = '1707175912558362799'; // Entity ID from DLT
    
    if (!fast2smsApiKey) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Fast2SMS API key not configured'
      );
    }

    // Construct API URL
    const entityIdParam = `&entity_id=${entityId}`;
    const apiUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${fast2smsApiKey}&route=dlt&sender_id=${senderId}&message=${messageId}&variables_values=${formattedVariables}&flash=0&numbers=${formattedPhone}${entityIdParam}`;     
    
    console.log('📞 CLOUD FUNCTION - Sending SMS to:', formattedPhone);

    // Send SMS via Fast2SMS
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new functions.https.HttpsError(
        'internal',
        `Failed to send SMS: ${response.status} ${response.statusText}`
      );
    }

    const responseData: any = await response.json();
    
    // Log SMS delivery
    await admin.firestore().collection('smsLogs').add({
      type: 'RETAILER_PAYMENT_CONFIRMATION',
      retailerId: data.retailerId,
      paymentId: data.paymentId,
      phone: formattedPhone,
      amount: data.amount,
      messageId: responseData.request_id || null,
      status: responseData.return ? 'SENT' : 'FAILED',
      response: responseData,
      sentBy: context.auth.uid,
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ CLOUD FUNCTION - SMS sent successfully:', responseData);

    return {
      success: true,
      messageId: responseData.request_id,
      phone: formattedPhone,
      status: responseData.return ? 'SENT' : 'FAILED'
    };

  } catch (error) {
    console.error('❌ CLOUD FUNCTION - Error sending retailer payment SMS:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to send retailer payment SMS',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

export const sendWholesalerPaymentSMS = functions.https.onCall(async (data: {
  retailerId: string;
  paymentId: string;
  amount: number;
  lineWorkerName: string;
  retailerName: string;
  retailerArea: string;
  wholesalerName: string;
  collectionDate: string;
}, context: functions.https.CallableContext) => {
  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    console.log('📞 CLOUD FUNCTION - Wholesaler Payment SMS Request:', {
      retailerId: data.retailerId,
      paymentId: data.paymentId,
      amount: data.amount,
      lineWorkerName: data.lineWorkerName,
      uid: context.auth.uid
    });

    // Get retailer details to find wholesaler
    const retailerDoc = await admin.firestore().collection('retailers').doc(data.retailerId).get();
    if (!retailerDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Retailer not found'
      );
    }

    const retailerData = retailerDoc.data();
    if (!retailerData) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Retailer data not found'
      );
    }
    
    // Find line worker assigned to this retailer
    const lineWorkerQuery = await admin.firestore()
      .collection('users')
      .where('assignedAreas', 'array-contains', retailerData.areaId)
      .where('roles', 'array-contains', 'LINE_WORKER')
      .limit(1)
      .get();

    if (lineWorkerQuery.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        'Line worker not found for this retailer'
      );
    }

    const lineWorkerDoc = lineWorkerQuery.docs[0];
    const lineWorkerData = lineWorkerDoc.data();
    
    // Get wholesaler info
    if (!lineWorkerData.wholesalerId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Line worker not assigned to any wholesaler'
      );
    }

    const wholesalerDoc = await admin.firestore()
      .collection('users')
      .doc(lineWorkerData.wholesalerId)
      .get();

    if (!wholesalerDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Wholesaler not found'
      );
    }

    const wholesalerData = wholesalerDoc.data();
    
    if (!wholesalerData || !wholesalerData.phone) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Wholesaler phone number not found'
      );
    }

    // Format phone number
    const formattedPhone = wholesalerData.phone.replace(/\D/g, '');
    
    // Prepare SMS variables
    const variablesValues: string[] = [
      data.amount.toString(),
      data.retailerName,
      data.retailerArea,
      data.lineWorkerName,
      data.wholesalerName,
      data.collectionDate
    ];
    
    const formattedVariables = variablesValues.join('%7C'); // URL-encoded pipe character

    // Get Fast2SMS configuration
    const fast2smsApiKey = functions.config().fast2sms?.key;
    const senderId = 'SNSYST';
    const messageId = '199055'; // WholeSalerNotify template ID
    const entityId = '1707175912581282302'; // Entity ID from DLT
    
    if (!fast2smsApiKey) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Fast2SMS API key not configured'
      );
    }

    // Construct API URL
    const entityIdParam = `&entity_id=${entityId}`;
    const apiUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${fast2smsApiKey}&route=dlt&sender_id=${senderId}&message=${messageId}&variables_values=${formattedVariables}&flash=0&numbers=${formattedPhone}${entityIdParam}`;     
    
    console.log('📞 CLOUD FUNCTION - Sending SMS to wholesaler:', formattedPhone);

    // Send SMS via Fast2SMS
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new functions.https.HttpsError(
        'internal',
        `Failed to send SMS: ${response.status} ${response.statusText}`
      );
    }

    const responseData: any = await response.json();
    
    // Log SMS delivery
    await admin.firestore().collection('smsLogs').add({
      type: 'WHOLESALER_PAYMENT_NOTIFICATION',
      retailerId: data.retailerId,
      paymentId: data.paymentId,
      phone: formattedPhone,
      amount: data.amount,
      messageId: responseData.request_id || null,
      status: responseData.return ? 'SENT' : 'FAILED',
      response: responseData,
      sentBy: context.auth.uid,
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ CLOUD FUNCTION - SMS sent successfully to wholesaler:', responseData);

    return {
      success: true,
      messageId: responseData.request_id,
      phone: formattedPhone,
      status: responseData.return ? 'SENT' : 'FAILED'
    };

  } catch (error) {
    console.error('❌ CLOUD FUNCTION - Error sending wholesaler payment SMS:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to send wholesaler payment SMS',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});