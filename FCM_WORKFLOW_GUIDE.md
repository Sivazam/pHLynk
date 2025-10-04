# FCM (Firebase Cloud Messaging) Workflow Guide

## 📋 Overview
FCM is a cross-platform messaging solution that lets you reliably deliver messages at no cost. In our system, we use FCM to send OTP notifications and other alerts to users' mobile devices.

## 🔄 Complete FCM Workflow

### 1. Token Generation (Client-Side)

#### When: App Initialization & Token Refresh
```typescript
// Mobile App (React Native/Flutter/Android/iOS)
// This runs when:
// - App is first installed
// - App is opened after being closed
// - Token expires (typically 30-60 days)
// - User clears app data

import { getMessaging, getToken } from 'firebase/messaging';

// Initialize Firebase
const messaging = getMessaging();

// Generate FCM Token
const generateFCMToken = async () => {
  try {
    // Request permission first (required for iOS)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: 'YOUR_VAPID_KEY' // Web only
    });

    console.log('FCM Token generated:', token);
    return token;
  } catch (error) {
    console.error('Error generating FCM token:', error);
    return null;
  }
};
```

#### Token Characteristics:
- **Unique per device**: Each device gets a unique token
- **Expires**: Tokens expire after 30-60 days
- **Can be revoked**: User can revoke by clearing app data
- **App-specific**: Different apps get different tokens on same device

### 2. Token Storage (Server-Side)

#### When: User Login/Registration
```typescript
// API Endpoint: /api/auth/login or /api/auth/register
// Mobile app sends token to server after successful authentication

const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password',
    fcmToken: 'generated_fcm_token_here', // ← Token sent here
    deviceInfo: {
      platform: 'android', // or 'ios', 'web'
      deviceId: 'unique_device_id',
      appVersion: '1.0.0'
    }
  })
});
```

#### Server-Side Storage Logic:
```typescript
// src/lib/fcm.ts - saveDeviceToken method
export async function saveDeviceToken(
  userId: string,
  token: string,
  userType: 'retailer' | 'tenant' | 'user',
  deviceInfo?: any
) {
  try {
    // Get the correct collection based on user type
    const collectionName = getCollectionName(userType);
    
    // Update user document with FCM token
    await db.collection(collectionName).doc(userId).update({
      fcmToken: token,
      deviceInfo: deviceInfo || {},
      lastActive: new Date(),
      tokenUpdatedAt: new Date()
    });

    console.log(`FCM token saved for ${userType} ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return { success: false, error: error.message };
  }
}
```

#### Database Storage Structure:
```javascript
// Firestore Collection Structure
retailers/ {
  userId: "retailer_123",
  email: "retailer@example.com",
  fcmToken: "fcm_token_string_here", // ← Stored here
  deviceInfo: {
    platform: "android",
    deviceId: "device_unique_id",
    appVersion: "1.0.0"
  },
  tokenUpdatedAt: timestamp,
  lastActive: timestamp
}

tenants/ {
  userId: "tenant_456",
  email: "tenant@example.com", 
  fcmToken: "fcm_token_string_here", // ← Stored here
  deviceInfo: { ... },
  tokenUpdatedAt: timestamp,
  lastActive: timestamp
}

users/ {
  userId: "user_789",
  email: "user@example.com",
  fcmToken: "fcm_token_string_here", // ← Stored here
  deviceInfo: { ... },
  tokenUpdatedAt: timestamp,
  lastActive: timestamp
}
```

### 3. Token Retrieval (Server-Side)

#### When: Sending Notifications
```typescript
// src/lib/fcm.ts - getUserDevices method
export async function getUserDevices(
  userId: string,
  userType: 'retailer' | 'tenant' | 'user'
): Promise<{ success: boolean; devices?: any[]; error?: string }> {
  try {
    // Dynamic collection mapping
    const collectionName = getCollectionName(userType);
    
    // Query the correct collection
    const userDoc = await db.collection(collectionName).doc(userId).get();
    
    if (!userDoc.exists) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const devices = [];

    // Check if user has FCM token
    if (userData.fcmToken) {
      devices.push({
        token: userData.fcmToken,
        deviceInfo: userData.deviceInfo || {},
        lastActive: userData.lastActive?.toDate(),
        tokenUpdatedAt: userData.tokenUpdatedAt?.toDate()
      });
    }

    return { success: true, devices };
  } catch (error) {
    console.error('Error fetching user devices:', error);
    return { success: false, error: error.message };
  }
}
```

#### Collection Mapping Logic:
```typescript
// src/lib/fcm.ts - getCollectionName method
function getCollectionName(userType: string): string {
  const collectionMap: { [key: string]: string } = {
    'retailer': 'retailers',
    'tenant': 'tenants', 
    'user': 'users'
  };
  
  return collectionMap[userType] || 'users'; // Default fallback
}
```

### 4. Sending Notifications (Server-Side)

#### When: OTP Generation, Alerts, Updates
```typescript
// src/lib/fcm.ts - sendNotification method
export async function sendNotification(
  userId: string,
  userType: 'retailer' | 'tenant' | 'user',
  notification: {
    title: string;
    body: string;
    data?: any;
  }
) {
  try {
    // Step 1: Get user's FCM token
    const { success, devices, error } = await getUserDevices(userId, userType);
    
    if (!success || !devices || devices.length === 0) {
      return { success: false, error: 'No FCM token found' };
    }

    // Step 2: Send to all user devices
    const results = [];
    for (const device of devices) {
      const result = await sendFCMNotification(device.token, notification);
      results.push(result);
    }

    return { success: true, results };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
}

// Actual FCM API call
async function sendFCMNotification(token: string, notification: any) {
  const message = {
    token: token,
    notification: {
      title: notification.title,
      body: notification.body
    },
    data: notification.data || {},
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        click_action: 'FLUTTER_NOTIFICATION_CLICK'
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1
        }
      }
    }
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('FCM send error:', error);
    
    // Handle token invalidation
    if (error.code === 'messaging/registration-token-not-registered') {
      await cleanupInvalidToken(token);
    }
    
    return { success: false, error: error.message };
  }
}
```

### 5. Token Management & Cleanup

#### Token Refresh Handling:
```typescript
// Client-side token refresh listener
import { getMessaging, onTokenRefresh } from 'firebase/messaging';

const messaging = getMessaging();

// Listen for token refresh
onTokenRefresh(messaging, async (newToken) => {
  console.log('Token refreshed:', newToken);
  
  // Send new token to server
  await fetch('/api/fcm/update-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'current_user_id',
      userType: 'retailer', // or 'tenant', 'user'
      newToken: newToken
    })
  });
});
```

#### Cleanup Invalid Tokens:
```typescript
// src/lib/fcm.ts - cleanupInvalidToken
async function cleanupInvalidToken(token: string) {
  try {
    // Search all collections for this token
    const collections = ['retailers', 'tenants', 'users'];
    
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName)
        .where('fcmToken', '==', token)
        .get();
      
      // Remove invalid token from all matching documents
      const batch = db.batch();
      snapshot.forEach(doc => {
        batch.update(doc.ref, {
          fcmToken: null,
          tokenUpdatedAt: new Date()
        });
      });
      
      await batch.commit();
    }
    
    console.log('Cleaned up invalid token:', token);
  } catch (error) {
    console.error('Error cleaning up token:', error);
  }
}
```

## 🎯 Real-World OTP Flow Example

### Step-by-Step OTP Notification:

1. **User Requests OTP**:
```typescript
// Mobile app calls API
const response = await fetch('/api/otp/request', {
  method: 'POST',
  body: JSON.stringify({
    phone: '+1234567890',
    userType: 'retailer'
  })
});
```

2. **Server Generates OTP**:
```typescript
// /api/otp/request
export async function POST(request) {
  const { phone, userType } = await request.json();
  
  // Generate OTP
  const otp = generateOTP();
  
  // Save OTP to database
  await saveOTP(phone, otp);
  
  // Find user by phone
  const user = await findUserByPhone(phone, userType);
  
  if (user && user.fcmToken) {
    // Send OTP via FCM
    await sendNotification(user.id, userType, {
      title: 'Verification Code',
      body: `Your OTP is: ${otp}`,
      data: { type: 'otp', otp: otp }
    });
  }
  
  return { success: true };
}
```

3. **Mobile App Receives OTP**:
```typescript
// Mobile app background handler
import { getMessaging, onBackgroundMessage } from 'firebase/messaging';

const messaging = getMessaging();

onBackgroundMessage(messaging, (payload) => {
  console.log('Received background message:', payload);
  
  if (payload.data?.type === 'otp') {
    const otp = payload.data.otp;
    
    // Auto-fill OTP field
    // Show notification
    // Store OTP temporarily
  }
});
```

## 🔧 Key Configuration Points

### Firebase Project Setup:
1. **Enable Cloud Messaging** in Firebase Console
2. **Configure FCM credentials** in environment variables
3. **Set up APNs certificates** for iOS
4. **Configure Web Push certificates** for web

### Environment Variables:
```bash
# .env.local
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

### Security Considerations:
1. **Token Validation**: Always validate FCM tokens server-side
2. **Rate Limiting**: Implement rate limiting for OTP requests
3. **Token Encryption**: Store tokens securely in database
4. **Permission Handling**: Request notification permissions properly

## 🚀 Best Practices

### Performance:
- **Batch Operations**: Use batch writes for multiple token updates
- **Token Caching**: Cache frequently accessed tokens
- **Async Processing**: Handle FCM sends asynchronously

### Reliability:
- **Retry Logic**: Implement exponential backoff for failed sends
- **Fallback Methods**: Use SMS as fallback for critical notifications
- **Monitoring**: Track delivery rates and failures

### User Experience:
- **Permission Requests**: Ask for permissions at the right time
- **Notification Handling**: Handle foreground/background states properly
- **Token Refresh**: Automatically update tokens when refreshed

## 📊 Monitoring & Debugging

### FCM Delivery Monitoring:
```typescript
// Track delivery status
const deliveryTracker = {
  sent: 0,
  delivered: 0,
  failed: 0,
  errors: []
};

// Log delivery results
function logDeliveryResult(token: string, result: any) {
  if (result.success) {
    deliveryTracker.delivered++;
  } else {
    deliveryTracker.failed++;
    deliveryTracker.errors.push({
      token,
      error: result.error,
      timestamp: new Date()
    });
  }
}
```

### Common Issues & Solutions:
1. **Token Not Registered**: Token expired, needs refresh
2. **Permission Denied**: User disabled notifications
3. **Invalid Payload**: Malformed notification data
4. **Quota Exceeded**: Too many messages sent

This FCM workflow ensures reliable notification delivery across all user types in our system while maintaining proper token management and error handling.