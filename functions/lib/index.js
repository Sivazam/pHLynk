"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOTPHTTP = exports.generateOTP = exports.sendTestFCMNotification = exports.sendPaymentCompletionNotification = exports.sendOTPNotification = exports.processSMSResponse = exports.sendWholesalerPaymentSMS = exports.sendRetailerPaymentSMS = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
// Input validation helper
function validateSMSInput(data) {
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
async function checkRateLimit(identifier, maxRequests = 10, windowMs = 60000) {
    const now = admin.firestore.Timestamp.now();
    const windowStart = new Date(now.toMillis() - windowMs);
    const requestsRef = admin.firestore()
        .collection('rateLimits')
        .doc(identifier)
        .collection('requests')
        .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(windowStart));
    const snapshot = await requestsRef.get();
    if (snapshot.size >= maxRequests) {
        throw new functions.https.HttpsError('resource-exhausted', 'Too many requests. Please try again later.');
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
function validatePhoneNumber(phone) {
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid phone number');
    }
    return cleanedPhone;
}
// Fast2SMS configuration validation
function getFast2SMSConfig() {
    const fast2smsConfig = functions.config().fast2sms;
    const fast2smsApiKey = fast2smsConfig === null || fast2smsConfig === void 0 ? void 0 : fast2smsConfig.api_key;
    const senderId = (fast2smsConfig === null || fast2smsConfig === void 0 ? void 0 : fast2smsConfig.sender_id) || 'SNSYST';
    const entityId = fast2smsConfig === null || fast2smsConfig === void 0 ? void 0 : fast2smsConfig.entity_id;
    if (!fast2smsApiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Fast2SMS API key not configured in Firebase Functions config');
    }
    if (!entityId) {
        throw new functions.https.HttpsError('failed-precondition', 'Fast2SMS entity ID not configured in Firebase Functions config');
    }
    return { fast2smsApiKey, senderId, entityId };
}
// SMS Notification Functions
exports.sendRetailerPaymentSMS = functions.https.onCall(async (request) => {
    var _a, _b, _c, _d;
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
        }
        else if (request && typeof request === 'object' && !request.auth) {
            // Direct HTTP format
            console.log('🌐 Using direct HTTP format');
            data = request;
            context = { auth: null, rawRequest: { ip: 'unknown' } };
        }
        else {
            console.error('❌ Unknown request format:', typeof request);
            throw new functions.https.HttpsError('invalid-argument', 'Invalid request format');
        }
        console.log('📤 Extracted data:', JSON.stringify(data, null, 2));
        // Input validation
        validateSMSInput(data);
        // Rate limiting (by IP or user ID)
        const identifier = ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || ((_b = context.rawRequest) === null || _b === void 0 ? void 0 : _b.ip) || 'anonymous';
        await checkRateLimit(identifier, 5, 60000); // 5 requests per minute
        console.log('📞 CLOUD FUNCTION - Retailer Payment SMS Request:', {
            retailerId: data.retailerId,
            paymentId: data.paymentId,
            amount: data.amount,
            lineWorkerName: data.lineWorkerName,
            caller: context.auth ? context.auth.uid : 'NEXTJS_API',
            ip: (_c = context.rawRequest) === null || _c === void 0 ? void 0 : _c.ip
        });
        // Get retailer user details with better error handling
        const retailerUsersQuery = await admin.firestore()
            .collection('retailerUsers')
            .where('retailerId', '==', data.retailerId)
            .limit(1)
            .get();
        if (retailerUsersQuery.empty) {
            throw new functions.https.HttpsError('not-found', `Retailer user not found for retailerId: ${data.retailerId}`);
        }
        const retailerUser = retailerUsersQuery.docs[0].data();
        if (!retailerUser.phone) {
            throw new functions.https.HttpsError('failed-precondition', `Retailer phone number not found for retailerId: ${data.retailerId}`);
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
        const variablesValues = [
            amount, // {#var#} - payment amount
            retailerName, // {#var#} - retailer name
            retailerArea, // {#var#} - retailer area
            wholesalerName, // {#var#} - wholesaler name (goods supplied by)
            lineWorkerName, // {#var#} - line worker name
            collectionDate // {#var#} - collection date
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
            throw new functions.https.HttpsError('internal', `Fast2SMS API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const responseData = await response.json();
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
            sentBy: ((_d = context.auth) === null || _d === void 0 ? void 0 : _d.uid) || 'NEXTJS_API',
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ CLOUD FUNCTION - SMS sent successfully:', responseData);
        return {
            success: true,
            messageId: responseData.request_id,
            phone: formattedPhone,
            status: responseData.return ? 'SENT' : 'FAILED'
        };
    }
    catch (error) {
        console.error('❌ CLOUD FUNCTION - Error sending retailer payment SMS:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to send retailer payment SMS', error instanceof Error ? error.message : 'Unknown error');
    }
});
exports.sendWholesalerPaymentSMS = functions.https.onCall(async (request) => {
    var _a, _b, _c, _d;
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
        }
        else if (request && typeof request === 'object' && !request.auth) {
            // Direct HTTP format
            console.log('🌐 Using direct HTTP format');
            data = request;
            context = { auth: null, rawRequest: { ip: 'unknown' } };
        }
        else {
            console.error('❌ Unknown request format:', typeof request);
            throw new functions.https.HttpsError('invalid-argument', 'Invalid request format');
        }
        console.log('📤 Extracted data:', JSON.stringify(data, null, 2));
        // Input validation - updated to accept lineWorkerId as optional
        validateSMSInput(data);
        // Rate limiting (by IP or user ID)
        const identifier = ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || ((_b = context.rawRequest) === null || _b === void 0 ? void 0 : _b.ip) || 'anonymous';
        await checkRateLimit(identifier, 5, 60000); // 5 requests per minute
        console.log('📞 CLOUD FUNCTION - Wholesaler Payment SMS Request:', {
            retailerId: data.retailerId,
            paymentId: data.paymentId,
            amount: data.amount,
            lineWorkerName: data.lineWorkerName,
            lineWorkerId: data.lineWorkerId,
            caller: context.auth ? context.auth.uid : 'NEXTJS_API',
            ip: (_c = context.rawRequest) === null || _c === void 0 ? void 0 : _c.ip
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
            }
            else {
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
                    throw new functions.https.HttpsError('not-found', `Line worker '${data.lineWorkerName}' not found in the system`);
                }
                lineWorkerData = nameQuery.docs[0].data();
                console.log('✅ CLOUD FUNCTION - Found line worker by name field:', {
                    lineWorkerId: nameQuery.docs[0].id,
                    lineWorkerName: lineWorkerData.displayName || lineWorkerData.name,
                    tenantId: lineWorkerData.tenantId,
                    wholesalerId: lineWorkerData.wholesalerId
                });
            }
            else {
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
            throw new functions.https.HttpsError('failed-precondition', `Line worker '${data.lineWorkerName}' is not assigned to any wholesaler (missing tenantId/wholesalerId)`);
        }
        console.log('🔧 CLOUD FUNCTION - Using wholesaler/tenant ID:', wholesalerId);
        // Get wholesaler info from TENANTS collection (not users collection)
        const wholesalerDoc = await admin.firestore()
            .collection('tenants')
            .doc(wholesalerId)
            .get();
        if (!wholesalerDoc.exists) {
            throw new functions.https.HttpsError('not-found', `Wholesaler/Tenant not found for ID: ${wholesalerId}`);
        }
        const wholesalerData = wholesalerDoc.data();
        if (!wholesalerData || !wholesalerData.contactPhone) {
            throw new functions.https.HttpsError('failed-precondition', `Wholesaler contact phone not found for wholesaler: ${wholesalerId}`);
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
        const variablesValues = [
            amount, // {#var#} - payment amount
            retailerName, // {#var#} - retailer name
            retailerArea, // {#var#} - retailer area
            lineWorkerName, // {#var#} - line worker name
            wholesalerName, // {#var#} - wholesaler name (on behalf of)
            collectionDate // {#var#} - collection date
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
            throw new functions.https.HttpsError('internal', `Fast2SMS API error: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const responseData = await response.json();
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
            sentBy: ((_d = context.auth) === null || _d === void 0 ? void 0 : _d.uid) || 'NEXTJS_API',
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ CLOUD FUNCTION - SMS sent successfully to wholesaler:', responseData);
        return {
            success: true,
            messageId: responseData.request_id,
            phone: formattedPhone,
            status: responseData.return ? 'SENT' : 'FAILED'
        };
    }
    catch (error) {
        console.error('❌ CLOUD FUNCTION - Error sending wholesaler payment SMS:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to send wholesaler payment SMS', error instanceof Error ? error.message : 'Unknown error');
    }
});
// Process SMS response helper function
exports.processSMSResponse = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d;
    try {
        // Input validation
        if (!data || typeof data !== 'object') {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid request data');
        }
        if (!data.url || typeof data.url !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'URL is required and must be a string');
        }
        // Rate limiting
        const identifier = ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || ((_b = context.rawRequest) === null || _b === void 0 ? void 0 : _b.ip) || 'anonymous';
        await checkRateLimit(identifier, 20, 60000); // 20 requests per minute
        console.log('📞 CLOUD FUNCTION - Processing SMS response:', {
            url: ((_c = data.url) === null || _c === void 0 ? void 0 : _c.substring(0, 100)) + '...',
            caller: context.auth ? context.auth.uid : 'NEXTJS_API',
            ip: (_d = context.rawRequest) === null || _d === void 0 ? void 0 : _d.ip
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
            throw new functions.https.HttpsError('internal', `Failed to process SMS response: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const responseData = await response.json();
        // Check response structure
        if (responseData && typeof responseData === 'object') {
            if (responseData.return && responseData.request_id) {
                return {
                    success: true,
                    requestId: responseData.request_id,
                    messages: responseData.message
                };
            }
            else {
                return {
                    success: false,
                    messageId: responseData.request_id,
                    error: 'SMS sending failed'
                };
            }
        }
        else {
            return {
                success: false,
                error: 'Invalid response format'
            };
        }
    }
    catch (error) {
        console.error('❌ CLOUD FUNCTION - Error processing SMS response:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to process SMS response', error instanceof Error ? error.message : 'Unknown error');
    }
});
// ===== FCM NOTIFICATION FUNCTIONS =====
// Helper function to get user's FCM token
async function getFCMTokenForUser(userId) {
    try {
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            return (userData === null || userData === void 0 ? void 0 : userData.fcmToken) || null;
        }
        return null;
    }
    catch (error) {
        console.error('❌ Error getting FCM token for user:', userId, error);
        return null;
    }
}
// Send FCM notification for OTP
exports.sendOTPNotification = functions.https.onCall(async (request) => {
    var _a;
    try {
        console.log('🚀 FCM CLOUD FUNCTION TRIGGERED - sendOTPNotification');
        console.log('📥 Full request object:', JSON.stringify(request, null, 2));
        let data, context;
        if (request.data && typeof request.data === 'object') {
            // Callable function format
            data = request.data;
            context = request;
        }
        else if (request && typeof request === 'object' && !request.auth) {
            // Direct HTTP format
            data = request;
            context = { auth: null, rawRequest: { ip: 'unknown' } };
        }
        else {
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
        // Get retailer user details
        const retailerUsersQuery = await admin.firestore()
            .collection('retailerUsers')
            .where('retailerId', '==', data.retailerId)
            .limit(1)
            .get();
        if (retailerUsersQuery.empty) {
            throw new functions.https.HttpsError('not-found', `Retailer user not found for retailerId: ${data.retailerId}`);
        }
        const retailerUser = retailerUsersQuery.docs[0];
        const retailerUserId = retailerUser.id;
        // Get FCM token for retailer user
        const fcmToken = await getFCMTokenForUser(retailerUserId);
        if (!fcmToken) {
            console.warn('⚠️ FCM token not found for retailer user:', retailerUserId);
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
                priority: 'high',
                notification: {
                    priority: 'high',
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
            sentBy: ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'NEXTJS_API',
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return {
            success: true,
            messageId: response,
            type: 'fcm_sent'
        };
    }
    catch (error) {
        console.error('❌ FCM CLOUD FUNCTION - Error sending OTP notification:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to send OTP notification', error instanceof Error ? error.message : 'Unknown error');
    }
});
// Send FCM notification for payment completion
exports.sendPaymentCompletionNotification = functions.https.onCall(async (request) => {
    var _a;
    try {
        console.log('🚀 FCM CLOUD FUNCTION TRIGGERED - sendPaymentCompletionNotification');
        console.log('📥 Full request object:', JSON.stringify(request, null, 2));
        let data, context;
        if (request.data && typeof request.data === 'object') {
            // Callable function format
            data = request.data;
            context = request;
        }
        else if (request && typeof request === 'object' && !request.auth) {
            // Direct HTTP format
            data = request;
            context = { auth: null, rawRequest: { ip: 'unknown' } };
        }
        else {
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
        // Get retailer user details
        const retailerUsersQuery = await admin.firestore()
            .collection('retailerUsers')
            .where('retailerId', '==', data.retailerId)
            .limit(1)
            .get();
        if (retailerUsersQuery.empty) {
            throw new functions.https.HttpsError('not-found', `Retailer user not found for retailerId: ${data.retailerId}`);
        }
        const retailerUser = retailerUsersQuery.docs[0];
        const retailerUserId = retailerUser.id;
        // Get FCM token for retailer user
        const fcmToken = await getFCMTokenForUser(retailerUserId);
        if (!fcmToken) {
            console.warn('⚠️ FCM token not found for retailer user:', retailerUserId);
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
                priority: 'normal',
                notification: {
                    priority: 'default',
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
            sentBy: ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'NEXTJS_API',
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return {
            success: true,
            messageId: response,
            type: 'fcm_sent'
        };
    }
    catch (error) {
        console.error('❌ FCM CLOUD FUNCTION - Error sending payment completion notification:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to send payment completion notification', error instanceof Error ? error.message : 'Unknown error');
    }
});
// Send test FCM notification
exports.sendTestFCMNotification = functions.https.onCall(async (request) => {
    var _a;
    try {
        console.log('🚀 FCM CLOUD FUNCTION TRIGGERED - sendTestFCMNotification');
        let data, context;
        if (request.data && typeof request.data === 'object') {
            data = request.data;
            context = request;
        }
        else if (request && typeof request === 'object' && !request.auth) {
            data = request;
            context = { auth: null, rawRequest: { ip: 'unknown' } };
        }
        else {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid request format');
        }
        if (!((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
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
                priority: 'normal',
                notification: {
                    priority: 'default',
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
    }
    catch (error) {
        console.error('❌ FCM CLOUD FUNCTION - Error sending test notification:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to send test notification', error instanceof Error ? error.message : 'Unknown error');
    }
});
// Generate OTP function
exports.generateOTP = functions.https.onCall(async (request) => {
    try {
        console.log('🚀 CLOUD FUNCTION TRIGGERED - generateOTP');
        console.log('📥 Full request object:', JSON.stringify(request, null, 2));
        let data, context;
        if (request.data && typeof request.data === 'object') {
            // Callable function format
            data = request.data;
            context = request;
        }
        else if (request && typeof request === 'object' && !request.auth) {
            // Direct HTTP format
            data = request;
            context = { auth: null, rawRequest: { ip: 'unknown' } };
        }
        else {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid request format');
        }
        console.log('📤 Extracted data:', JSON.stringify(data, null, 2));
        // Input validation
        if (!data.retailerId || typeof data.retailerId !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing retailerId');
        }
        if (!data.paymentId || typeof data.paymentId !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing paymentId');
        }
        if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid amount');
        }
        if (!data.lineWorkerName || typeof data.lineWorkerName !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid or missing lineWorkerName');
        }
        console.log('🔐 OTP Generation Request:', {
            retailerId: data.retailerId,
            paymentId: data.paymentId,
            amount: data.amount,
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
            throw new functions.https.HttpsError('not-found', `Retailer user not found for retailerId: ${data.retailerId}`);
        }
        const retailerUser = retailerUsersQuery.docs[0].data();
        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpId = `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const expiresAt = new Date(Date.now() + 7 * 60 * 1000); // 7 minutes
        console.log('🔐 Generated OTP:', {
            otpId,
            otp: otp.substring(0, 2) + '****', // Log partially for security
            expiresAt: expiresAt.toISOString(),
            retailerId: data.retailerId,
            paymentId: data.paymentId
        });
        // Store OTP in retailer document for persistence
        try {
            const retailerRef = admin.firestore().collection('retailers').doc(data.retailerId);
            const otpDocumentData = {
                paymentId: data.paymentId,
                code: otp,
                amount: data.amount,
                lineWorkerName: data.lineWorkerName,
                expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
                createdAt: admin.firestore.Timestamp.now(),
                isUsed: false,
                otpId: otpId
            };
            await retailerRef.update({
                activeOTPs: admin.firestore.FieldValue.arrayUnion(otpDocumentData)
            });
            console.log('✅ OTP stored in retailer document');
        }
        catch (firestoreError) {
            console.error('❌ Error storing OTP in retailer document:', firestoreError);
            // Don't fail the request if storage fails
        }
        return {
            success: true,
            otpId: otpId,
            code: otp,
            expiresAt: expiresAt.toISOString(),
            retailerName: retailerUser.name,
            retailerPhone: retailerUser.phone
        };
    }
    catch (error) {
        console.error('❌ CLOUD FUNCTION - Error generating OTP:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to generate OTP', error instanceof Error ? error.message : 'Unknown error');
    }
});
// HTTP version of generateOTP for direct API calls
exports.generateOTPHTTP = functions.https.onRequest(async (req, res) => {
    try {
        console.log('🚀 HTTP CLOUD FUNCTION TRIGGERED - generateOTPHTTP');
        console.log('📥 Request method:', req.method);
        console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        const data = req.body;
        // Input validation
        if (!data.retailerId || typeof data.retailerId !== 'string') {
            res.status(400).json({ error: 'Invalid or missing retailerId' });
            return;
        }
        if (!data.paymentId || typeof data.paymentId !== 'string') {
            res.status(400).json({ error: 'Invalid or missing paymentId' });
            return;
        }
        if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
            res.status(400).json({ error: 'Invalid amount' });
            return;
        }
        if (!data.lineWorkerName || typeof data.lineWorkerName !== 'string') {
            res.status(400).json({ error: 'Invalid or missing lineWorkerName' });
            return;
        }
        console.log('🔐 HTTP OTP Generation Request:', {
            retailerId: data.retailerId,
            paymentId: data.paymentId,
            amount: data.amount,
            lineWorkerName: data.lineWorkerName
        });
        // Get retailer user details
        const retailerUsersQuery = await admin.firestore()
            .collection('retailerUsers')
            .where('retailerId', '==', data.retailerId)
            .limit(1)
            .get();
        if (retailerUsersQuery.empty) {
            res.status(404).json({ error: `Retailer user not found for retailerId: ${data.retailerId}` });
            return;
        }
        const retailerUser = retailerUsersQuery.docs[0].data();
        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpId = `otp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const expiresAt = new Date(Date.now() + 7 * 60 * 1000); // 7 minutes
        console.log('🔐 Generated OTP via HTTP:', {
            otpId,
            otp: otp.substring(0, 2) + '****', // Log partially for security
            expiresAt: expiresAt.toISOString(),
            retailerId: data.retailerId,
            paymentId: data.paymentId
        });
        // Store OTP in retailer document for persistence
        try {
            const retailerRef = admin.firestore().collection('retailers').doc(data.retailerId);
            const otpDocumentData = {
                paymentId: data.paymentId,
                code: otp,
                amount: data.amount,
                lineWorkerName: data.lineWorkerName,
                expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
                createdAt: admin.firestore.Timestamp.now(),
                isUsed: false,
                otpId: otpId
            };
            await retailerRef.update({
                activeOTPs: admin.firestore.FieldValue.arrayUnion(otpDocumentData)
            });
            console.log('✅ HTTP OTP stored in retailer document');
        }
        catch (firestoreError) {
            console.error('❌ Error storing HTTP OTP in retailer document:', firestoreError);
            // Don't fail the request if storage fails
        }
        const response = {
            success: true,
            otpId: otpId,
            code: otp,
            expiresAt: expiresAt.toISOString(),
            retailerName: retailerUser.name,
            retailerPhone: retailerUser.phone
        };
        console.log('✅ HTTP OTP generation successful');
        res.status(200).json(response);
        return;
    }
    catch (error) {
        console.error('❌ HTTP CLOUD FUNCTION - Error generating OTP:', error);
        res.status(500).json({
            error: 'Failed to generate OTP',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
        return;
    }
});
//# sourceMappingURL=index.js.map