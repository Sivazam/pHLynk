"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processSMSResponse = exports.sendWholesalerPaymentSMS = exports.sendRetailerPaymentSMS = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
require("dotenv/config");
// Initialize Firebase Admin
admin.initializeApp();
// SMS Notification Functions
exports.sendRetailerPaymentSMS = functions.https.onCall(async (data, context) => {
    try {
        // Validate authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
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
            throw new functions.https.HttpsError('not-found', 'Retailer user not found');
        }
        const retailerUser = retailerUsersQuery.docs[0].data();
        if (!retailerUser.phone) {
            throw new functions.https.HttpsError('failed-precondition', 'Retailer phone number not found');
        }
        // Format phone number
        const formattedPhone = retailerUser.phone.replace(/\D/g, '');
        // Prepare SMS variables
        const variablesValues = [
            data.amount.toString(),
            retailerUser.name || data.retailerName,
            retailerUser.address || data.retailerArea,
            data.lineWorkerName,
            data.wholesalerName,
            data.collectionDate
        ];
        const formattedVariables = variablesValues.join('%7C'); // URL-encoded pipe character
        // Get Fast2SMS configuration from environment variables
        const fast2smsApiKey = process.env.FAST2SMS_API_KEY;
        const senderId = 'SNSYST';
        const messageId = '199054'; // RetailerNotify template ID
        const entityId = '1707175912558362799'; // Entity ID from DLT
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
    try {
        // Validate authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
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
            throw new functions.https.HttpsError('not-found', 'Retailer not found');
        }
        const retailerData = retailerDoc.data();
        if (!retailerData) {
            throw new functions.https.HttpsError('failed-precondition', 'Retailer data not found');
        }
        // Find line worker assigned to this retailer
        const lineWorkerQuery = await admin.firestore()
            .collection('users')
            .where('assignedAreas', 'array-contains', retailerData.areaId)
            .where('roles', 'array-contains', 'LINE_WORKER')
            .limit(1)
            .get();
        if (lineWorkerQuery.empty) {
            throw new functions.https.HttpsError('not-found', 'Line worker not found for this retailer');
        }
        const lineWorkerDoc = lineWorkerQuery.docs[0];
        const lineWorkerData = lineWorkerDoc.data();
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
        // Format phone number
        const formattedPhone = wholesalerData.phone.replace(/\D/g, '');
        // Prepare SMS variables
        const variablesValues = [
            data.amount.toString(),
            data.retailerName,
            data.retailerArea,
            data.lineWorkerName,
            data.wholesalerName,
            data.collectionDate
        ];
        const formattedVariables = variablesValues.join('%7C'); // URL-encoded pipe character
        // Get Fast2SMS configuration from environment variables
        const fast2smsApiKey = process.env.FAST2SMS_API_KEY;
        const senderId = 'SNSYST';
        const messageId = '199055'; // WholeSalerNotify template ID
        const entityId = '1707175912581282302'; // Entity ID from DLT
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
    try {
        // Validate authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
        }
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