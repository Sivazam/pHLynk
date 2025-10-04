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
exports.sendFCMOTPNotification = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin with environment variables
// Use the new APP_* variable names to avoid Firebase reserved prefixes
function getServiceAccountConfig() {
    var _a;
    // Try complete JSON config first
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
// Enhanced FCM token lookup for retailer users
async function getFCMTokenForRetailerUser(userId) {
    var _a;
    try {
        console.log('🔧 Looking for FCM token for retailer user:', userId);
        const retailerUserDoc = await admin.firestore().collection('retailerUsers').doc(userId).get();
        if (retailerUserDoc.exists) {
            const userData = retailerUserDoc.data();
            console.log('📱 Found retailer user, checking FCM devices...');
            // Check for fcmDevices array
            const fcmDevices = (userData === null || userData === void 0 ? void 0 : userData.fcmDevices) || [];
            if (fcmDevices.length > 0) {
                // Return the most recently active device token
                const activeDevice = fcmDevices.reduce((latest, device) => {
                    var _a, _b, _c, _d;
                    const deviceTime = ((_b = (_a = device.lastActive) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) || new Date(0);
                    const latestTime = ((_d = (_c = latest === null || latest === void 0 ? void 0 : latest.lastActive) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c)) || new Date(0);
                    return deviceTime > latestTime ? device : latest;
                }, fcmDevices[0]);
                console.log(`✅ Found ${fcmDevices.length} FCM devices, using most recent:`, ((_a = activeDevice.token) === null || _a === void 0 ? void 0 : _a.substring(0, 20)) + '...');
                return activeDevice.token || null;
            }
            // Fallback to single fcmToken field
            if (userData === null || userData === void 0 ? void 0 : userData.fcmToken) {
                console.log('✅ Found single FCM token (old structure)');
                return userData.fcmToken;
            }
            console.log('❌ No FCM devices found for retailer user');
        }
        else {
            console.log('❌ Retailer user document not found');
        }
        return null;
    }
    catch (error) {
        console.error('❌ Error getting FCM token for retailer user:', userId, error);
        return null;
    }
}
// New FCM OTP notification function
exports.sendFCMOTPNotification = functions.https.onCall(async (request) => {
    var _a;
    try {
        console.log('🚀 NEW FCM OTP FUNCTION TRIGGERED');
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
            throw new functions.https.HttpsError('not-found', `Retailer user not found for retailerId: ${data.retailerId}`);
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
        console.error('❌ NEW FCM OTP FUNCTION - Error sending OTP notification:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to send OTP notification', error instanceof Error ? error.message : 'Unknown error');
    }
});
console.log('✅ New FCM OTP notification function loaded');
//# sourceMappingURL=fcm-otp-notification.js.map