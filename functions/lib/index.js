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
exports.sendFCMNotification = exports.sendTestFCMNotification = exports.sendPaymentCompletionNotification = exports.sendOTPNotification = exports.processSMSResponse = exports.sendWholesalerPaymentSMS = exports.sendRetailerPaymentSMS = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Initialize Firebase Admin with service account JSON file
function getServiceAccountConfig() {
    var _a;
    try {
        // Try to read from service-account.json file in the functions directory
        const serviceAccountPath = path.join(__dirname, '../service-account.json');
        console.log('🔧 Looking for service account file at:', serviceAccountPath);
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccountFile = fs.readFileSync(serviceAccountPath, 'utf8');
            const serviceAccount = JSON.parse(serviceAccountFile);
            console.log('✅ Using service account from service-account.json file');
            return serviceAccount;
        }
        else {
            console.warn('⚠️ service-account.json file not found, falling back to environment variables');
        }
    }
    catch (error) {
        console.warn('⚠️ Failed to read service-account.json file, falling back to environment variables:', error);
    }
    // Fallback to environment variables (APP_* format)
    if (process.env.APP_FIREBASE_CONFIG) {
        try {
            const config = JSON.parse(process.env.APP_FIREBASE_CONFIG);
            console.log('✅ Using APP_FIREBASE_CONFIG from environment');
            return config;
        }
        catch (error) {
            console.warn('⚠️ Failed to parse APP_FIREBASE_CONFIG, falling back to individual variables');
        }
    }
    // Fallback to individual variables
    const serviceAccount = {
        type: process.env.APP_SERVICE_ACCOUNT_TYPE || 'service_account',
        project_id: process.env.APP_SERVICE_ACCOUNT_PROJECT_ID,
        private_key_id: process.env.APP_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
        private_key: (_a = process.env.APP_SERVICE_ACCOUNT_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n'),
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
}
else {
    // Fallback to default initialization (uses GOOGLE_APPLICATION_CREDENTIALS)
    admin.initializeApp();
    console.log('⚠️ Firebase Admin initialized with default credentials');
}
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
    // Use environment variables instead of deprecated functions.config()
    const fast2smsApiKey = process.env.FAST2SMS_API_KEY;
    const senderId = process.env.FAST2SMS_SENDER_ID || 'SNSYST';
    const entityId = process.env.FAST2SMS_ENTITY_ID;
    if (!fast2smsApiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Fast2SMS API key not configured in environment variables');
    }
    if (!entityId) {
        throw new functions.https.HttpsError('failed-precondition', 'Fast2SMS entity ID not configured in environment variables');
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
async function getFCMTokenForUser(userId, collection = 'users') {
    var _a;
    try {
        console.log(`🔧 Looking for FCM token for user ${userId} in collection: ${collection}`);
        const userDoc = await admin.firestore().collection(collection).doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            console.log(`📱 Found user document in ${collection}, checking FCM devices...`);
            // Check for fcmDevices array first (new structure)
            const fcmDevices = (userData === null || userData === void 0 ? void 0 : userData.fcmDevices) || [];
            if (fcmDevices.length > 0) {
                // Return the most recently active device token
                const activeDevice = fcmDevices.reduce((latest, device) => {
                    var _a, _b, _c, _d;
                    const deviceTime = ((_b = (_a = device.lastActive) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || new Date(0);
                    const latestTime = ((_d = (_c = latest === null || latest === void 0 ? void 0 : latest.lastActive) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || new Date(0);
                    return deviceTime > latestTime ? device : latest;
                }, fcmDevices[0]);
                console.log(`✅ Found ${fcmDevices.length} FCM devices in ${collection}, using most recent:`, ((_a = activeDevice.token) === null || _a === void 0 ? void 0 : _a.substring(0, 20)) + '...');
                return activeDevice.token || null;
            }
            // Fallback to single fcmToken field (old structure)
            if (userData === null || userData === void 0 ? void 0 : userData.fcmToken) {
                console.log(`✅ Found single FCM token in ${collection} (old structure):`, userData.fcmToken.substring(0, 20) + '...');
                return userData.fcmToken;
            }
            console.log(`❌ No FCM devices found for user in ${collection}`);
        }
        else {
            console.log(`❌ User document not found in ${collection}`);
        }
        return null;
    }
    catch (error) {
        console.error('❌ Error getting FCM token for user:', userId, 'in collection:', collection, error);
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
        // Create FCM message with proper icons and bold OTP
        const message = {
            notification: {
                title: '🔐 Payment OTP Required',
                body: `Your OTP code is: **${data.otp}** for ₹${data.amount.toLocaleString()} by ${data.lineWorkerName}`,
            },
            data: {
                type: 'otp',
                otp: data.otp,
                amount: data.amount.toString(),
                paymentId: data.paymentId,
                retailerId: data.retailerId,
                lineWorkerName: data.lineWorkerName,
                tag: `otp-${data.paymentId}`,
                requireInteraction: 'true',
                clickAction: '/retailer/dashboard'
            },
            token: fcmToken,
            android: {
                priority: 'high',
                notification: {
                    priority: 'high',
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
                    title: '🔐 Payment OTP Required',
                    body: `Your OTP code is: **${data.otp}** for ₹${data.amount.toLocaleString()} by ${data.lineWorkerName}`,
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
            recipientType: data.recipientType || 'retailer',
            caller: context.auth ? context.auth.uid : 'NEXTJS_API'
        });
        // Get FCM token for recipient (retailer or wholesaler)
        let fcmToken = null;
        let recipientUserId = null;
        if (data.recipientType === 'wholesaler') {
            // For wholesaler, look in users collection (wholesaler admin users)
            console.log('🔧 Looking for FCM token for wholesaler:', data.retailerId);
            const wholesalerUsersQuery = await admin.firestore()
                .collection('users')
                .where('tenantId', '==', data.retailerId) // retailerId is actually wholesalerId for wholesaler notifications
                .where('roles', 'array-contains', 'WHOLESALER_ADMIN')
                .limit(1)
                .get();
            if (wholesalerUsersQuery.empty) {
                throw new functions.https.HttpsError('not-found', `Wholesaler admin not found for tenantId: ${data.retailerId}`);
            }
            const wholesalerUser = wholesalerUsersQuery.docs[0];
            recipientUserId = wholesalerUser.id;
            fcmToken = await getFCMTokenForUser(recipientUserId);
            console.log('📱 Found wholesaler user:', wholesalerUser.id);
        }
        else {
            // For retailer, use existing logic
            console.log('🔧 Looking for FCM token for retailer:', data.retailerId);
            const retailerUsersQuery = await admin.firestore()
                .collection('retailerUsers')
                .where('retailerId', '==', data.retailerId)
                .limit(1)
                .get();
            if (retailerUsersQuery.empty) {
                throw new functions.https.HttpsError('not-found', `Retailer user not found for retailerId: ${data.retailerId}`);
            }
            const retailerUser = retailerUsersQuery.docs[0];
            recipientUserId = retailerUser.id;
            fcmToken = await getFCMTokenForUser(recipientUserId, 'retailerUsers');
            console.log('📱 Found retailer user:', retailerUser.id);
        }
        if (!fcmToken) {
            console.warn(`⚠️ FCM token not found for ${data.recipientType || 'retailer'} user:`, recipientUserId);
            return {
                success: false,
                error: 'FCM token not found',
                recipientType: data.recipientType || 'retailer',
                fallbackToSMS: true
            };
        }
        // Create FCM message with custom content and proper icons
        const message = {
            notification: {
                title: data.title || '✅ Payment Completed',
                body: data.body || `Payment of ₹${data.amount.toLocaleString()} completed successfully`,
            },
            data: {
                type: 'payment_completed',
                amount: data.amount.toString(),
                paymentId: data.paymentId,
                retailerId: data.retailerId,
                recipientType: data.recipientType || 'retailer',
                retailerName: data.retailerName,
                lineWorkerName: data.lineWorkerName,
                tag: `payment-${data.paymentId}`,
                requireInteraction: 'false',
                clickAction: data.clickAction || '/retailer/payment-history'
            },
            token: fcmToken,
            android: {
                priority: 'high', // High priority as requested
                notification: {
                    priority: 'high',
                    defaultSound: true,
                    clickAction: data.clickAction || '/retailer/payment-history',
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
                    title: data.title || '✅ Payment Completed',
                    body: data.body || `Payment of ₹${data.amount.toLocaleString()} completed successfully`,
                    icon: '/notification-large-192x192.png',
                    badge: '/badge-72x72.png',
                    tag: `payment-${data.paymentId}`,
                    requireInteraction: false,
                    actions: [
                        {
                            action: 'view',
                            title: 'View Payment'
                        }
                    ]
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
            userId: recipientUserId,
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
// FCM Notification Function
exports.sendFCMNotification = functions.https.onCall(async (request) => {
    try {
        console.log('🚀 CLOUD FUNCTION TRIGGERED - sendFCMNotification');
        console.log('📥 Full request object:', JSON.stringify(request, null, 2));
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
        // Get retailer document
        const retailerDoc = await admin.firestore()
            .collection('retailers')
            .doc(retailerId)
            .get();
        if (!retailerDoc.exists) {
            throw new functions.https.HttpsError('not-found', `Retailer not found: ${retailerId}`);
        }
        const retailerData = retailerDoc.data();
        const fcmDevices = (retailerData === null || retailerData === void 0 ? void 0 : retailerData.fcmDevices) || [];
        if (fcmDevices.length === 0) {
            console.log('⚠️ No FCM devices found for retailer:', retailerId);
            return {
                success: false,
                message: 'No devices registered for this retailer',
                deviceCount: 0
            };
        }
        console.log(`📱 Found ${fcmDevices.length} FCM devices for retailer`);
        // Filter active devices (last active within 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const activeDevices = fcmDevices.filter((device) => {
            var _a, _b;
            const lastActive = ((_b = (_a = device.lastActive) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || new Date(device.lastActive);
            return lastActive > thirtyDaysAgo;
        });
        console.log(`📱 ${activeDevices.length} active devices after filtering`);
        if (activeDevices.length === 0) {
            return {
                success: false,
                message: 'No active devices found for this retailer',
                deviceCount: 0
            };
        }
        // Prepare notification message with proper icons
        const message = {
            notification: {
                title: notification.title,
                body: notification.body,
                icon: notification.icon || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/notification-large-192x192.png`,
                image: notification.image || null, // Optional large image
                badge: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/badge-72x72.png`
            },
            data: Object.assign(Object.assign({}, notification.data), { icon: notification.icon || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/notification-large-192x192.png`, badge: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/badge-72x72.png`, tag: notification.tag, clickAction: notification.clickAction }),
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    clickAction: notification.clickAction,
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
                fcm_options: {
                    image: notification.image || `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/notification-large-192x192.png`
                }
            }
        };
        let successCount = 0;
        let failureCount = 0;
        const results = [];
        // Send to each device
        for (const device of activeDevices) {
            try {
                console.log(`📤 Sending to device: ${device.token.substring(0, 20)}...`);
                const deviceMessage = Object.assign(Object.assign({}, message), { token: device.token });
                const response = await admin.messaging().send(deviceMessage);
                console.log(`✅ Message sent successfully: ${response}`);
                successCount++;
                results.push({
                    token: device.token.substring(0, 20) + '...',
                    success: true,
                    messageId: response
                });
            }
            catch (error) {
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
                    }
                    catch (removeError) {
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
    }
    catch (error) {
        console.error('❌ CLOUD FUNCTION - Error sending FCM notification:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to send FCM notification', error instanceof Error ? error.message : 'Unknown error');
    }
});
//# sourceMappingURL=index.js.map