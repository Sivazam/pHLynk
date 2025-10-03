# OTP Notification Function Deployment Guide

## Problem Fixed
The OTP notification function was failing because it couldn't find the correct FCM token for retailers. The function was only trying one approach to find the user ID.

## Solution Implemented
Updated `sendOTPNotificationHTTP` function to try multiple approaches to find the retailer's FCM token:

1. **Document ID approach**: Uses the retailer document ID as the user ID
2. **Phone number approach**: Uses the retailer's phone number as the user ID  
3. **User ID field approach**: Uses the `userId` field from the retailer document

## Deployment Steps

### 1. Deploy Cloud Functions
```bash
cd /home/z/my-project/functions
npx firebase login
npx firebase use pharmalync-retailer-app
npx firebase deploy --only functions
```

### 2. Test the Function
After deployment, test the function using:
```bash
curl -X POST https://us-central1-pharmalync-retailer-app.cloudfunctions.net/sendOTPNotificationHTTP \
  -H "Content-Type: application/json" \
  -d '{
    "retailerId": "test-retailer-id",
    "otp": "123456",
    "amount": 1500,
    "paymentId": "test-payment-123",
    "lineWorkerName": "Test Line Worker"
  }'
```

### 3. Monitor Function Logs
```bash
npx firebase functions:log
```

## Expected Behavior

### Success Response
```json
{
  "success": true,
  "messageId": "fcm-message-id",
  "type": "fcm_sent"
}
```

### Fallback Response (when FCM token not found)
```json
{
  "success": false,
  "error": "FCM token not found",
  "fallbackToSMS": true,
  "details": {
    "triedDocumentId": "retailer-doc-id",
    "triedPhone": "1234567890",
    "triedUserId": "user-id-if-available"
  }
}
```

## Frontend Integration
The frontend should:
1. Try FCM notification first
2. If `fallbackToSMS` is true, fall back to SMS notification
3. Log the detailed error information for debugging

## Monitoring
Check these logs for debugging:
- `🔧 Trying document ID as user ID:`
- `🔧 Trying phone number as user ID:`
- `🔧 Trying retailer.userId as user ID:`
- `✅ Found FCM token for retailer using:`
- `⚠️ FCM token not found for retailer after all approaches:`

## Troubleshooting
1. If all approaches fail, check if retailer data is correctly structured
2. Verify FCM tokens are being saved to the `users` collection
3. Check if retailer documents have the required fields (phone, userId)
4. Monitor Firestore collection names and document IDs