# 📱 FCM System Architecture & Workflow Explanation

## 🎯 Overview
Our FCM (Firebase Cloud Messaging) system is a complete push notification solution that handles OTP delivery, payment notifications, and other alerts to users' mobile devices. Here's how it works end-to-end.

## 🏗️ System Architecture

### Two Main Components:
1. **Client-Side FCM Manager** (`src/lib/fcm.ts`) - Handles token generation and message reception
2. **Server-Side FCM Service** (`src/lib/fcm-service.ts`) - Manages device registration and notification sending

---

## 🔄 Complete FCM Workflow

### 1. **Token Generation (Client-Side)**

#### When it happens:
- User opens the web app
- User logs in for the first time
- Token expires (every 30-60 days)
- User clears browser data

#### How it works:
```typescript
// src/lib/fcm.ts - getFCMToken()
export async function getFCMToken(): Promise<string | null> {
  // 1. Check if FCM is supported
  if (!isFCMSupported()) return null;
  
  // 2. Request notification permission
  await requestNotificationPermission();
  
  // 3. Register service worker
  const registration = await registerServiceWorker();
  
  // 4. Get Firebase Messaging instance
  const messaging = getMessagingInstance();
  
  // 5. Generate FCM token using VAPID key
  const token = await getFCMTokenFromFirebase(messaging, { 
    vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY 
  });
  
  return token;
}
```

#### Key Requirements:
- **Service Worker**: Must be registered at `/firebase-messaging-sw.js`
- **VAPID Key**: Required for web push notifications
- **Notification Permission**: User must grant permission
- **Firebase Config**: Project credentials must be configured

---

### 2. **Token Registration (Client → Server)**

#### When it happens:
- User successfully logs in
- Token is refreshed
- User revisits the app

#### How it works:
```typescript
// src/lib/fcm.ts - initializeFCM()
export async function initializeFCM(): Promise<string | null> {
  // 1. Get FCM token
  const token = await getFCMToken();
  
  // 2. Send to backend API
  const response = await fetch('/api/fcm/register-device', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      retailerId: auth.currentUser.uid,  // User ID
      deviceToken: token,                // FCM Token
      userAgent: navigator.userAgent      // Device info
    })
  });
  
  return token;
}
```

#### Data sent to server:
```json
{
  "retailerId": "user_123",
  "deviceToken": "fcm_token_string_here",
  "userAgent": "Mozilla/5.0..."
}
```

---

### 3. **Device Storage (Server-Side)**

#### Where tokens are stored:
```typescript
// src/lib/fcm-service.ts - registerDevice()
async registerDevice(retailerId: string, deviceToken: string, userAgent: string) {
  const device: FCMDevice = {
    token: deviceToken,
    userAgent,
    registeredAt: new Date(),
    lastActive: new Date()
  };

  // Store in user's document
  await updateDoc(retailerRef, { 
    fcmDevices: arrayUnion(device) 
  });
}
```

#### Database Structure:
```javascript
// Firestore Collection: retailers/tenants/users
{
  userId: "retailer_123",
  email: "retailer@example.com",
  fcmDevices: [                    // ← Array of devices
    {
      token: "fcm_token_1",        // FCM Token
      userAgent: "Chrome/Windows", // Device info
      registeredAt: "2024-01-15T10:30:00Z",
      lastActive: "2024-01-15T10:30:00Z"
    },
    {
      token: "fcm_token_2",        // Multiple devices supported
      userAgent: "Safari/iPhone",
      registeredAt: "2024-01-14T15:20:00Z", 
      lastActive: "2024-01-15T09:45:00Z"
    }
  ]
}
```

---

### 4. **User Type Collection Mapping**

#### Dynamic Collection Selection:
```typescript
// src/lib/fcm-service.ts - getCollectionName()
private getCollectionName(userType: string): string {
  switch (userType) {
    case 'retailer':
      return 'retailers';
    case 'wholesaler':
    case 'wholesaler_admin':
    case 'super_admin':
      return 'tenants';      // ← Admin users in tenants collection
    case 'line_worker':
      return 'users';        // ← Line workers in users collection
    default:
      throw new Error(`Unknown user type: ${userType}`);
  }
}
```

#### This allows:
- **Retailers** → `retailers` collection
- **Wholesalers/Admins** → `tenants` collection  
- **Line Workers** → `users` collection

---

### 5. **Notification Sending (Server-Side)**

#### When notifications are sent:
- OTP generation for payments
- Payment status updates
- System alerts
- Order updates

#### How OTP notifications work:
```typescript
// src/lib/fcm-service.ts - sendOTPViaFCM()
export async function sendOTPViaFCM(
  retailerId: string,
  otp: string,
  retailerName: string,
  paymentId?: string,
  amount?: number
) {
  const notification: FCMNotificationData = {
    title: '🔐 OTP Verification Required',
    body: `Your OTP code is: ${otp}`,
    data: {
      type: 'otp',
      otp: otp,
      retailerId,
      paymentId: paymentId || '',
      amount: amount?.toString() || '',
      retailerName
    },
    icon: '/icon-192x192.png',
    tag: `otp-${paymentId || Date.now()}`,
    clickAction: '/retailer/dashboard'
  };

  return await fcmService.sendNotificationToRetailer(retailerId, notification);
}
```

#### FCM API Call:
```typescript
// src/lib/fcm-service.ts - sendToDevice()
private async sendToDevice(deviceToken: string, notification: FCMNotificationData) {
  const message = {
    to: deviceToken,
    notification: {
      title: notification.title,
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      tag: notification.tag,
      click_action: notification.clickAction
    },
    data: notification.data || {},
    priority: 'high',
    timeToLive: 2419200 // 28 days
  };

  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${process.env.FCM_SERVER_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });
}
```

---

### 6. **Message Reception (Client-Side)**

#### Foreground Messages:
```typescript
// src/lib/fcm.ts - onMessageListener()
export function onMessageListener() {
  const messaging = getMessagingInstance();
  
  return new Promise((resolve) => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('📱 FCM foreground message received:', payload);
      
      // Handle OTP messages
      if (payload.data?.type === 'otp') {
        const otp = payload.data.otp;
        // Auto-fill OTP, show notification, etc.
      }
      
      resolve(payload);
    });
  });
}
```

#### Background Messages:
```javascript
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  // Firebase config
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  
  // Show notification
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: payload.notification.icon,
    data: payload.data
  });
});
```

---

## 🔧 Key Configuration

### Environment Variables:
```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FCM_VAPID_KEY=your_vapid_key
FCM_SERVER_KEY=your_server_key
```

### Service Worker:
```javascript
// public/firebase-messaging-sw.js
// Must be in public directory
// Handles background messages when app is closed
```

---

## 🛡️ Security & Best Practices

### Token Security:
- **Server Key**: Never expose FCM_SERVER_KEY on client-side
- **VAPID Key**: Only used on client-side for web push
- **Token Validation**: Always validate tokens server-side

### Error Handling:
```typescript
// Handle invalid tokens
if (result.error === 'UNREGISTERED' || result.error === 'INVALID_ARGUMENT') {
  await this.unregisterDevice(retailerId, device.token);
}
```

### Cleanup:
```typescript
// Clean up inactive devices older than 30 days
async cleanupInactiveDevices(userId: string, userType: string) {
  const devices = await this.getUserDevices(userId, userType);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const activeDevices = devices.filter(device => 
    new Date(device.lastActive) > thirtyDaysAgo
  );
  
  // Update with only active devices
  await updateDoc(userRef, { fcmDevices: activeDevices });
}
```

---

## 📊 Real-World OTP Flow Example

### Step-by-Step:

1. **User Initiates Payment**:
   ```typescript
   // Frontend calls payment API
   const response = await fetch('/api/payments/create', {
     method: 'POST',
     body: JSON.stringify({ amount: 1000, retailerId: 'retailer_123' })
   });
   ```

2. **Server Generates OTP**:
   ```typescript
   // /api/payments/create
   const otp = generateOTP();
   await saveOTP(phone, otp);
   
   // Send OTP via FCM
   await sendOTPViaFCM(retailerId, otp, retailerName, paymentId, amount);
   ```

3. **FCM Service Finds Devices**:
   ```typescript
   // Gets devices from retailers collection
   const devices = await this.getRetailerDevices(retailerId);
   // Returns: [{ token: "fcm_token_1", ... }, { token: "fcm_token_2", ... }]
   ```

4. **Sends to All Devices**:
   ```typescript
   for (const device of devices) {
     await this.sendToDevice(device.token, notification);
   }
   ```

5. **User Receives OTP**:
   ```typescript
   // Client receives message
   onMessage(messaging, (payload) => {
     if (payload.data?.type === 'otp') {
       const otp = payload.data.otp;
       // Auto-fill in UI
       document.getElementById('otp-input').value = otp;
     }
   });
   ```

---

## 🚀 Advanced Features

### Multi-Device Support:
- Users can have multiple devices registered
- Notifications sent to all active devices
- Inactive devices automatically cleaned up

### User Type Flexibility:
- Dynamic collection mapping
- Supports retailers, wholesalers, line workers, admins
- Each user type stored in appropriate collection

### Fallback Mechanisms:
- Invalid tokens automatically removed
- Failed sends logged for monitoring
- SMS fallback for critical OTPs

### Performance Optimization:
- Batch operations for multiple devices
- Automatic cleanup of old tokens
- Efficient device querying

---

## 🔍 Monitoring & Debugging

### Log Examples:
```
✅ FCM token obtained successfully
✅ Device registered with FCM backend
📱 FCM foreground message received: { type: 'otp', otp: '123456' }
✅ Notification sent to 2 device(s), 0 failed
🧹 Cleaned up 1 inactive devices for retailer retailer_123
```

### Common Issues:
1. **No Token**: Check VAPID key and notification permission
2. **No Devices**: Verify user authentication and token registration
3. **Send Failed**: Check FCM_SERVER_KEY and network connectivity
4. **Token Invalid**: Automatic cleanup handles this

---

## 📝 Summary

Our FCM system provides:
- **Reliable OTP delivery** via push notifications
- **Multi-device support** for each user
- **Dynamic user type handling** with proper collection mapping
- **Automatic cleanup** of invalid/inactive tokens
- **Robust error handling** and monitoring
- **Security best practices** with proper key management

The system ensures that OTP codes and other critical notifications reach users instantly through their registered devices, with fallback mechanisms and comprehensive error handling for production reliability.