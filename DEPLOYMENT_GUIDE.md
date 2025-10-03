# 🚀 PWA Notification System Deployment Guide

## 📋 Overview
This guide will help you deploy the complete PWA notification system using **Database Triggers (Option 1)** + **FCM Integration (Option 3)**.

## 🔧 Prerequisites
- Firebase project with Firestore
- Firebase Functions CLI installed
- Node.js and npm installed
- FCM configuration already set up

## 📁 Files to Deploy

### 1. Database Triggers (`cloud-functions-database-triggers.js`)
This file contains the Firestore triggers that will automatically send notifications when:
- New payments are created (sends OTP)
- Payments are updated (sends completion/failed notifications)
- New invoices are created (sends invoice notifications)

### 2. Updated FCM Registration
Your existing FCM registration has been enhanced to support multiple user types.

### 3. Enhanced Role-Based Notification Service
Updated to automatically register device tokens for push notifications.

## 🚀 Deployment Steps

### Step 1: Deploy Database Triggers

```bash
# 1. Navigate to your Firebase project directory
cd your-firebase-project

# 2. Copy the database triggers file
cp /path/to/cloud-functions-database-triggers.js functions/index.js

# 3. Install dependencies
cd functions
npm install firebase-admin

# 4. Deploy the functions
firebase deploy --only functions
```

### Step 2: Update Firestore Security Rules

Add these rules to your Firestore database to allow the functions to work:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Payments collection
    match /Payments/{paymentId} {
      allow read, write: if request.auth != null;
    }
    
    // FCM tokens collection
    match /fcmTokens/{tokenId} {
      allow read, write: if request.auth != null;
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Retailers collection
    match /Retailers/{retailerId} {
      allow read, write: if request.auth != null;
    }
    
    // Users collection
    match /Users/{userId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 3: Update Environment Variables

Make sure these environment variables are set in your Firebase Functions:

```bash
# In your functions/.env file
FIREBASE_PROJECT_ID=pharmalynkk
FCM_SERVER_KEY=your_fcm_server_key
```

### Step 4: Test the System

1. **Deploy your updated Next.js app** with the enhanced notification service
2. **Visit**: `http://your-domain.com/test-notifications`
3. **Test notification permissions** and device registration
4. **Create a test payment** in your Firestore database
5. **Check if notifications are received**

## 📱 Testing Checklist

### ✅ Browser Notifications
- [ ] Permission granted
- [ ] Direct notifications work
- [ ] Service worker notifications work

### ✅ FCM Integration
- [ ] Device token registered
- [ ] Background notifications work
- [ ] App closed notifications work

### ✅ Database Triggers
- [ ] Payment creation triggers OTP
- [ ] Payment update triggers completion
- [ ] Invoice creation triggers notification

## 🔍 Debugging

### Check Cloud Function Logs
```bash
firebase functions:log
```

### Check FCM Registration
```javascript
// In browser console
localStorage.getItem('user')
localStorage.getItem('retailerId')
```

### Test Database Triggers
Create a test payment in Firestore:
```javascript
// In Firebase Console or Firestore SDK
{
  retailerId: "test-retailer-id",
  lineWorkerId: "test-worker-id",
  amount: 100,
  state: "PENDING",
  requiresOTP: true,
  otp: "123456",
  createdAt: new Date()
}
```

## 🎯 Expected Behavior

### When Payment is Created:
1. Database trigger fires
2. OTP notification sent to retailer via FCM
3. Line worker gets payment initiated notification

### When Payment is Completed:
1. Database trigger fires
2. Completion notification sent to retailer and line worker
3. Real-time updates in app

### When App is Closed:
1. FCM delivers notification to device
2. Service worker shows notification
3. User can tap to open app

## 🚨 Common Issues

### Issue: No FCM Tokens
**Solution**: Ensure users grant notification permission and device token is registered

### Issue: Functions Not Triggering
**Solution**: Check Firestore security rules and function deployment

### Issue: Notifications Not Received
**Solution**: Check device notification settings and FCM configuration

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Review Firebase function logs
3. Test with the `/test-notifications` page
4. Verify Firestore database structure

## 🎉 Success Indicators

✅ Users receive OTP notifications when payments are created  
✅ Users receive completion notifications when payments are completed  
✅ Notifications work when app is closed (background)  
✅ All user types (retailer, line worker, wholesaler) receive relevant notifications  
✅ Cloud Functions show request counts in Firebase Console  

You're all set! Your PWA notification system should now work automatically with database triggers.