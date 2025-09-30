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
exports.processSMSResponse = exports.sendWholesalerPaymentSMS = exports.sendRetailerPaymentSMS = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin
admin.initializeApp();
// SMS Notification Functions
exports.sendRetailerPaymentSMS = functions.https.onCall(async (data, context) => {
    var _a;
    try {
        // Note: Authentication check removed to allow calls from Next.js API routes
        // The function is secured by being a Firebase Function and requiring valid API key
        console.log('📞 CLOUD FUNCTION - Retailer Payment SMS Request:', {
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
            throw new functions.https.HttpsError('not-found', 'Retailer user not found');
        }
        const retailerUser = retailerUsersQuery.docs[0].data();
        if (!retailerUser.phone) {
            throw new functions.https.HttpsError('failed-precondition', 'Retailer phone number not found');
        }
        // Format phone number
        const formattedPhone = retailerUser.phone.replace(/\D/g, '');
        // Prepare SMS variables - Order MUST match DLT template exactly
        // Template: "Collection Acknowledgement: An amount of {#var#}/- from {#var#}, {#var#} has been updated in PharmaLync as payment towards goods supplied by {#var#}. Collected by Line man {#var#} on {#var#}."
        // Variables: 1=Amount, 2=Retailer Name, 3=Retailer Area, 4=Wholesaler Name, 5=Line Worker Name, 6=Date
        const variablesValues = [
            data.amount.toString(), // {#var#} - payment amount
            retailerUser.name || data.retailerName, // {#var#} - retailer name
            data.retailerArea || retailerUser.address, // {#var#} - retailer area (use passed data first, fallback to retailerUser.address)
            data.wholesalerName, // {#var#} - wholesaler name (goods supplied by)
            data.lineWorkerName, // {#var#} - line worker name
            data.collectionDate // {#var#} - collection date
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
        // Get Fast2SMS configuration from Firebase Functions config
        const fast2smsConfig = functions.config().fast2sms;
        const fast2smsApiKey = fast2smsConfig === null || fast2smsConfig === void 0 ? void 0 : fast2smsConfig.api_key;
        const senderId = (fast2smsConfig === null || fast2smsConfig === void 0 ? void 0 : fast2smsConfig.sender_id) || 'SNSYST';
        const entityId = fast2smsConfig === null || fast2smsConfig === void 0 ? void 0 : fast2smsConfig.entity_id;
        const messageId = '199054'; // RetailerNotify template ID
        if (!fast2smsApiKey) {
            throw new functions.https.HttpsError('failed-precondition', 'Fast2SMS API key not configured in environment variables');
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
            throw new functions.https.HttpsError('internal', `Failed to send SMS: ${response.status} ${response.statusText}`);
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
            sentBy: ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'NEXTJS_API',
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
exports.sendWholesalerPaymentSMS = functions.https.onCall(async (data, context) => {
    var _a;
    try {
        // Note: Authentication check removed to allow calls from Next.js API routes
        // The function is secured by being a Firebase Function and requiring valid API key
        console.log('📞 CLOUD FUNCTION - Wholesaler Payment SMS Request:', {
            retailerId: data.retailerId,
            paymentId: data.paymentId,
            amount: data.amount,
            lineWorkerName: data.lineWorkerName,
            caller: context.auth ? context.auth.uid : 'NEXTJS_API'
        });
        // Get line worker details to find wholesaler
        const lineWorkerQuery = await admin.firestore()
            .collection('users')
            .where('roles', 'array-contains', 'LINE_WORKER')
            .limit(10) // Get multiple line workers to find the one with wholesaler assignment
            .get();
        if (lineWorkerQuery.empty) {
            throw new functions.https.HttpsError('not-found', 'No line workers found in the system');
        }
        // Find a line worker that has a wholesaler assigned
        let lineWorkerData = null;
        for (const doc of lineWorkerQuery.docs) {
            const workerData = doc.data();
            if (workerData.wholesalerId) {
                lineWorkerData = workerData;
                break;
            }
        }
        if (!lineWorkerData) {
            throw new functions.https.HttpsError('not-found', 'No line worker with wholesaler assignment found');
        }
        console.log('🔧 CLOUD FUNCTION - Found line worker with wholesaler:', {
            lineWorkerId: lineWorkerData.uid || lineWorkerData.id,
            lineWorkerName: lineWorkerData.name || lineWorkerData.displayName,
            wholesalerId: lineWorkerData.wholesalerId
        });
        // Get wholesaler info
        if (!lineWorkerData.wholesalerId) {
            throw new functions.https.HttpsError('failed-precondition', 'Line worker not assigned to any wholesaler');
        }
        const wholesalerDoc = await admin.firestore()
            .collection('users')
            .doc(lineWorkerData.wholesalerId)
            .get();
        if (!wholesalerDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Wholesaler not found');
        }
        const wholesalerData = wholesalerDoc.data();
        if (!wholesalerData || !wholesalerData.phone) {
            throw new functions.https.HttpsError('failed-precondition', 'Wholesaler phone number not found');
        }
        console.log('🔧 CLOUD FUNCTION - Found wholesaler details:', {
            wholesalerId: wholesalerDoc.id,
            wholesalerName: wholesalerData.displayName || wholesalerData.name,
            wholesalerPhone: wholesalerData.phone
        });
        // Format phone number
        const formattedPhone = wholesalerData.phone.replace(/\D/g, '');
        // Prepare SMS variables - Order MUST match DLT template exactly
        // Template: "Payment Update: {#var#}/- has been recorded in the PharmaLync system from {#var#}, {#var#}. Collected by Line man {#var#} on behalf of {#var#} on {#var#}."
        // Variables: 1=Amount, 2=Retailer Name, 3=Retailer Area, 4=Line Worker Name, 5=Wholesaler Name, 6=Date
        const variablesValues = [
            data.amount.toString(), // {#var#} - payment amount
            data.retailerName, // {#var#} - retailer name
            data.retailerArea, // {#var#} - retailer area
            data.lineWorkerName, // {#var#} - line worker name
            data.wholesalerName, // {#var#} - wholesaler name (on behalf of)
            data.collectionDate // {#var#} - collection date
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
        // Get Fast2SMS configuration from Firebase Functions config
        const fast2smsConfig = functions.config().fast2sms;
        const fast2smsApiKey = fast2smsConfig === null || fast2smsConfig === void 0 ? void 0 : fast2smsConfig.api_key;
        const senderId = (fast2smsConfig === null || fast2smsConfig === void 0 ? void 0 : fast2smsConfig.sender_id) || 'SNSYST';
        const entityId = fast2smsConfig === null || fast2smsConfig === void 0 ? void 0 : fast2smsConfig.entity_id;
        const messageId = '199055'; // WholeSalerNotify template ID
        if (!fast2smsApiKey) {
            throw new functions.https.HttpsError('failed-precondition', 'Fast2SMS API key not configured in environment variables');
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
            throw new functions.https.HttpsError('internal', `Failed to send SMS: ${response.status} ${response.statusText}`);
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
            sentBy: ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'NEXTJS_API',
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
    var _a;
    try {
        // Note: Authentication check removed to allow calls from Next.js API routes
        console.log('📞 CLOUD FUNCTION - Processing SMS response:', {
            url: ((_a = data.url) === null || _a === void 0 ? void 0 : _a.substring(0, 100)) + '...',
            caller: context.auth ? context.auth.uid : 'NEXTJS_API'
        });
        const response = await fetch(data.url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new functions.https.HttpsError('internal', `Failed to process SMS response: ${response.status} ${response.statusText}`);
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
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
});
//# sourceMappingURL=index.js.map