# 🔧 Complete FCM & Firebase Configuration Setup Guide

## Overview

This guide covers all the FCM (Firebase Cloud Messaging) and Firebase configuration keys needed for the pHLynk application.

## 📍 Configuration Files Location

### 1. Main Application
- **File**: `.env.local` (in root directory)
- **Template**: `.env.example` (for reference)

### 2. Firebase Functions  
- **File**: `functions/.env` (in functions directory)

---

## 🔑 Required Keys & Where to Get Them

### 1. Firebase Web App Configuration

**Where to get**: Firebase Console > Project Settings > General > Your apps

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCdOIhLQh9iYBXbE7dre2J9zsmCBuVdwwU
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=plkapp-8c052.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=plkapp-8c052
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=plkapp-8c052.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=333526318951
NEXT_PUBLIC_FIREBASE_APP_ID=1:333526318951:web:a8f30f497e7060e264b9c2
```

### 2. Firebase Service Account (Server-side)

**Option A: FIREBASE_CONFIG (Recommended)**
```bash
# Download service account key from Firebase Console
# Firebase Console > Project Settings > Service accounts > Generate new private key
# Convert the JSON file to a single line string and add to FIREBASE_CONFIG
```

**Option B: Individual Environment Variables**
```env
FIREBASE_SERVICE_ACCOUNT_TYPE=service_account
FIREBASE_SERVICE_ACCOUNT_PROJECT_ID=plkapp-8c052
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID=YOUR_PRIVATE_KEY_ID
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_CONTENT\n-----END PRIVATE KEY-----
FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL=firebase-adminsdk-xxxxx@plkapp-8c052.iam.gserviceaccount.com
FIREBASE_SERVICE_ACCOUNT_CLIENT_ID=YOUR_CLIENT_ID
FIREBASE_SERVICE_ACCOUNT_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_SERVICE_ACCOUNT_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_SERVICE_ACCOUNT_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_SERVICE_ACCOUNT_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40plkapp-8c052.iam.gserviceaccount.com
FIREBASE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN=googleapis.com
```

### 3. FCM VAPID Key (Web Push Notifications)

**Where to get**: Firebase Console > Project Settings > Cloud Messaging > Web configuration

```env
NEXT_PUBLIC_FCM_VAPID_KEY=YOUR_VAPID_PUBLIC_KEY_HERE
```

**Steps to generate**:
1. Go to Firebase Console > Project Settings > Cloud Messaging
2. Scroll to "Web configuration" section
3. Click "Generate key pair" if not already generated
4. Copy the public key

### 4. FCM Server Key (Legacy)

**Where to get**: Firebase Console > Project Settings > Cloud Messaging > Server key

```env
FCM_SERVER_KEY=YOUR_FCM_SERVER_KEY_HERE
```

**Note**: This is legacy and optional. Firebase Admin SDK is preferred.

### 5. Fast2SMS Configuration

**Where to get**: Fast2SMS Dashboard > API

```env
# Main Application (.env.local)
fast2sms_api_key=YOUR_FAST2SMS_API_KEY_HERE
entityid=YOUR_FAST2SMS_ENTITY_ID_HERE

# Firebase Functions (functions/.env)
FAST2SMS_API_KEY=YOUR_FAST2SMS_API_KEY_HERE
FAST2SMS_SENDER_ID=SNSYST
FAST2SMS_ENTITY_ID=YOUR_FAST2SMS_ENTITY_ID_HERE
```

### 6. NextAuth Configuration

```env
NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET_HERE
NEXTAUTH_URL=http://localhost:3000
```

---

## 🚀 Setup Instructions

### Step 1: Firebase Console Setup

1. **Select Project**: Ensure you're using `plkapp-8c052`
2. **Web App**: Register your web app if not already done
3. **Service Account**: Download service account key
4. **Cloud Messaging**: Generate VAPID key pair
5. **Copy Server Key**: Note the legacy server key (optional)

### Step 2: Environment Configuration

1. **Main Application**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual credentials
   ```

2. **Firebase Functions**:
   ```bash
   cd functions
   # Edit .env with your actual credentials
   ```

### Step 3: Service Account Setup

**Option A: Single FIREBASE_CONFIG (Recommended)**
```bash
# Download service account JSON from Firebase Console
# Convert to single line and escape quotes
cat service-account-key.json | jq -c tostring
# Add the result to FIREBASE_CONFIG
```

**Option B: Individual Variables**
```bash
# Extract values from service account JSON
# Add each field to corresponding FIREBASE_SERVICE_ACCOUNT_* variable
```

### Step 4: Test Configuration

```bash
# Test main application
npm run dev

# Test Firebase Functions
cd functions
npm run build
firebase emulators:start --only functions
```

---

## 🔍 Configuration Validation

### Main Application Validation
Visit: `http://localhost:3000/api/security/firebase-admin-status`

### Firebase Functions Validation
```bash
firebase functions:config:get  # Should be empty after migration
firebase deploy --only functions
```

---

## ⚠️ Security Notes

1. **Never commit `.env.local` to version control**
2. **Use different values for development and production**
3. **Rotate API keys regularly**
4. **Monitor Firebase Console for unusual activity**
5. **Keep service account keys secure**

---

## 🐛 Troubleshooting

### Common Issues

1. **FCM Token Generation Failed**
   - Check VAPID key is correct
   - Ensure service worker is registered
   - Verify notification permissions

2. **Firebase Admin Initialization Failed**
   - Validate service account credentials
   - Check project ID matches
   - Ensure private key format is correct

3. **Fast2SMS API Errors**
   - Verify API key and entity ID
   - Check sender ID is approved
   - Ensure sufficient balance

4. **Functions Deployment Failed**
   - Check environment variables syntax
   - Validate all required fields are present
   - Ensure Firebase project is correct

### Debug Commands

```bash
# Check Firebase Admin status
curl http://localhost:3000/api/security/firebase-admin-status

# Test FCM token generation
curl http://localhost:3000/fcm-test

# Test Fast2SMS integration
curl -X POST http://localhost:3000/api/test-sms-config
```

---

## 📋 Configuration Checklist

- [ ] Firebase Web App credentials configured
- [ ] Service account key added (FIREBASE_CONFIG or individual vars)
- [ ] FCM VAPID key generated and added
- [ ] Fast2SMS API credentials configured
- [ ] NextAuth secret generated
- [ ] Database URL configured
- [ ] Firebase Functions environment configured
- [ ] Local testing successful
- [ ] Production deployment tested

---

## 🔄 Migration from Old Configuration

If you're migrating from `functions.config()`:

1. **Extract current config**:
   ```bash
   firebase functions:config:get
   ```

2. **Update environment variables**:
   - Move Fast2SMS config to `functions/.env`
   - Update main application `.env.local`

3. **Deploy and test**:
   ```bash
   firebase deploy --only functions
   ```

4. **Clean up old config** (optional):
   ```bash
   firebase functions:config:unset fast2sms
   ```

---

## 📞 Support

For issues:
1. Check Firebase Console for project status
2. Verify Fast2SMS account and API access
3. Review Firebase Functions logs
4. Check browser console for client-side errors