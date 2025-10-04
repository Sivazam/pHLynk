# 🚀 pHLynk Firebase Migration Guide
## From firebase-functions.config() to Environment Variables

### 📋 Overview
This guide will help you migrate pHLynk from `firebase-functions.config()` to modern environment variables, switching from project `pharmalynkk` to `plkapp-8c052`.

### 🎯 Objectives
- ✅ Switch to Firebase project `plkapp-8c052`
- ✅ Replace hardcoded Firebase config with environment variables
- ✅ Implement secure Firebase Admin SDK approach
- ✅ Maintain full FCM and SMS functionality
- ✅ Ensure no credential exposure to client-side

---

## 🔧 Step 1: Firebase Console Setup

### 1.1 Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `plkapp-8c052`
3. Navigate to **Project Settings**

### 1.2 Get Web App Configuration
1. Go to **Web Apps** section
2. Find your web app or create a new one
3. Copy the Firebase configuration:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCdOIhLQh9iYBXbE7dre2J9zsmCBuVdwwU",
  authDomain: "plkapp-8c052.firebaseapp.com",
  projectId: "plkapp-8c052",
  storageBucket: "plkapp-8c052.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

### 1.3 Generate Service Account Key
1. Go to **Service Accounts** section
2. Click **"Generate new private key"**
3. Download the JSON file
4. **⚠️ IMPORTANT**: Keep this file secure and never commit to git

### 1.4 Get FCM Configuration
1. Go to **Cloud Messaging** section
2. **⚠️ NOTE**: FCM Server Key is deprecated and no longer needed
3. Generate **Web Push certificates** for VAPID key:
   ```bash
   npx firebase-tools messaging:vapid-keys:create
   ```
4. The service account JSON will handle all server-side FCM operations

---

## 🔐 Step 2: Environment Configuration

### 2.1 Main Application Configuration
Create `.env.local` in your project root:

```bash
# Copy the template
cp .env.example .env.local
```

Fill in the actual values:

```env
# Firebase Client Configuration (Browser Safe)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCdOIhLQh9iYBXbE7dre2J9zsmCBuVdwwU
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=plkapp-8c052.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=plkapp-8c052
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=plkapp-8c052.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID

# Firebase Admin SDK (Choose ONE option)

# Option 1: Complete JSON (Recommended)
FIREBASE_CONFIG={"type":"service_account","project_id":"plkapp-8c052","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"..."}

# Option 2: Individual variables
FIREBASE_SERVICE_ACCOUNT_PROJECT_ID=plkapp-8c052
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL=firebase-adminsdk-xxxxx@plkapp-8c052.iam.gserviceaccount.com

# FCM Configuration
NEXT_PUBLIC_FCM_VAPID_KEY=YOUR_VAPID_PUBLIC_KEY

# Note: FCM Server Key is deprecated and no longer needed
# Firebase Admin SDK with service account JSON handles all server-side FCM operations

# Fast2SMS
FAST2SMS_API_KEY=YOUR_FAST2SMS_API_KEY
FAST2SMS_ENTITY_ID=YOUR_ENTITY_ID
```

### 2.2 Firebase Functions Configuration
Update `functions/.env`:

```env
# Firebase Project
FIREBASE_PROJECT_ID=plkapp-8c052

# Service Account (same as main app)
FIREBASE_SERVICE_ACCOUNT_PROJECT_ID=plkapp-8c052
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL=firebase-adminsdk-xxxxx@plkapp-8c052.iam.gserviceaccount.com

# Fast2SMS
FAST2SMS_API_KEY=YOUR_FAST2SMS_API_KEY
FAST2SMS_SENDER_ID=SNSYST
FAST2SMS_ENTITY_ID=YOUR_ENTITY_ID

# Note: FCM Server Key is deprecated - Firebase Admin SDK handles all FCM operations
```

---

## 🧩 Step 3: Code Implementation

### 3.1 Firebase Admin SDK Initialization
The Firebase Admin SDK is already configured to use environment variables:

```typescript
// src/lib/firebase-admin.ts
// ✅ Already updated to use plkapp-8c052
// ✅ Supports both FIREBASE_CONFIG and individual variables
// ✅ Secure server-side initialization
```

### 3.2 Client-Side Firebase Configuration
Update your client Firebase config:

```typescript
// src/lib/firebase.ts
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};
```

---

## 🔍 Step 4: Verification & Testing

### 4.1 Create Configuration Test Endpoint
Create `src/app/api/test-config/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { checkFirebaseAdminStatus } from '@/lib/firebase-admin';

export async function GET() {
  const status = checkFirebaseAdminStatus();
  
  return NextResponse.json({
    success: true,
    firebase: status,
    environment: {
      hasClientConfig: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      hasServerConfig: !!process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    }
  });
}
```

### 4.2 Test Configuration
Visit `http://localhost:3000/api/test-config` to verify:

```json
{
  "success": true,
  "firebase": {
    "initialized": true,
    "hasCredentials": true,
    "source": "environment_variables"
  },
  "environment": {
    "hasClientConfig": true,
    "hasServerConfig": true,
    "projectId": "plkapp-8c052"
  }
}
```

---

## 🚀 Step 5: Deployment

### 5.1 Deploy Firebase Functions
```bash
# Navigate to functions directory
cd functions

# Deploy with environment variables
firebase deploy --only functions
```

### 5.2 Deploy Next.js Application
```bash
# Build and deploy
npm run build
npm run deploy
```

---

## 🔒 Security Best Practices

### ✅ What's Secure
- **Server-side credentials**: Never exposed to browser
- **Environment variables**: Not committed to version control
- **Firebase Admin SDK**: Server-only initialization
- **Service account keys**: Stored securely in environment

### ⚠️ Security Reminders
1. **NEVER** commit `.env.local` to git
2. **ALWAYS** use different keys for dev/prod
3. **NEVER** expose service account keys to client
4. **ALWAYS** validate environment variables on startup
5. **USE** Firebase security rules for data protection

---

## 🧪 Testing Checklist

### ✅ Pre-Deployment Tests
- [ ] Firebase Admin SDK initializes successfully
- [ ] Client Firebase config loads correctly
- [ ] FCM tokens can be generated
- [ ] Push notifications work
- [ ] SMS sending via Fast2SMS works
- [ ] All API endpoints function properly

### ✅ Post-Deployment Tests
- [ ] Production environment variables loaded
- [ ] Firebase Functions execute without errors
- [ ] End-to-end notification flow works
- [ ] SMS delivery works in production
- [ ] No credential exposure in browser

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 1. Firebase Admin Initialization Error
```bash
Error: Missing required Firebase service account fields: private_key, client_email, project_id
```
**Solution**: Check environment variables in `.env.local`

#### 2. FCM VAPID Key Error
```bash
Error: Invalid VAPID key
```
**Solution**: Generate new VAPID key with Firebase CLI

#### 1. Firebase Admin Initialization Error
```bash
Error: Missing required Firebase service account fields: private_key, client_email, project_id
```
**Solution**: Check environment variables in `.env.local`

#### 2. Fast2SMS API Error
```bash
Error: Invalid API key
```
**Solution**: Verify Fast2SMS credentials in both `.env.local` and `functions/.env`

#### 3. FCM VAPID Key Error
```bash
Error: Invalid VAPID key
```
**Solution**: Generate new VAPID key with Firebase CLI

#### 4. Service Account JSON Error
```bash
Error: Invalid service account configuration
```
**Solution**: Ensure service account JSON is properly formatted and escaped

#### 5. Project ID Mismatch
```bash
Error: Project plkapp-8c052 not found
```
**Solution**: Ensure all configs use `plkapp-8c052`

---

## 📞 Support

### Resources
- [Firebase Documentation](https://firebase.google.com/docs)
- [Fast2SMS API Docs](https://www.fast2sms.com/docs)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

### Validation Commands
```bash
# Test Firebase configuration
curl http://localhost:3000/api/test-config

# Check environment variables
npm run dev

# Lint code
npm run lint
```

---

## ✅ Migration Complete!

Once you've completed these steps:
1. ✅ Switched to `plkapp-8c052` project
2. ✅ Replaced hardcoded config with environment variables
3. ✅ Implemented secure Firebase Admin SDK
4. ✅ Maintained full FCM and SMS functionality
5. ✅ Ensured no credential exposure

Your pHLynk application is now running with modern, secure configuration! 🎉