# 🔄 FCM Token Management for Returning Users

## 🎯 Scenario: User Already Logged In

**User Flow:**
1. User previously logged in before FCM update
2. User opens app again after update
3. Auth session persists → Redirected to dashboard
4. **FCM token needs to be generated and saved**

## 🔍 Current Problem Analysis

Looking at our current implementation in `src/lib/fcm.ts`:

```typescript
// Current initializeFCM() function
export async function initializeFCM(): Promise<string | null> {
  try {
    if (!auth.currentUser) {
      console.warn('⚠️ User not authenticated, cannot initialize FCM');
      return null;
    }
    
    // Get FCM token
    const token = await getFCMToken();
    
    // Register device with backend
    const response = await fetch('/api/fcm/register-device', {
      method: 'POST',
      body: JSON.stringify({
        retailerId: auth.currentUser.uid,
        deviceToken: token,
        userAgent: navigator.userAgent
      })
    });
    
    return token;
  } catch (error) {
    console.error('❌ Error initializing FCM:', error);
    return null;
  }
}
```

**The Issue:** This function exists but may not be called automatically for returning users.

## 🛠️ Solution: Automatic FCM Initialization

We need to ensure FCM is initialized whenever the app loads and user is authenticated. Here's the complete solution:

### 1. **App-Level FCM Initialization**

```typescript
// src/components/providers/AuthProvider.tsx
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { initializeFCM } from '@/lib/fcm';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        console.log('👤 User authenticated:', user.uid);
        
        // 🔄 CRITICAL: Initialize FCM for returning users
        try {
          const fcmToken = await initializeFCM();
          if (fcmToken) {
            console.log('✅ FCM initialized for returning user');
          } else {
            console.warn('⚠️ FCM initialization failed for returning user');
          }
        } catch (error) {
          console.error('❌ FCM initialization error:', error);
        }
      } else {
        console.log('👤 User not authenticated');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}
```

### 2. **Enhanced FCM Initialization with Token Validation**

```typescript
// src/lib/fcm.ts - Enhanced version
export async function initializeFCM(): Promise<string | null> {
  try {
    if (!auth.currentUser) {
      console.warn('⚠️ User not authenticated, cannot initialize FCM');
      return null;
    }

    console.log('🔧 Initializing FCM for user:', auth.currentUser.uid);

    // Get FCM token
    const token = await getFCMToken();
    
    if (!token) {
      console.warn('⚠️ Failed to get FCM token');
      return null;
    }

    // Check if token is already registered
    const isAlreadyRegistered = await checkIfTokenRegistered(token);
    
    if (isAlreadyRegistered) {
      console.log('✅ FCM token already registered, updating last active');
      await updateLastActive(token);
      return token;
    }

    // Register new token with backend
    try {
      const response = await fetch('/api/fcm/register-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          retailerId: auth.currentUser.uid,
          deviceToken: token,
          userAgent: navigator.userAgent,
          isNewUser: false, // Flag for returning users
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Device registered with FCM backend:', result);
        return token;
      } else {
        console.warn('⚠️ Failed to register device with FCM backend:', response.status);
        return token; // Still return token even if backend registration fails
      }
    } catch (backendError) {
      console.warn('⚠️ Error registering device with FCM backend:', backendError);
      return token; // Still return token even if backend registration fails
    }
  } catch (error) {
    console.error('❌ Error initializing FCM:', error);
    return null;
  }
}

// Check if token is already registered
async function checkIfTokenRegistered(token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/fcm/check-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token,
        userId: auth.currentUser?.uid
      })
    });

    if (response.ok) {
      const result = await response.json();
      return result.exists;
    }
    return false;
  } catch (error) {
    console.error('Error checking token registration:', error);
    return false;
  }
}

// Update last active timestamp for existing token
async function updateLastActive(token: string): Promise<void> {
  try {
    await fetch('/api/fcm/update-last-active', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token,
        userId: auth.currentUser?.uid
      })
    });
  } catch (error) {
    console.error('Error updating last active:', error);
  }
}
```

### 3. **Backend API Enhancements**

```typescript
// src/app/api/fcm/check-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';

export async function POST(request: NextRequest) {
  try {
    const { token, userId } = await request.json();

    if (!token || !userId) {
      return NextResponse.json(
        { error: 'Token and userId are required' },
        { status: 400 }
      );
    }

    // Check if token exists for this user
    const devices = await fcmService.getRetailerDevices(userId);
    const tokenExists = devices.some(device => device.token === token);

    return NextResponse.json({
      exists: tokenExists,
      deviceCount: devices.length
    });

  } catch (error) {
    console.error('Error checking token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// src/app/api/fcm/update-last-active/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { token, userId } = await request.json();

    if (!token || !userId) {
      return NextResponse.json(
        { error: 'Token and userId are required' },
        { status: 400 }
      );
    }

    // Update last active timestamp for the device
    const userRef = doc(db, 'retailers', userId);
    const userDoc = await userRef.get();

    if (userDoc.exists()) {
      const devices = userDoc.data()?.fcmDevices || [];
      const updatedDevices = devices.map((device: any) =>
        device.token === token
          ? { ...device, lastActive: new Date() }
          : device
      );

      await updateDoc(userRef, { fcmDevices: updatedDevices });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error updating last active:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 4. **Enhanced Device Registration**

```typescript
// src/app/api/fcm/register-device/route.ts - Enhanced version
import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';
import { auth } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { retailerId, deviceToken, userAgent, isNewUser = true } = await request.json();

    if (!retailerId || !deviceToken) {
      return NextResponse.json(
        { error: 'Retailer ID and device token are required' },
        { status: 400 }
      );
    }

    console.log(`📱 Registering device for ${isNewUser ? 'new' : 'returning'} user:`, retailerId);

    // Register device
    const result = await fcmService.registerDevice(retailerId, deviceToken, userAgent);

    if (result.success) {
      // Log the registration
      console.log(`✅ Device registered for ${isNewUser ? 'new' : 'returning'} user:`, {
        retailerId,
        userAgent,
        timestamp: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: result.message,
        isNewUser
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error registering device:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 🔄 Complete Flow for Returning Users

### Step-by-Step Process:

1. **User Opens App**:
   ```
   App loads → Auth state persists → User redirected to dashboard
   ```

2. **Auth Provider Detects User**:
   ```typescript
   // AuthProvider useEffect triggers
   onAuthStateChanged(auth, async (user) => {
     if (user) {
       // User is authenticated!
       await initializeFCM(); // ← This is called automatically
     }
   });
   ```

3. **FCM Initialization**:
   ```typescript
   // initializeFCM() runs
   const token = await getFCMToken(); // Generates new token
   const isRegistered = await checkIfTokenRegistered(token); // Checks if exists
   
   if (isRegistered) {
     await updateLastActive(token); // Updates timestamp
   } else {
     await registerDevice(token); // Registers new token
   }
   ```

4. **Backend Processing**:
   ```typescript
   // Backend receives request
   // - If new token: adds to fcmDevices array
   // - If existing token: updates lastActive timestamp
   // - Returns success response
   ```

5. **Result**:
   ```
   ✅ User has FCM token registered
   ✅ Can receive OTP notifications
   ✅ Device marked as active
   ```

## 🎯 Key Benefits

### For Returning Users:
- **Seamless Experience**: No manual action required
- **Automatic Token Management**: Tokens updated automatically
- **No Duplicate Registrations**: Checks for existing tokens
- **Activity Tracking**: Updates last active timestamp

### For System:
- **Clean Device Management**: Avoids duplicate tokens
- **Accurate Device Status**: Knows which devices are active
- **Better Analytics**: Track returning user engagement
- **Reliable Notifications**: Ensures tokens are always current

## 🔍 Debugging for Returning Users

### Log Sequence to Expect:
```
👤 User authenticated: abc123
🔧 Initializing FCM for user: abc123
✅ FCM token obtained successfully
🔍 Checking if token already registered...
✅ FCM token already registered, updating last active
✅ Device last active updated
```

### Common Issues & Solutions:

1. **Token Not Generated**:
   - Check notification permission
   - Verify service worker registration
   - Ensure VAPID key is configured

2. **Token Not Registered**:
   - Check backend API connectivity
   - Verify user authentication
   - Check database permissions

3. **Duplicate Tokens**:
   - The checkIfTokenRegistered() function prevents this
   - Backend logic handles duplicates gracefully

## 📝 Implementation Checklist

To ensure returning users get FCM tokens properly:

- [ ] Add FCM initialization to AuthProvider
- [ ] Implement token checking logic
- [ ] Add last active update endpoint
- [ ] Enhance device registration API
- [ ] Add comprehensive logging
- [ ] Test with returning user scenario
- [ ] Monitor token registration logs

This ensures that even users who were logged in before the FCM update will automatically get their tokens generated and registered when they open the app again.