import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// SMS Notification Cloud Function - Retailer Payment Confirmation
export const sendRetailerPaymentSMS = functions.https.onCall(async (data, context) => {
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
    
    if (!retailerId || !paymentId || !amount || !retailerName || !retailerArea || !wholesalerName || !collectionDate) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields for SMS notification'
      );
    }

    console.log('📤 CLOUD FUNCTION - Retailer SMS Notification Request:', {
      retailerId,
      paymentId,
      amount,
      lineWorkerName: lineWorkerName || 'Line Worker',
      retailerName,
      retailerArea,
      wholesalerName,
      collectionDate,
      uid: context.auth.uid
    });

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

    // Get Fast2SMS configuration from environment
    const fast2smsApiKey = process.env.fast2sms_api_key || process.env.FAST2SMS_API_KEY;
    const senderId = process.env.fast2sms_sender_id || process.env.FAST2SMS_SENDER_ID || 'SNSYST';
    const entityId = process.env.fast2sms_entity_id || process.env.ENTITY_ID;

    if (!fast2smsApiKey) {
      console.log('⚠️ Fast2SMS not configured - logging SMS details only');
      console.log('📱 Would send SMS to:', retailerUser.phone);
      console.log('📝 Template: Retailer Payment Confirmation');
      console.log('📝 Variables:', { amount, retailerName, retailerArea, wholesalerName, lineWorkerName: lineWorkerName || 'Line Worker', collectionDate });
      
      return {
        success: true,
        message: 'SMS notification logged in development mode',
        phoneNumber: retailerUser.phone,
        template: 'Retailer Payment Confirmation'
      };
    }

    // Format phone number for Fast2SMS
    const formattedPhone = retailerUser.phone.startsWith('+91') 
      ? retailerUser.phone.substring(3) 
      : retailerUser.phone.startsWith('91') 
      ? retailerUser.phone.substring(2) 
      : retailerUser.phone;

    // Format variables for Fast2SMS API - RetailerNotify template
    // "Collection Acknowledgement: An amount of {#var#}/- from {#var#}, {#var#} has been updated in PharmaLync as payment towards goods supplied by {#var#}. Collected by Line man {#var#} on {#var#}. — SAANVI SYSTEMS"
    const variablesValues = [
      amount.toString(),           // {#var#} - payment amount
      retailerName,               // {#var#} - retailer name
      retailerArea,               // {#var#} - retailer area
      wholesalerName,             // {#var#} - wholesaler name (goods supplied by)
      lineWorkerName || 'Line Worker', // {#var#} - line worker name
      collectionDate              // {#var#} - collection date
    ];
    
    const formattedVariables = variablesValues.join('%7C'); // URL-encoded pipe character

    // Fast2SMS Message ID for RetailerNotify template
    const messageId = '199054';

    // Construct Fast2SMS API URL
    const entityIdParam = entityId ? `&entity_id=${entityId}` : '';
    const apiUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${fast2smsApiKey}&route=dlt&sender_id=${senderId}&message=${messageId}&variables_values=${formattedVariables}&flash=0&numbers=${formattedPhone}${entityIdParam}`;

    console.log('📤 Sending SMS via Fast2SMS to retailer:', {
      phoneNumber: formattedPhone,
      template: 'Retailer Payment Confirmation',
      variables: { amount, retailerName, retailerArea, wholesalerName, lineWorkerName: lineWorkerName || 'Line Worker', collectionDate }
    });

    // Make API call to Fast2SMS
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    const data = await response.json();
    
    if (data.return && data.request_id) {
      console.log('✅ SMS sent successfully to retailer:', {
        requestId: data.request_id,
        messages: data.message
      });
      
      // Log SMS notification in Firestore
      await admin.firestore().collection('smsNotifications').add({
        type: 'RETAILER_PAYMENT_CONFIRMATION',
        retailerId,
        paymentId,
        phoneNumber: formattedPhone,
        amount,
        retailerName,
        retailerArea,
        wholesalerName,
        lineWorkerName: lineWorkerName || 'Line Worker',
        collectionDate,
        messageId: data.request_id,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        sentBy: context.auth.uid
      });
      
      return {
        success: true,
        message: 'SMS notification sent successfully to retailer',
        requestId: data.request_id,
        phoneNumber: formattedPhone
      };
    } else {
      console.error('❌ Fast2SMS API error:', data);
      return {
        success: false,
        message: 'Failed to send SMS notification',
        error: data.message?.join(', ') || 'Unknown error'
      };
    }

  } catch (error) {
    console.error('❌ CLOUD FUNCTION - Error sending retailer SMS:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to send SMS notification',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

// SMS Notification Cloud Function - Wholesaler Payment Update
export const sendWholesalerPaymentSMS = functions.https.onCall(async (data, context) => {
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
    
    if (!retailerId || !paymentId || !amount || !retailerName || !retailerArea || !wholesalerName || !collectionDate) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields for SMS notification'
      );
    }

    console.log('📤 CLOUD FUNCTION - Wholesaler SMS Notification Request:', {
      retailerId,
      paymentId,
      amount,
      lineWorkerName: lineWorkerName || 'Line Worker',
      retailerName,
      retailerArea,
      wholesalerName,
      collectionDate,
      uid: context.auth.uid
    });

    // Get wholesaler admin details
    const wholesalerUsersQuery = await admin.firestore()
      .collection('users')
      .where('roles', 'array-contains', 'WHOLESALER_ADMIN')
      .limit(1)
      .get();

    if (wholesalerUsersQuery.empty) {
      throw new functions.https.HttpsError(
        'not-found',
        'Wholesaler admin not found'
      );
    }

    const wholesalerUser = wholesalerUsersQuery.docs[0].data();
    
    if (!wholesalerUser.phone) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Wholesaler phone number not found'
      );
    }

    // Get Fast2SMS configuration from environment
    const fast2smsApiKey = process.env.fast2sms_api_key || process.env.FAST2SMS_API_KEY;
    const senderId = process.env.fast2sms_sender_id || process.env.FAST2SMS_SENDER_ID || 'SNSYST';
    const entityId = process.env.fast2sms_entity_id || process.env.ENTITY_ID;

    if (!fast2smsApiKey) {
      console.log('⚠️ Fast2SMS not configured - logging SMS details only');
      console.log('📱 Would send SMS to:', wholesalerUser.phone);
      console.log('📝 Template: Wholesaler Payment Update');
      console.log('📝 Variables:', { amount, retailerName, retailerArea, lineWorkerName: lineWorkerName || 'Line Worker', wholesalerName, collectionDate });
      
      return {
        success: true,
        message: 'SMS notification logged in development mode',
        phoneNumber: wholesalerUser.phone,
        template: 'Wholesaler Payment Update'
      };
    }

    // Format phone number for Fast2SMS
    const formattedPhone = wholesalerUser.phone.startsWith('+91') 
      ? wholesalerUser.phone.substring(3) 
      : wholesalerUser.phone.startsWith('91') 
      ? wholesalerUser.phone.substring(2) 
      : wholesalerUser.phone;

    // Format variables for Fast2SMS API - WholeSalerNotify template
    // "Payment Update: {#var#}/- has been recorded in the PharmaLync system from {#var#}, {#var#}. Collected by Line man {#var#} on behalf of {#var#} on {#var#}. — SAANVI SYSTEMS."
    const variablesValues = [
      amount.toString(),           // {#var#} - payment amount
      retailerName,               // {#var#} - retailer name
      retailerArea,               // {#var#} - retailer area
      lineWorkerName || 'Line Worker', // {#var#} - line worker name
      wholesalerName,             // {#var#} - wholesaler name (on behalf of)
      collectionDate              // {#var#} - collection date
    ];
    
    const formattedVariables = variablesValues.join('%7C'); // URL-encoded pipe character

    // Fast2SMS Message ID for WholeSalerNotify template
    const messageId = '199055';

    // Construct Fast2SMS API URL
    const entityIdParam = entityId ? `&entity_id=${entityId}` : '';
    const apiUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${fast2smsApiKey}&route=dlt&sender_id=${senderId}&message=${messageId}&variables_values=${formattedVariables}&flash=0&numbers=${formattedPhone}${entityIdParam}`;

    console.log('📤 Sending SMS via Fast2SMS to wholesaler:', {
      phoneNumber: formattedPhone,
      template: 'Wholesaler Payment Update',
      variables: { amount, retailerName, retailerArea, lineWorkerName: lineWorkerName || 'Line Worker', wholesalerName, collectionDate }
    });

    // Make API call to Fast2SMS
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    const data = await response.json();
    
    if (data.return && data.request_id) {
      console.log('✅ SMS sent successfully to wholesaler:', {
        requestId: data.request_id,
        messages: data.message
      });
      
      // Log SMS notification in Firestore
      await admin.firestore().collection('smsNotifications').add({
        type: 'WHOLESALER_PAYMENT_UPDATE',
        retailerId,
        paymentId,
        phoneNumber: formattedPhone,
        amount,
        retailerName,
        retailerArea,
        wholesalerName,
        lineWorkerName: lineWorkerName || 'Line Worker',
        collectionDate,
        messageId: data.request_id,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        sentBy: context.auth.uid
      });
      
      return {
        success: true,
        message: 'SMS notification sent successfully to wholesaler',
        requestId: data.request_id,
        phoneNumber: formattedPhone
      };
    } else {
      console.error('❌ Fast2SMS API error:', data);
      return {
        success: false,
        message: 'Failed to send SMS notification',
        error: data.message?.join(', ') || 'Unknown error'
      };
    }

  } catch (error) {
    console.error('❌ CLOUD FUNCTION - Error sending wholesaler SMS:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to send SMS notification',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});

// Security Alert SMS Cloud Function
export const sendSecurityAlertSMS = functions.https.onCall(async (data, context) => {
  try {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    // Validate input data
    const { retailerId, lineWorkerName, consecutiveFailures } = data;
    
    if (!retailerId || !lineWorkerName || !consecutiveFailures) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields for security alert'
      );
    }

    console.log('🚨 CLOUD FUNCTION - Security Alert SMS Request:', {
      retailerId,
      lineWorkerName,
      consecutiveFailures,
      uid: context.auth.uid
    });

    // Get retailer details to find wholesaler
    const retailerDoc = await admin.firestore().collection('retailers').doc(retailerId).get();
    if (!retailerDoc.exists) return;

    const retailerData = retailerDoc.data();
    if (!retailerData) return;
    
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
            // Get Fast2SMS configuration from environment
            const fast2smsApiKey = process.env.fast2sms_api_key || process.env.FAST2SMS_API_KEY;
            const senderId = process.env.fast2sms_sender_id || process.env.FAST2SMS_SENDER_ID || 'SNSYST';
            const entityId = process.env.fast2sms_entity_id || process.env.ENTITY_ID;

            if (!fast2smsApiKey) {
              console.log('⚠️ Fast2SMS not configured - logging security alert only');
              console.log('🚨 Would send security alert to:', wholesalerData.phone);
              console.log('📝 Line Worker:', lineWorkerName);
              console.log('📝 Consecutive Failures:', consecutiveFailures);
              
              return {
                success: true,
                message: 'Security alert logged in development mode',
                lineWorkerName,
                consecutiveFailures
              };
            }

            // Format phone number for Fast2SMS
            const formattedPhone = wholesalerData.phone.startsWith('+91') 
              ? wholesalerData.phone.substring(3) 
              : wholesalerData.phone.startsWith('91') 
              ? wholesalerData.phone.substring(2) 
              : wholesalerData.phone;

            // Security alert template (placeholder - replace with actual Fast2SMS message ID)
            const messageId = '198234'; // TODO: Replace with actual Fast2SMS security alert message ID
            
            // Variables for security alert
            const variablesValues = [lineWorkerName].join('%7C');

            // Construct Fast2SMS API URL
            const entityIdParam = entityId ? `&entity_id=${entityId}` : '';
            const apiUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${fast2smsApiKey}&route=dlt&sender_id=${senderId}&message=${messageId}&variables_values=${variablesValues}&flash=0&numbers=${formattedPhone}${entityIdParam}`;

            console.log('🚨 Sending security alert SMS via Fast2SMS:', {
              phoneNumber: formattedPhone,
              lineWorkerName,
              consecutiveFailures
            });

            // Make API call to Fast2SMS
            const response = await fetch(apiUrl, {
              method: 'GET',
              headers: {
                'Cache-Control': 'no-cache'
              }
            });

            const data = await response.json();
            
            if (data.return && data.request_id) {
              console.log('✅ Security alert sent successfully:', {
                requestId: data.request_id,
                messages: data.message
              });
              
              // Log security alert in Firestore
              await admin.firestore().collection('securityAlerts').add({
                type: 'OTP_BRUTE_FORCE',
                retailerId,
                lineWorkerName,
                consecutiveFailures,
                phoneNumber: formattedPhone,
                messageId: data.request_id,
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                sentBy: context.auth.uid
              });
              
              return {
                success: true,
                message: 'Security alert sent successfully',
                requestId: data.request_id,
                phoneNumber: formattedPhone
              };
            } else {
              console.error('❌ Fast2SMS API error for security alert:', data);
              return {
                success: false,
                message: 'Failed to send security alert',
                error: data.message?.join(', ') || 'Unknown error'
              };
            }
          }
        }
      }
    }

    return {
      success: true,
      message: 'Security alert processed',
      lineWorkerName,
      consecutiveFailures
    };

  } catch (error) {
    console.error('❌ CLOUD FUNCTION - Error sending security alert:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to send security alert',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
});