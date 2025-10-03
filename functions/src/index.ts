import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Input validation helper
function validateSMSInput(data: any) {
  console.log('🔧 CLOUD FUNCTION - Validating input data:', JSON.stringify(data, null, 2));
  
  if (!data) {
    throw new functions.https.HttpsError('invalid-argument', 'Request data is missing');
  }
  
  if (!data.retailerId || typeof data.retailerId !== 'string') {
    console.error('❌ CLOUD FUNCTION - Invalid retailerId:', data.retailerId);
    throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing retailerId');
  }
  if (!data.paymentId || typeof data.paymentId !== 'string') {
    console.error('❌ CLOUD FUNCTION - Invalid paymentId:', data.paymentId);
    throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing paymentId');
  }
  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    console.error('❌ CLOUD FUNCTION - Invalid amount:', data.amount);
    throw new functions.https.HttpsError('invalid-argument', 'Invalid amount');
  }
  if (!data.lineWorkerName || typeof data.lineWorkerName !== 'string') {
    console.error('❌ CLOUD FUNCTION - Invalid lineWorkerName:', data.lineWorkerName);
    throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing lineWorkerName');
  }
  if (!data.retailerName || typeof data.retailerName !== 'string') {
    console.error('❌ CLOUD FUNCTION - Invalid retailerName:', data.retailerName);
    throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing retailerName');
  }
  if (!data.collectionDate || typeof data.collectionDate !== 'string') {
    console.error('❌ CLOUD FUNCTION - Invalid collectionDate:', data.collectionDate);
    throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing collectionDate');
  }
  
  // lineWorkerId is optional (for backwards compatibility)
  if (data.lineWorkerId && typeof data.lineWorkerId !== 'string') {
    console.error('❌ CLOUD FUNCTION - Invalid lineWorkerId:', data.lineWorkerId);
    throw new functions.https.HttpsError('invalid-argument', 'Invalid lineWorkerId');
  }
  
  console.log('✅ CLOUD FUNCTION - Input validation passed');
}

// Rate limiting helper
async function checkRateLimit(identifier: string, maxRequests = 10, windowMs = 60000) {
  const now = admin.firestore.Timestamp.now();
  const windowStart = new Date(now.toMillis() - windowMs);
  
  const requestsRef = admin.firestore()
    .collection('rateLimits')
    .doc(identifier)
    .collection('requests')
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(windowStart));
  
  const snapshot = await requestsRef.get();
  
  if (snapshot.size >= maxRequests) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Too many requests. Please try again later.'
    );
  }
  
  // Log this request
  await admin.firestore()
    .collection('rateLimits')
    .doc(identifier)
    .collection('requests')
    .add({
      timestamp: now,
      functionName: 'sendPaymentSMS'
    });
}

// Phone number validation helper
function validatePhoneNumber(phone: string): string {
  const cleanedPhone = phone.replace(/\D/g, '');
  if (cleanedPhone.length < 10) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid phone number'
    );
  }
  return cleanedPhone;
}

// Fast2SMS configuration validation
function getFast2SMSConfig() {
  const fast2smsConfig = functions.config().fast2sms;
  const fast2smsApiKey = fast2smsConfig?.api_key;
  const senderId = fast2smsConfig?.sender_id || 'SNSYST';
  const entityId = fast2smsConfig?.entity_id;
  
  if (!fast2smsApiKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Fast2SMS API key not configured in Firebase Functions config'
    );
  }
  
  if (!entityId) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Fast2SMS entity ID not configured in Firebase Functions config'
    );
  }
  
  return { fast2smsApiKey, senderId, entityId };
}

// SMS Notification Functions
export const sendRetailerPaymentSMS = functions.https.onCall(async (request: any) => {
  try {
    console.log('🚀 CLOUD FUNCTION TRIGGERED - sendRetailerPaymentSMS');
    console.log('📥 Full request object:', JSON.stringify(request, null, 2));
    
    // Handle both callable function format and direct HTTP format
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
    validateSMSInput(data);
    
    // Rate limiting (by IP or user ID)
    const identifier = context.auth?.uid || context.rawRequest?.ip || 'anonymous';
    await checkRateLimit(identifier, 5, 60000); // 5 requests per minute
    
    console.log('📞 CLOUD FUNCTION - Retailer Payment SMS Request:', {
      retailerId: data.retailerId,
      paymentId: data.paymentId,
      amount: data.amount,
      lineWorkerName: data.lineWorkerName,
      caller: context.auth ? context.auth.uid : 'NEXTJS_API',
      ip: context.rawRequest?.ip
    });

    // Get retailer details from Retailer collection
    const retailerDoc = await admin.firestore()
      .collection('Retailer')
      .doc(data.retailerId)
      .get();

    if (!retailerDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        `Retailer not found for retailerId: ${data.retailerId}`
      );
    }

    const retailerUser = retailerDoc.data();
    
    if (!retailerUser || !retailerUser.phone) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Retailer phone number not found for retailerId: ${data.retailerId}`
      );
    }

    // Validate and format phone number
    const formattedPhone = validatePhoneNumber(retailerUser.phone);
    
    // Prepare SMS variables - Order MUST match DLT template exactly
    // Template: "Collection Acknowledgement: An amount of {#var#}/- from {#var#}, {#var#} has been updated in PharmaLync as payment towards goods supplied by {#var#}. Collected by Line man {#var#} on {#var#}."
    // Variables: 1=Amount, 2=Retailer Name, 3=Retailer Area, 4=Wholesaler Name, 5=Line Worker Name, 6=Date
    
    // Ensure we have all required variables with proper fallbacks
    const amount = data.amount.toString();
    const retailerName = retailerUser.name || data.retailerName || 'Retailer';
    const retailerArea = data.retailerArea || retailerUser.address || 'Unknown Area';
    const wholesalerName = data.wholesalerName || 'Wholesaler';
    const lineWorkerName = data.lineWorkerName || 'Line Worker';
    const collectionDate = data.collectionDate || new Date().toLocaleDateString('en-IN');
    
    const variablesValues: string[] = [
      amount,                    // {#var#} - payment amount
      retailerName,              // {#var#} - retailer name
      retailerArea,              // {#var#} - retailer area
      wholesalerName,            // {#var#} - wholesaler name (goods supplied by)
      lineWorkerName,            // {#var#} - line worker name
      collectionDate             // {#var#} - collection date
    ];
    
    console.log('🔧 CLOUD FUNCTION - SMS Variables being used:', {
      amount: variablesValues[0],
      retailerName: variablesValues[1],
      retailerArea: variablesValues[2],
      wholesalerName: variablesValues[3],
      lineWorkerName: variablesValues[4],
      collectionDate: variablesValues[5]
    });
    
    const formattedVariables = variablesValues.join('%7C'); // URL-encoded pipe character

    // Get Fast2SMS configuration with validation
    const { fast2smsApiKey, senderId, entityId } = getFast2SMSConfig();
    const messageId = '199054'; // RetailerNotify template ID

    // Construct API URL
    const entityIdParam = `&entity_id=${entityId}`;
    const apiUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${fast2smsApiKey}&route=dlt&sender_id=${senderId}&message=${messageId}&variables_values=${formattedVariables}&flash=0&numbers=${formattedPhone}${entityIdParam}`;     
    
    console.log('📞 CLOUD FUNCTION - Sending SMS to:', formattedPhone);

    // Send SMS via Fast2SMS with better error handling
    console.log('📞 CLOUD FUNCTION - API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PharmaLync/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ CLOUD FUNCTION - Fast2SMS API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new functions.https.HttpsError(
        'internal',
        `Fast2SMS API error: ${response.status} ${response.statusText} - ${errorText}`
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
      sentBy: context.auth?.uid || 'NEXTJS_API',
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

export const sendWholesalerPaymentSMS = functions.https.onCall(async (request: any) => {
  try {
    console.log('🚀 CLOUD FUNCTION TRIGGERED - sendWholesalerPaymentSMS');
    console.log('📥 Full request object:', JSON.stringify(request, null, 2));
    
    // Handle both callable function format and direct HTTP format
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
    
    // Input validation - updated to accept lineWorkerId as optional
    validateSMSInput(data);
    
    // Rate limiting (by IP or user ID)
    const identifier = context.auth?.uid || context.rawRequest?.ip || 'anonymous';
    await checkRateLimit(identifier, 5, 60000); // 5 requests per minute
    
    console.log('📞 CLOUD FUNCTION - Wholesaler Payment SMS Request:', {
      retailerId: data.retailerId,
      paymentId: data.paymentId,
      amount: data.amount,
      lineWorkerName: data.lineWorkerName,
      lineWorkerId: data.lineWorkerId,
      caller: context.auth ? context.auth.uid : 'NEXTJS_API',
      ip: context.rawRequest?.ip
    });

    let lineWorkerData;
    
    // ENHANCED: Try to find line worker by ID first (more reliable), then by name
    if (data.lineWorkerId) {
      console.log('🔧 CLOUD FUNCTION - Finding line worker by ID:', data.lineWorkerId);
      const lineWorkerDoc = await admin.firestore()
        .collection('users')
        .doc(data.lineWorkerId)
        .get();
      
      if (lineWorkerDoc.exists) {
        lineWorkerData = lineWorkerDoc.data();
        if (lineWorkerData) {
          console.log('✅ CLOUD FUNCTION - Found line worker by ID:', {
            lineWorkerId: lineWorkerDoc.id,
            lineWorkerName: lineWorkerData.displayName || lineWorkerData.name,
            tenantId: lineWorkerData.tenantId,
            wholesalerId: lineWorkerData.wholesalerId
          });
        }
      } else {
        console.log('⚠️ CLOUD FUNCTION - Line worker not found by ID, falling back to name search');
      }
    }
    
    // Fallback: Find by name if ID search failed or ID not provided
    if (!lineWorkerData) {
      console.log('🔧 CLOUD FUNCTION - Finding line worker by name:', data.lineWorkerName);
      const lineWorkerQuery = await admin.firestore()
        .collection('users')
        .where('roles', 'array-contains', 'LINE_WORKER')
        .where('displayName', '==', data.lineWorkerName)
        .limit(1)
        .get();

      if (lineWorkerQuery.empty) {
        // Try with 'name' field as well
        console.log('🔧 CLOUD FUNCTION - Trying with "name" field instead of "displayName"');
        const nameQuery = await admin.firestore()
          .collection('users')
          .where('roles', 'array-contains', 'LINE_WORKER')
          .where('name', '==', data.lineWorkerName)
          .limit(1)
          .get();
        
        if (nameQuery.empty) {
          throw new functions.https.HttpsError(
            'not-found',
            `Line worker '${data.lineWorkerName}' not found in the system`
          );
        }
        
        lineWorkerData = nameQuery.docs[0].data();
        console.log('✅ CLOUD FUNCTION - Found line worker by name field:', {
          lineWorkerId: nameQuery.docs[0].id,
          lineWorkerName: lineWorkerData.displayName || lineWorkerData.name,
          tenantId: lineWorkerData.tenantId,
          wholesalerId: lineWorkerData.wholesalerId
        });
      } else {
        lineWorkerData = lineWorkerQuery.docs[0].data();
        console.log('✅ CLOUD FUNCTION - Found line worker by displayName:', {
          lineWorkerId: lineWorkerQuery.docs[0].id,
          lineWorkerName: lineWorkerData.displayName || lineWorkerData.name,
          tenantId: lineWorkerData.tenantId,
          wholesalerId: lineWorkerData.wholesalerId
        });
      }
    }
    
    // CRITICAL FIX: Use tenantId as wholesaler identifier (tenantId = wholesaler document ID)
    const wholesalerId = lineWorkerData.tenantId || lineWorkerData.wholesalerId;
    
    if (!wholesalerId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Line worker '${data.lineWorkerName}' is not assigned to any wholesaler (missing tenantId/wholesalerId)`
      );
    }
    
    console.log('🔧 CLOUD FUNCTION - Using wholesaler/tenant ID:', wholesalerId);
    
  // Get wholesaler info from TENANTS collection (not users collection)
  const wholesalerDoc = await admin.firestore()
    .collection('tenants')
    .doc(wholesalerId)
    .get();

  if (!wholesalerDoc.exists) {
    throw new functions.https.HttpsError(
      'not-found',
      `Wholesaler/Tenant not found for ID: ${wholesalerId}`
    );
  }

  const wholesalerData = wholesalerDoc.data();
  
  if (!wholesalerData || !wholesalerData.contactPhone) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Wholesaler contact phone not found for wholesaler: ${wholesalerId}`
    );
  }

  console.log('🔧 CLOUD FUNCTION - Found wholesaler details:', {
    wholesalerId: wholesalerDoc.id,
    wholesalerName: wholesalerData.name,
    wholesalerPhone: wholesalerData.contactPhone,
    wholesalerEmail: wholesalerData.contactEmail
  });

  // Validate and format phone number
  const formattedPhone = validatePhoneNumber(wholesalerData.contactPhone);
  
  // Prepare SMS variables - Order MUST match DLT template exactly
  // Template: "Payment Update: {#var#}/- has been recorded in the PharmaLync system from {#var#}, {#var#}. Collected by Line man {#var#} on behalf of {#var#} on {#var#}."
  // Variables: 1=Amount, 2=Retailer Name, 3=Retailer Area, 4=Line Worker Name, 5=Wholesaler Name, 6=Date
  
  // Ensure we have all required variables with proper fallbacks
  const amount = data.amount.toString();
  const retailerName = data.retailerName || 'Retailer';
  const retailerArea = data.retailerArea || 'Unknown Area';
  const lineWorkerName = data.lineWorkerName || 'Line Worker';
  const wholesalerName = data.wholesalerName || (wholesalerData.name || 'Wholesaler'); // Use name from tenants collection
  const collectionDate = data.collectionDate || new Date().toLocaleDateString('en-IN');
  
  const variablesValues: string[] = [
    amount,                    // {#var#} - payment amount
    retailerName,              // {#var#} - retailer name
    retailerArea,              // {#var#} - retailer area
    lineWorkerName,            // {#var#} - line worker name
    wholesalerName,            // {#var#} - wholesaler name (on behalf of)
    collectionDate             // {#var#} - collection date
  ];
  
  console.log('🔧 CLOUD FUNCTION - WHOLESALER SMS Variables being used:', {
    amount: variablesValues[0],
    retailerName: variablesValues[1],
    retailerArea: variablesValues[2],
    lineWorkerName: variablesValues[3],
    wholesalerName: variablesValues[4],
    collectionDate: variablesValues[5]
  });
  
  const formattedVariables = variablesValues.join('%7C'); // URL-encoded pipe character

  // Get Fast2SMS configuration with validation
  const { fast2smsApiKey, senderId, entityId } = getFast2SMSConfig();
  const messageId = '199055'; // WholeSalerNotify template ID

  // Construct API URL
  const entityIdParam = `&entity_id=${entityId}`;
  const apiUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${fast2smsApiKey}&route=dlt&sender_id=${senderId}&message=${messageId}&variables_values=${formattedVariables}&flash=0&numbers=${formattedPhone}${entityIdParam}`;     
  
  console.log('📞 CLOUD FUNCTION - Sending SMS to wholesaler:', formattedPhone);

  // Send SMS via Fast2SMS with better error handling
  console.log('📞 CLOUD FUNCTION - API URL:', apiUrl);
  
  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'PharmaLync/1.0'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ CLOUD FUNCTION - Fast2SMS API Error:', {
      status: response.status,
      statusText: response.statusText,
      errorText
    });
    throw new functions.https.HttpsError(
      'internal',
      `Fast2SMS API error: ${response.status} ${response.statusText} - ${errorText}`
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
    sentBy: context.auth?.uid || 'NEXTJS_API',
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

// Process SMS response helper function
export const processSMSResponse = functions.https.onCall(async (data: any, context: any) => {
  try {
    // Input validation
    if (!data || typeof data !== 'object') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid request data'
      );
    }
    
    if (!data.url || typeof data.url !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'URL is required and must be a string'
      );
    }
    
    // Rate limiting
    const identifier = context.auth?.uid || context.rawRequest?.ip || 'anonymous';
    await checkRateLimit(identifier, 20, 60000); // 20 requests per minute
    
    console.log('📞 CLOUD FUNCTION - Processing SMS response:', {
      url: data.url?.substring(0, 100) + '...',
      caller: context.auth ? context.auth.uid : 'NEXTJS_API',
      ip: context.rawRequest?.ip
    });

    const response = await fetch(data.url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PharmaLync/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ CLOUD FUNCTION - SMS Response API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new functions.https.HttpsError(
        'internal',
        `Failed to process SMS response: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const responseData: any = await response.json();
    
    // Check response structure
    if (responseData && typeof responseData === 'object') {
      if (responseData.return && responseData.request_id) {
        return {
          success: true,
          requestId: responseData.request_id,
          messages: responseData.message
        };
      } else {
        return {
          success: false,
          messageId: responseData.request_id,
          error: 'SMS sending failed'
        };
      }
    } else {
      return {
        success: false,
        error: 'Invalid response format'
      };
    }

  } catch (error) {
    console.error('❌ CLOUD FUNCTION - Error processing SMS response:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to process SMS response',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

// ===== FCM NOTIFICATION FUNCTIONS =====

// Helper function to get user's FCM token
async function getFCMTokenForUser(userId: string): Promise<string | null> {
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      return userData?.fcmToken || null;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting FCM token for user:', userId, error);
    return null;
  }
}

// Send FCM notification for OTP
export const sendOTPNotification = functions.https.onCall(async (request: any) => {
  try {
    console.log('🚀 FCM CLOUD FUNCTION TRIGGERED - sendOTPNotification');
    console.log('📥 Full request object:', JSON.stringify(request, null, 2));
    
    let data, context;
    
    if (request.data && typeof request.data === 'object') {
      // Callable function format
      data = request.data;
      context = request;
    } else if (request && typeof request === 'object' && !request.auth) {
      // Direct HTTP format
      data = request;
      context = { auth: null, rawRequest: { ip: 'unknown' } };
    } else {
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
    
    console.log('📱 FCM - OTP Notification Request:', {
      retailerId: data.retailerId,
      paymentId: data.paymentId,
      amount: data.amount,
      otp: data.otp,
      lineWorkerName: data.lineWorkerName,
      caller: context.auth ? context.auth.uid : 'NEXTJS_API'
    });

    // Get retailer details from Retailer collection
    const retailerDoc = await admin.firestore()
      .collection('Retailer')
      .doc(data.retailerId)
      .get();

    if (!retailerDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        `Retailer not found for retailerId: ${data.retailerId}`
      );
    }

    const retailerUser = retailerDoc.data();
    const retailerUserId = retailerDoc.id; // Use document ID as user ID
    
    if (!retailerUser) {
      throw new functions.https.HttpsError(
        'not-found',
        `Retailer data not found for retailerId: ${data.retailerId}`
      );
    }
    
    // Get FCM token for retailer
    const fcmToken = await getFCMTokenForUser(retailerUserId);
    
    if (!fcmToken) {
      console.warn('⚠️ FCM token not found for retailer:', retailerUserId);
      return {
        success: false,
        error: 'FCM token not found',
        fallbackToSMS: true
      };
    }

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
    console.error('❌ FCM CLOUD FUNCTION - Error sending OTP notification:', error);
    
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

// Send FCM notification for payment completion
export const sendPaymentCompletionNotification = functions.https.onCall(async (request: any) => {
  try {
    console.log('🚀 FCM CLOUD FUNCTION TRIGGERED - sendPaymentCompletionNotification');
    console.log('📥 Full request object:', JSON.stringify(request, null, 2));
    
    let data, context;
    
    if (request.data && typeof request.data === 'object') {
      // Callable function format
      data = request.data;
      context = request;
    } else if (request && typeof request === 'object' && !request.auth) {
      // Direct HTTP format
      data = request;
      context = { auth: null, rawRequest: { ip: 'unknown' } };
    } else {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid request format');
    }
    
    console.log('📤 Extracted data:', JSON.stringify(data, null, 2));
    
    // Input validation
    if (!data.retailerId || typeof data.retailerId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing retailerId');
    }
    if (!data.amount || typeof data.amount !== 'number') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing amount');
    }
    if (!data.paymentId || typeof data.paymentId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing paymentId');
    }
    
    console.log('📱 FCM - Payment Completion Notification Request:', {
      retailerId: data.retailerId,
      paymentId: data.paymentId,
      amount: data.amount,
      caller: context.auth ? context.auth.uid : 'NEXTJS_API'
    });

    // Get retailer details from Retailer collection
    const retailerDoc = await admin.firestore()
      .collection('Retailer')
      .doc(data.retailerId)
      .get();

    if (!retailerDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        `Retailer not found for retailerId: ${data.retailerId}`
      );
    }

    const retailerUser = retailerDoc.data();
    const retailerUserId = retailerDoc.id; // Use document ID as user ID
    
    if (!retailerUser) {
      throw new functions.https.HttpsError(
        'not-found',
        `Retailer data not found for retailerId: ${data.retailerId}`
      );
    }
    
    // Get FCM token for retailer
    const fcmToken = await getFCMTokenForUser(retailerUserId);
    
    if (!fcmToken) {
      console.warn('⚠️ FCM token not found for retailer:', retailerUserId);
      return {
        success: false,
        error: 'FCM token not found',
        fallbackToSMS: true
      };
    }

    // Create FCM message
    const message = {
      notification: {
        title: '✅ Payment Completed',
        body: `Payment of ₹${data.amount.toLocaleString()} completed successfully`,
      },
      data: {
        type: 'payment_completed',
        amount: data.amount.toString(),
        paymentId: data.paymentId,
        retailerId: data.retailerId,
        tag: `payment-${data.paymentId}`,
        requireInteraction: 'false'
      },
      token: fcmToken,
      android: {
        priority: 'normal' as const,
        notification: {
          priority: 'default' as const,
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

    // Send FCM message
    const response = await admin.messaging().send(message);
    console.log('✅ FCM Payment completion notification sent successfully:', response);

    // Log FCM delivery
    await admin.firestore().collection('fcmLogs').add({
      type: 'PAYMENT_COMPLETION_NOTIFICATION',
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
    console.error('❌ FCM CLOUD FUNCTION - Error sending payment completion notification:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to send payment completion notification',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

// Send test FCM notification
export const sendTestFCMNotification = functions.https.onCall(async (request: any) => {
  try {
    console.log('🚀 FCM CLOUD FUNCTION TRIGGERED - sendTestFCMNotification');
    
    let data, context;
    
    if (request.data && typeof request.data === 'object') {
      data = request.data;
      context = request;
    } else if (request && typeof request === 'object' && !request.auth) {
      data = request;
      context = { auth: null, rawRequest: { ip: 'unknown' } };
    } else {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid request format');
    }

    if (!context.auth?.uid) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const fcmToken = await getFCMTokenForUser(userId);
    
    if (!fcmToken) {
      throw new functions.https.HttpsError('not-found', 'FCM token not found for user');
    }

    const message = {
      notification: {
        title: '📱 Test Notification',
        body: 'This is a test FCM notification from pHLynk',
      },
      data: {
        type: 'test',
        tag: 'test-notification',
        requireInteraction: 'false'
      },
      token: fcmToken,
      android: {
        priority: 'normal' as const,
        notification: {
          priority: 'default' as const,
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

    const response = await admin.messaging().send(message);
    console.log('✅ Test FCM notification sent successfully:', response);

    // Log test notification
    await admin.firestore().collection('fcmLogs').add({
      type: 'TEST_NOTIFICATION',
      userId: userId,
      token: fcmToken.substring(0, 8) + '...',
      status: 'SENT',
      messageId: response,
      sentBy: userId,
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      messageId: response,
      message: 'Test notification sent successfully'
    };

  } catch (error) {
    console.error('❌ FCM CLOUD FUNCTION - Error sending test notification:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to send test notification',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});