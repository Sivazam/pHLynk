import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Version: 2.0.2 - Force update for Service Worker cache-busting

// Initialize Firebase Admin with service account JSON file
function getServiceAccountConfig() {
  try {
    // Try to read from service-account.json file in the functions directory
    const serviceAccountPath = path.join(__dirname, '../service-account.json');
    console.log('🔧 Looking for service account file at:', serviceAccountPath);
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccountFile = fs.readFileSync(serviceAccountPath, 'utf8');
      const serviceAccount = JSON.parse(serviceAccountFile);
      console.log('✅ Using service account from service-account.json file');
      return serviceAccount;
    } else {
      console.warn('⚠️ service-account.json file not found, falling back to environment variables');
    }
  } catch (error) {
    console.warn('⚠️ Failed to read service-account.json file, falling back to environment variables:', error);
  }

  // Fallback to environment variables (APP_* format)
  if (process.env.APP_FIREBASE_CONFIG) {
    try {
      const config = JSON.parse(process.env.APP_FIREBASE_CONFIG);
      console.log('✅ Using APP_FIREBASE_CONFIG from environment');
      return config;
    } catch (error) {
      console.warn('⚠️ Failed to parse APP_FIREBASE_CONFIG, falling back to individual variables');
    }
  }

  // Fallback to individual variables
  const serviceAccount = {
    type: process.env.APP_SERVICE_ACCOUNT_TYPE || 'service_account',
    project_id: process.env.APP_SERVICE_ACCOUNT_PROJECT_ID,
    private_key_id: process.env.APP_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    private_key: process.env.APP_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.APP_SERVICE_ACCOUNT_CLIENT_EMAIL,
    client_id: process.env.APP_SERVICE_ACCOUNT_CLIENT_ID,
    auth_uri: process.env.APP_SERVICE_ACCOUNT_AUTH_URI,
    token_uri: process.env.APP_SERVICE_ACCOUNT_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.APP_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.APP_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL,
    universe_domain: process.env.APP_SERVICE_ACCOUNT_UNIVERSE_DOMAIN
  };

  // Validate required fields
  if (serviceAccount.private_key && serviceAccount.client_email && serviceAccount.project_id) {
    console.log('✅ Using individual APP_SERVICE_ACCOUNT_* variables');
    return serviceAccount;
  }

  console.error('❌ No valid Firebase service account configuration found');
  return null;
}

// Get service account config and initialize
const serviceAccountConfig = getServiceAccountConfig();
if (serviceAccountConfig) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountConfig)
  });
  console.log('✅ Firebase Admin initialized with service account');
} else {
  // Fallback to default initialization (uses GOOGLE_APPLICATION_CREDENTIALS)
  admin.initializeApp();
  console.log('⚠️ Firebase Admin initialized with default credentials');
}

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
  // Use environment variables instead of deprecated functions.config()
  const fast2smsApiKey = process.env.FAST2SMS_API_KEY;
  const senderId = process.env.FAST2SMS_SENDER_ID || 'SNSYST';
  const entityId = process.env.FAST2SMS_ENTITY_ID;
  
  if (!fast2smsApiKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Fast2SMS API key not configured in environment variables'
    );
  }
  
  if (!entityId) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Fast2SMS entity ID not configured in environment variables'
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

    // Get retailer user details with better error handling
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

    const retailerUser = retailerUsersQuery.docs[0].data();
    
    if (!retailerUser.phone) {
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
async function getFCMTokenForUser(userId: string, collection: string = 'users'): Promise<string | null> {
  try {
    console.log(`🔧 Looking for FCM token for user ${userId} in collection: ${collection}`);
    
    const userDoc = await admin.firestore().collection(collection).doc(userId).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      console.log(`📱 Found user document in ${collection}, checking FCM devices...`);
      
      // Check for fcmDevices array first (new structure)
      const fcmDevices = userData?.fcmDevices || [];
      if (fcmDevices.length > 0) {
        // Return the most recently active device token
        const activeDevice = fcmDevices.reduce((latest: any, device: any) => {
          const deviceTime = device.lastActive?.toDate?.() || new Date(0);
          const latestTime = latest?.lastActive?.toDate?.() || new Date(0);
          return deviceTime > latestTime ? device : latest;
        }, fcmDevices[0]);
        
        console.log(`✅ Found ${fcmDevices.length} FCM devices in ${collection}, using most recent:`, activeDevice.token?.substring(0, 20) + '...');
        return activeDevice.token || null;
      }
      
      // Fallback to single fcmToken field (old structure)
      if (userData?.fcmToken) {
        console.log(`✅ Found single FCM token in ${collection} (old structure):`, userData.fcmToken.substring(0, 20) + '...');
        return userData.fcmToken;
      }
      
      console.log(`❌ No FCM devices found for user in ${collection}`);
    } else {
      console.log(`❌ User document not found in ${collection}`);
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error getting FCM token for user:', userId, 'in collection:', collection, error);
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
    
    // lineWorkerId is optional (for backwards compatibility)
    if (data.lineWorkerId && typeof data.lineWorkerId !== 'string') {
      console.error('❌ FCM CLOUD FUNCTION - Invalid lineWorkerId:', data.lineWorkerId);
      throw new functions.https.HttpsError('invalid-argument', 'Invalid lineWorkerId');
    }
    
    console.log('📱 FCM - OTP Notification Request:', {
      retailerId: data.retailerId,
      paymentId: data.paymentId,
      amount: data.amount,
      otp: data.otp,
      lineWorkerName: data.lineWorkerName,
      lineWorkerId: data.lineWorkerId,
      caller: context.auth ? context.auth.uid : 'NEXTJS_API'
    });

    // Fetch line worker to get tenantId for wholesaler name
    let wholesalerName = '';
    if (data.lineWorkerId) {
      try {
        const lineWorkerDoc = await admin.firestore().collection('users').doc(data.lineWorkerId).get();
        if (lineWorkerDoc.exists) {
          const lineWorkerData = lineWorkerDoc.data();
          const tenantId = lineWorkerData?.tenantId;
          
          if (tenantId) {
            // Fetch tenant details to get wholesaler name
            const tenantDoc = await admin.firestore().collection('tenants').doc(tenantId).get();
            if (tenantDoc.exists) {
              const tenantData = tenantDoc.data();
              wholesalerName = tenantData?.name || '';
              console.log('✅ FCM - Fetched wholesaler name:', wholesalerName);
            } else {
              console.warn('⚠️ FCM - Tenant not found for tenantId:', tenantId);
            }
          } else {
            console.warn('⚠️ FCM - Line worker has no tenantId');
          }
        } else {
          console.warn('⚠️ FCM - Line worker not found for lineWorkerId:', data.lineWorkerId);
        }
      } catch (error) {
        console.error('❌ FCM - Error fetching wholesaler name:', error);
        // Continue without wholesaler name if fetch fails
      }
    }

    // Get FCM token for retailer from retailers collection (not retailerUsers)
    const fcmToken = await getFCMTokenForUser(data.retailerId, 'retailers');
    
    if (!fcmToken) {
      console.warn('⚠️ FCM token not found for retailer:', data.retailerId);
      return {
        success: false,
        error: 'FCM token not found',
        fallbackToSMS: true
      };
    }

    // Create FCM message with proper icons and updated format
    const wholesalerPart = wholesalerName ? ` from ${wholesalerName}` : '';
    const messageBody = `Your OTP code is ${data.otp} for payment of ₹${data.amount.toLocaleString()} collected by ${data.lineWorkerName}${wholesalerPart}\n-- PharmaLync`;
    
    const message = {
      notification: {
        title: 'Payment Verification Required',
        body: messageBody,
      },
      data: {
        type: 'otp',
        otp: data.otp,
        amount: data.amount.toString(),
        paymentId: data.paymentId,
        retailerId: data.retailerId,
        lineWorkerName: data.lineWorkerName,
        wholesalerName: wholesalerName,
        tag: `otp-${data.paymentId}`,
        requireInteraction: 'true',
        clickAction: '/retailer/dashboard'
      },
      token: fcmToken,
      android: {
        priority: 'high' as const,
        notification: {
          priority: 'high' as const,
          defaultSound: true,
          defaultVibrateTimings: true,
          // Android specific icon configuration
          icon: '/notification-large-192x192.png', // Right side large icon
          badge: '/badge-72x72.png', // Left side badge icon
          color: '#20439f', // Brand blue for notification accent
          style: 'default',
          notificationCount: 1
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
            'mutable-content': 1
          }
        },
        fcmOptions: {
          imageUrl: '/notification-large-192x192.png' // iOS large icon
        }
      },
      webpush: {
        headers: {
          icon: '/notification-large-192x192.png', // Right side large icon
          badge: '/badge-72x72.png', // Left side badge icon
          themeColor: '#20439f' // Brand blue
        },
        notification: {
          title: 'Payment Verification Required',
          body: messageBody,
          icon: '/notification-large-192x192.png',
          badge: '/badge-72x72.png',
          tag: `otp-${data.paymentId}`,
          requireInteraction: true,
          actions: [
            {
              action: 'open',
              title: 'Open App'
            }
          ]
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
      userId: data.retailerId, // Using retailerId since we're getting tokens from retailers collection
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
      recipientType: data.recipientType || 'retailer',
      caller: context.auth ? context.auth.uid : 'NEXTJS_API'
    });

    // Get retailer/wholesaler document and FCM devices
    if (data.recipientType === 'wholesaler') {
      // For wholesaler, look in tenants collection
      console.log('🔧 Looking for FCM devices for wholesaler:', data.retailerId);
      
      const wholesalerDoc = await admin.firestore()
        .collection('tenants')
        .doc(data.retailerId) // retailerId is actually wholesalerId for wholesaler notifications
        .get();

      if (!wholesalerDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          `Wholesaler not found: ${data.retailerId}`
        );
      }

      const wholesalerData = wholesalerDoc.data();
      const fcmDevices = wholesalerData?.fcmDevices || [];
      
      if (fcmDevices.length === 0) {
        console.log('⚠️ No FCM devices found for wholesaler:', data.retailerId);
        return {
          success: false,
          message: 'No devices registered for this wholesaler',
          deviceCount: 0
        };
      }

      console.log(`📱 Found ${fcmDevices.length} FCM devices for wholesaler`);

      // Filter active devices (isActive: true AND last active within 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      let activeDevices = fcmDevices.filter((device: any) => {
        const lastActive = device.lastActive?.toDate?.() || new Date(device.lastActive);
        const isRecentlyActive = lastActive > thirtyDaysAgo;
        const isCurrentlyActive = device.isActive === true; // Must be explicitly true
        console.log(`🔍 Device ${device.deviceId}: isActive=${device.isActive}, lastActive=${lastActive.toISOString()}, recentlyActive=${isRecentlyActive}, currentlyActive=${isCurrentlyActive}`);
        return isRecentlyActive && isCurrentlyActive;
      });

      // Remove duplicate devices with same token (keep the most recently active one)
      const uniqueDevices = new Map();
      activeDevices.forEach((device: any) => {
        const existingDevice = uniqueDevices.get(device.token);
        if (!existingDevice || 
            (device.lastActive?.toDate?.() || new Date(device.lastActive)) > 
            (existingDevice.lastActive?.toDate?.() || new Date(existingDevice.lastActive))) {
          uniqueDevices.set(device.token, device);
        }
      });
      activeDevices = Array.from(uniqueDevices.values());

      console.log(`📱 ${activeDevices.length} unique active devices after filtering and deduplication`);

      if (activeDevices.length === 0) {
        return {
          success: false,
          message: 'No active devices found for this wholesaler',
          deviceCount: 0
        };
      }

      // Send to wholesaler devices
      return await sendNotificationToDevices(activeDevices, {
        title: data.title || '💰 Collection Update',
        body: data.body || `Payment of ₹${data.amount} collected`,
        data: {
          type: 'payment_completed',
          amount: data.amount.toString(),
          paymentId: data.paymentId,
          recipientType: 'wholesaler',
          retailerName: data.retailerName,
          lineWorkerName: data.lineWorkerName,
          wholesalerId: data.wholesalerId
        },
        tag: `payment-${data.paymentId}`,
        clickAction: data.clickAction || '/wholesaler/dashboard'
      });

    } else {
      // For retailer, use existing logic (same as sendFCMNotification)
      console.log('🔧 Looking for FCM devices for retailer:', data.retailerId);
      
      const retailerDoc = await admin.firestore()
        .collection('retailers')
        .doc(data.retailerId)
        .get();

      if (!retailerDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          `Retailer not found: ${data.retailerId}`
        );
      }

      const retailerData = retailerDoc.data();
      const fcmDevices = retailerData?.fcmDevices || [];

      if (fcmDevices.length === 0) {
        console.log('⚠️ No FCM devices found for retailer:', data.retailerId);
        return {
          success: false,
          message: 'No devices registered for this retailer',
          deviceCount: 0
        };
      }

      console.log(`📱 Found ${fcmDevices.length} FCM devices for retailer`);

      // Filter active devices (isActive: true AND last active within 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      let activeDevices = fcmDevices.filter((device: any) => {
        const lastActive = device.lastActive?.toDate?.() || new Date(device.lastActive);
        const isRecentlyActive = lastActive > thirtyDaysAgo;
        const isCurrentlyActive = device.isActive === true; // Must be explicitly true
        console.log(`🔍 Device ${device.deviceId}: isActive=${device.isActive}, lastActive=${lastActive.toISOString()}, recentlyActive=${isRecentlyActive}, currentlyActive=${isCurrentlyActive}`);
        return isRecentlyActive && isCurrentlyActive;
      });

      // Remove duplicate devices with same token (keep the most recently active one)
      const uniqueDevices = new Map();
      activeDevices.forEach((device: any) => {
        const existingDevice = uniqueDevices.get(device.token);
        if (!existingDevice || 
            (device.lastActive?.toDate?.() || new Date(device.lastActive)) > 
            (existingDevice.lastActive?.toDate?.() || new Date(existingDevice.lastActive))) {
          uniqueDevices.set(device.token, device);
        }
      });
      activeDevices = Array.from(uniqueDevices.values());

      console.log(`📱 ${activeDevices.length} unique active devices after filtering and deduplication`);

      if (activeDevices.length === 0) {
        return {
          success: false,
          message: 'No active devices found for this retailer',
          deviceCount: 0
        };
      }

      // Send to retailer devices
      return await sendNotificationToDevices(activeDevices, {
        title: data.title || '🎉 Payment Successful',
        body: data.body || `Payment of ₹${data.amount} completed`,
        data: {
          type: 'payment_completed',
          amount: data.amount.toString(),
          paymentId: data.paymentId,
          recipientType: 'retailer',
          retailerName: data.retailerName,
          lineWorkerName: data.lineWorkerName,
          wholesalerId: data.wholesalerId
        },
        tag: `payment-${data.paymentId}`,
        clickAction: data.clickAction || '/retailer/payment-history'
      });
    }
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

// FCM Notification Function
export const sendFCMNotification = functions.https.onCall(async (request: any) => {
  try {
    console.log('🚀 CLOUD FUNCTION TRIGGERED - sendFCMNotification');
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
    if (!data.notification || typeof data.notification !== 'object') {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing notification object');
    }
    
    const { retailerId, notification } = data;
    
    console.log('📱 FCM Notification Request:', {
      retailerId,
      title: notification.title,
      body: notification.body,
      caller: context.auth ? context.auth.uid : 'NEXTJS_API'
    });

    // Fetch line worker to get tenantId for wholesaler name (if lineWorkerId is provided)
    let wholesalerName = '';
    if (data.lineWorkerId) {
      try {
        const lineWorkerDoc = await admin.firestore().collection('users').doc(data.lineWorkerId).get();
        if (lineWorkerDoc.exists) {
          const lineWorkerData = lineWorkerDoc.data();
          const tenantId = lineWorkerData?.tenantId;
          
          if (tenantId) {
            // Fetch tenant details to get wholesaler name
            const tenantDoc = await admin.firestore().collection('tenants').doc(tenantId).get();
            if (tenantDoc.exists) {
              const tenantData = tenantDoc.data();
              wholesalerName = tenantData?.name || '';
              console.log('✅ FCM - Fetched wholesaler name:', wholesalerName);
            } else {
              console.warn('⚠️ FCM - Tenant not found for tenantId:', tenantId);
            }
          } else {
            console.warn('⚠️ FCM - Line worker has no tenantId');
          }
        } else {
          console.warn('⚠️ FCM - Line worker not found for lineWorkerId:', data.lineWorkerId);
        }
      } catch (error) {
        console.error('❌ FCM - Error fetching wholesaler name:', error);
        // Continue without wholesaler name if fetch fails
      }
    }

    // Get retailer document
    const retailerDoc = await admin.firestore()
      .collection('retailers')
      .doc(retailerId)
      .get();

    if (!retailerDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        `Retailer not found: ${retailerId}`
      );
    }

    const retailerData = retailerDoc.data();
    const fcmDevices = retailerData?.fcmDevices || [];

    if (fcmDevices.length === 0) {
      console.log('⚠️ No FCM devices found for retailer:', retailerId);
      return {
        success: false,
        message: 'No devices registered for this retailer',
        deviceCount: 0
      };
    }

    console.log(`📱 Found ${fcmDevices.length} FCM devices for retailer`);

    // Filter active devices (isActive: true AND last active within 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeDevices = fcmDevices.filter((device: any) => {
      const lastActive = device.lastActive?.toDate?.() || new Date(device.lastActive);
      const isRecentlyActive = lastActive > thirtyDaysAgo;
      const isCurrentlyActive = device.isActive !== false; // Check isActive flag
      console.log(`🔍 Device ${device.deviceId}: isActive=${device.isActive}, lastActive=${lastActive.toISOString()}, recentlyActive=${isRecentlyActive}, currentlyActive=${isCurrentlyActive}`);
      return isRecentlyActive && isCurrentlyActive;
    });

    console.log(`📱 ${activeDevices.length} active devices after filtering`);

    if (activeDevices.length === 0) {
      return {
        success: false,
        message: 'No active devices found for this retailer',
        deviceCount: 0
      };
    }

    // Prepare notification message with proper FCM format
    // Update notification body for OTP notifications to include wholesaler name
    let updatedNotification = { ...notification };
    if (notification.title === 'Payment Verification Required' && notification.body && wholesalerName) {
      // Check if this is an OTP notification and we have a wholesaler name
      const wholesalerPart = wholesalerName ? ` from ${wholesalerName}` : '';
      updatedNotification.body = `${notification.body}${wholesalerPart}\n-- PharmaLync`;
    }
    
    const message: any = {
      notification: {
        title: updatedNotification.title,
        body: updatedNotification.body,
        ...(updatedNotification.image && { image: updatedNotification.image }), // Only include if image exists
      },
      data: {
        ...notification.data,
        icon: notification.icon || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/notification-large-192x192.png`,
        badge: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/badge-72x72.png`,
        tag: notification.tag,
        clickAction: notification.clickAction
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          ...(notification.clickAction && { click_action: notification.clickAction }), // Use click_action for Android
          icon: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/notification-small-24x24.png`,
          color: '#000000', // Your brand color
          notificationCount: 1
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'mutable-content': 1
          }
        },
        ...(notification.image && {
          fcm_options: {
            image: notification.image
          }
        })
      }
    };

    let successCount = 0;
    let failureCount = 0;
    const results: any[] = [];

    // Send to each device
    for (const device of activeDevices) {
      try {
        console.log(`📤 Sending to device: ${device.token.substring(0, 20)}...`);
        
        const deviceMessage = {
          ...message,
          token: device.token
        };

        const response = await admin.messaging().send(deviceMessage);
        console.log(`✅ Message sent successfully: ${response}`);
        successCount++;
        
        results.push({
          token: device.token.substring(0, 20) + '...',
          success: true,
          messageId: response
        });
        
      } catch (error: any) {
        console.error(`❌ Failed to send to device ${device.token.substring(0, 20)}...:`, error);
        failureCount++;
        
        results.push({
          token: device.token.substring(0, 20) + '...',
          success: false,
          error: error.message
        });

        // If device token is invalid, remove it
        if (error.code === 'messaging/registration-token-not-registered' || 
            error.code === 'messaging/invalid-registration-token') {
          try {
            await admin.firestore()
              .collection('retailers')
              .doc(retailerId)
              .update({
                fcmDevices: admin.firestore.FieldValue.arrayRemove(device)
              });
            console.log('🗑️ Removed invalid device token:', device.token.substring(0, 20) + '...');
          } catch (removeError) {
            console.error('Failed to remove invalid device:', removeError);
          }
        }
      }
    }

    console.log(`📊 FCM sending complete: ${successCount} success, ${failureCount} failures`);

    return {
      success: successCount > 0,
      message: `Sent to ${successCount} device(s), ${failureCount} failed`,
      sentCount: successCount,
      failedCount: failureCount,
      deviceCount: activeDevices.length,
      results
    };

  } catch (error) {
    console.error('❌ CLOUD FUNCTION - Error sending FCM notification:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to send FCM notification',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

// Helper function to send notifications to multiple devices (shared between functions)
async function sendNotificationToDevices(activeDevices: any[], notification: any) {
  // Prepare notification message with proper FCM format
  const message: any = {
    notification: {
      title: notification.title,
      body: notification.body,
      ...(notification.image && { image: notification.image }), // Only include if image exists
    },
    data: {
      ...notification.data,
      icon: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/notification-large-192x192.png`,
      badge: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/badge-72x72.png`,
      tag: notification.tag, // This prevents duplicate notifications
      clickAction: notification.clickAction
    },
    android: {
      priority: 'high' as const,
      notification: {
        sound: 'default',
        ...(notification.clickAction && { click_action: notification.clickAction }), // Use click_action for Android
        icon: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/notification-small-24x24.png`,
        color: '#000000', // Your brand color,
        notificationCount: 1,
        tag: notification.tag // Android tag to prevent duplicates
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          'mutable-content': 1
        }
      },
      ...(notification.image && {
        fcm_options: {
          image: notification.image
        }
      })
    }
  };

  let successCount = 0;
  let failureCount = 0;
  const results: any[] = [];

  // Send to each device
  for (const device of activeDevices) {
    try {
      console.log(`📤 Sending to device: ${device.token.substring(0, 20)}...`);
      
      const deviceMessage = {
        ...message,
        token: device.token
      };
      
      const response = await admin.messaging().send(deviceMessage);
      console.log(`✅ Message sent successfully: ${response}`);
      successCount++;
      results.push({
        token: device.token.substring(0, 20) + '...',
        success: true,
        messageId: response
      });
    } catch (error: any) {
      console.error(`❌ Failed to send to device ${device.token.substring(0, 20)}...:`, error);
      failureCount++;
      results.push({
        token: device.token.substring(0, 20) + '...',
        success: false,
        error: error.message
      });
      
      // If device token is invalid, remove it
      if (error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token') {
        try {
          // For retailers
          if (notification.data.recipientType === 'retailer') {
            await admin.firestore()
              .collection('retailers')
              .doc(notification.data.retailerId)
              .update({
                fcmDevices: admin.firestore.FieldValue.arrayRemove(device)
              });
          } else if (notification.data.recipientType === 'wholesaler') {
            // For wholesalers
            await admin.firestore()
              .collection('tenants')
              .doc(notification.data.wholesalerId)
              .update({
                fcmDevices: admin.firestore.FieldValue.arrayRemove(device)
              });
          }
          console.log('🗑️ Removed invalid device token:', device.token.substring(0, 20) + '...');
        } catch (removeError) {
          console.error('Failed to remove invalid device:', removeError);
        }
      }
    }
  }

  console.log(`📊 FCM sending complete: ${successCount} success, ${failureCount} failures`);
  
  return {
    success: successCount > 0,
    message: `Sent to ${successCount} device(s), ${failureCount} failed`,
    sentCount: successCount,
    failedCount: failureCount,
    results
  };
}

