# 🔥 Firebase Functions Environment Variables Fix

## ✅ Problem Solved
Firebase Functions has reserved prefixes (`FIREBASE_`, `X_GOOGLE_`, `EXT_`) that cannot be used in environment variables. I've updated the variable names to avoid these conflicts.

## 🔄 Variable Name Changes

### Before (❌ Reserved Prefixes):
```env
FIREBASE_PROJECT_ID=plkapp-8c052
FIREBASE_CONFIG={"type":"service_account",...}
FIREBASE_SERVICE_ACCOUNT_PROJECT_ID=plkapp-8c052
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL=...
```

### After (✅ Non-Reserved Prefixes):
```env
APP_PROJECT_ID=plkapp-8c052
APP_FIREBASE_CONFIG={"type":"service_account",...}
APP_SERVICE_ACCOUNT_PROJECT_ID=plkapp-8c052
APP_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
APP_SERVICE_ACCOUNT_CLIENT_EMAIL=...
```

## 📁 Files Updated

### 1. `functions/.env`
- Changed all `FIREBASE_*` variables to `APP_*`
- Kept Fast2SMS variables unchanged (they're not reserved)

### 2. `.env.example` (Next.js)
- Kept `FIREBASE_*` variables (Next.js doesn't have these restrictions)
- Added note about difference with Firebase Functions

## 🚀 Deploy Now

```bash
cd functions

# Your functions/.env should now look like this:
# APP_PROJECT_ID=plkapp-8c052
# APP_FIREBASE_CONFIG={"type":"service_account",...}
# FAST2SMS_API_KEY=YOUR_API_KEY
# FAST2SMS_SENDER_ID=SNSYST
# FAST2SMS_ENTITY_ID=YOUR_ENTITY_ID

# Deploy to Firebase
firebase deploy --only functions
```

## 🎯 Expected Success Output

```
=== Deploying to 'plkapp-8c052'...

i  deploying functions
Running command: npm --prefix "$RESOURCE_DIR" run build

> build
> tsc

+  functions: Finished running predeploy script.
i  functions: preparing codebase default for deployment
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

## 🔧 What You Need to Do

1. **Update your `functions/.env`** with the actual values:
   ```env
   APP_PROJECT_ID=plkapp-8c052
   APP_FIREBASE_CONFIG={"type":"service_account","project_id":"plkapp-8c052",...}
   FAST2SMS_API_KEY=your_actual_fast2sms_key
   FAST2SMS_ENTITY_ID=your_actual_entity_id
   ```

2. **Deploy the functions:**
   ```bash
   cd functions
   firebase deploy --only functions
   ```

## 📋 Important Notes

- **Next.js app** can still use `FIREBASE_*` variables (no restrictions)
- **Firebase Functions** must use `APP_*` variables (avoid reserved prefixes)
- **Fast2SMS variables** work the same in both environments
- **No code changes needed** - Firebase Admin SDK auto-detects the environment

Your Firebase Functions should now deploy successfully! 🎉