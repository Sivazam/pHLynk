# 🔥 Firebase Functions Deployment Guide

## ✅ Problem Fixed
The ES module conflict has been resolved by:
1. Removing `"type": "module"` from `functions/package.json`
2. Updating `firebase-functions` to v5.1.0 (latest)
3. Keeping TypeScript config as CommonJS (`"module": "commonjs"`)

## 🚀 Deployment Steps

### 1. Install Updated Dependencies
```bash
cd functions
npm install
```

### 2. Build the Functions
```bash
npm run build
```

### 3. Deploy to Firebase
```bash
firebase deploy --only functions
```

## 📋 Full Deployment Commands

```bash
# Navigate to functions directory
cd functions

# Install updated dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Deploy to Firebase
firebase deploy --only functions

# Verify deployment
firebase functions:log
```

## 🔧 What Was Fixed

### Before (❌ Broken):
```json
{
  "type": "module",  // ← This caused the conflict
  "firebase-functions": "^4.9.0"  // ← Old version
}
```

### After (✅ Fixed):
```json
{
  // "type": "module" removed
  "firebase-functions": "^5.1.0"  // ← Updated to latest
}
```

## 🎯 Expected Output

After running `firebase deploy --only functions`, you should see:

```
=== Deploying to 'plkapp-8c052'...

i  deploying functions
Running command: npm --prefix "$RESOURCE_DIR" run build

> build
> tsc

+  functions: Finished running predeploy script.
i  functions: preparing codebase default for deployment
i  functions: ensuring required API cloudfunctions.googleapis.com is enabled...
i  functions: Loading and analyzing source code for codebase default to determine what to deploy
i  functions: found the following functions:
    - sendRetailerPaymentSMS
    - sendWholesalerPaymentSMS
    - sendOTPNotification
    - sendFCMOTPNotification
    - sendTestFCMNotification
    - sendPaymentCompletionNotification
    - sendFCMNotification
    - processSMSResponse

✅ Deploy complete!

Function URL (sendFCMOTPNotification): https://us-central1-plkapp-8c052.cloudfunctions.net/sendFCMOTPNotification
```

## 🧪 Test Your Functions

After deployment, test your functions:

```bash
# Test FCM OTP function
curl -X POST https://us-central1-plkapp-8c052.cloudfunctions.net/sendFCMOTPNotification \
  -H "Content-Type: application/json" \
  -d '{
    "retailerId": "test-retailer-id",
    "otp": "123456",
    "amount": 1000,
    "paymentId": "test-payment-id",
    "lineWorkerName": "Test Worker"
  }'
```

## 🔍 Environment Variables

Make sure your `functions/.env` file is configured:

```env
FIREBASE_PROJECT_ID=plkapp-8c052
FAST2SMS_API_KEY=YOUR_FAST2SMS_API_KEY_HERE
FAST2SMS_SENDER_ID=SNSYST
FAST2SMS_ENTITY_ID=YOUR_FAST2SMS_ENTITY_ID_HERE
```

## 📞 Troubleshooting

If you still get errors:

1. **Clear build cache:**
   ```bash
   rm -rf lib/
   npm run build
   ```

2. **Check Node version:**
   ```bash
   node --version  # Should be 20+
   ```

3. **Verify Firebase CLI:**
   ```bash
   firebase --version  # Should be 12+
   ```

4. **Check logs:**
   ```bash
   firebase functions:log
   ```

## ✅ Success Criteria

- [ ] Functions build without errors
- [ ] Deployment completes successfully
- [ ] All functions are listed in deployment output
- [ ] Test calls return responses (not errors)

Your Firebase Functions should now deploy successfully! 🎉