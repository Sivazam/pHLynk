// Complete FCM OTP Example - End to End Flow
// This demonstrates the entire process from OTP request to delivery

// ===========================================
// CLIENT SIDE - Mobile App
// ===========================================

class MobileAppFCM {
  constructor() {
    this.currentToken = null;
    this.userId = null;
    this.userType = null;
  }

  // Initialize FCM when app starts
  async initializeFCM() {
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Get FCM token
      this.currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY
      });

      console.log('FCM Token obtained:', this.currentToken);

      // Set up token refresh listener
      onTokenRefresh(messaging, (newToken) => {
        console.log('Token refreshed:', newToken);
        this.updateTokenOnServer(newToken);
      });

      // Set up message handlers
      this.setupMessageHandlers();

      return this.currentToken;
    } catch (error) {
      console.error('FCM initialization failed:', error);
      return null;
    }
  }

  // Setup message handlers for different app states
  setupMessageHandlers() {
    // Foreground messages
    onMessage(messaging, (payload) => {
      console.log('Foreground message received:', payload);
      this.handleOTPNotification(payload);
    });

    // Background messages
    onBackgroundMessage(messaging, (payload) => {
      console.log('Background message received:', payload);
      this.handleOTPNotification(payload);
    });
  }

  // Handle OTP notifications
  handleOTPNotification(payload) {
    if (payload.data?.type === 'otp') {
      const otp = payload.data.otp;
      const title = payload.notification?.title;
      const body = payload.notification?.body;

      console.log(`OTP Received: ${otp}`);

      // Auto-fill OTP in UI
      this.autoFillOTP(otp);

      // Show local notification
      this.showLocalNotification(title, body, otp);

      // Store OTP temporarily
      sessionStorage.setItem('currentOTP', otp);
      sessionStorage.setItem('otpTimestamp', Date.now().toString());
    }
  }

  // Auto-fill OTP in the UI
  autoFillOTP(otp) {
    const otpInput = document.getElementById('otp-input');
    if (otpInput) {
      otpInput.value = otp;
      otpInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // Show local notification
  showLocalNotification(title, body, otp) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/icons/notification-icon.png',
        badge: '/icons/badge-icon.png',
        tag: 'otp-notification',
        requireInteraction: true,
        actions: [
          {
            action: 'copy-otp',
            title: 'Copy OTP'
          }
        ]
      });
    }
  }

  // Update token on server
  async updateTokenOnServer(newToken) {
    if (!this.userId || !this.userType) return;

    try {
      const response = await fetch('/api/fcm/update-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          userType: this.userType,
          newToken: newToken
        })
      });

      const result = await response.json();
      if (result.success) {
        this.currentToken = newToken;
        console.log('Token updated successfully');
      }
    } catch (error) {
      console.error('Failed to update token:', error);
    }
  }

  // Login and register token
  async login(credentials) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...credentials,
          fcmToken: this.currentToken,
          deviceInfo: {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        this.userId = result.user.id;
        this.userType = result.user.type;
        console.log('Login successful, token registered');
      }

      return result;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Request OTP
  async requestOTP(phone) {
    try {
      const response = await fetch('/api/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          userType: this.userType
        })
      });

      const result = await response.json();
      console.log('OTP requested:', result);
      return result;
    } catch (error) {
      console.error('OTP request failed:', error);
      throw error;
    }
  }
}

// ===========================================
// SERVER SIDE - FCM Service
// ===========================================

class FCMService {
  constructor() {
    this.admin = require('firebase-admin');
    this.db = require('@/lib/db').db;
  }

  // Save device token for user
  async saveDeviceToken(userId, token, userType, deviceInfo) {
    try {
      const collectionName = this.getCollectionName(userType);
      
      await this.db.collection(collectionName).doc(userId).update({
        fcmToken: token,
        deviceInfo: deviceInfo || {},
        lastActive: new Date(),
        tokenUpdatedAt: new Date(),
        tokenStatus: 'active'
      });

      console.log(`✅ Token saved for ${userType}:${userId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to save token:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user devices for notification
  async getUserDevices(userId, userType) {
    try {
      const collectionName = this.getCollectionName(userType);
      const userDoc = await this.db.collection(collectionName).doc(userId).get();

      if (!userDoc.exists) {
        return { success: false, error: 'User not found' };
      }

      const userData = userDoc.data();
      const devices = [];

      if (userData.fcmToken && userData.tokenStatus === 'active') {
        devices.push({
          token: userData.fcmToken,
          deviceInfo: userData.deviceInfo || {},
          lastActive: userData.lastActive?.toDate(),
          tokenUpdatedAt: userData.tokenUpdatedAt?.toDate()
        });
      }

      return { success: true, devices };
    } catch (error) {
      console.error('❌ Failed to get user devices:', error);
      return { success: false, error: error.message };
    }
  }

  // Send OTP notification
  async sendOTPNotification(userId, userType, otp, phone) {
    try {
      console.log(`🔔 Sending OTP to ${userType}:${userId}`);

      // Get user's FCM token
      const { success, devices, error } = await this.getUserDevices(userId, userType);

      if (!success) {
        throw new Error(`Failed to get devices: ${error}`);
      }

      if (!devices || devices.length === 0) {
        console.log(`⚠️ No active devices found for ${userType}:${userId}`);
        return { 
          success: false, 
          error: 'No active devices found',
          fallbackRequired: true 
        };
      }

      // Send to all devices
      const results = [];
      for (const device of devices) {
        const result = await this.sendFCMMessage(device.token, {
          title: 'Verification Code',
          body: `Your OTP code is: ${otp}`,
          data: {
            type: 'otp',
            otp: otp,
            phone: phone,
            timestamp: new Date().toISOString()
          }
        });
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`✅ OTP sent to ${successCount}/${results.length} devices`);

      return {
        success: successCount > 0,
        results,
        devicesCount: results.length
      };

    } catch (error) {
      console.error('❌ Failed to send OTP notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send FCM message
  async sendFCMMessage(token, notification) {
    const message = {
      token: token,
      notification: {
        title: notification.title,
        body: notification.body,
        sound: 'default'
      },
      data: notification.data || {},
      android: {
        priority: 'high',
        ttl: 3600000, // 1 hour
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          icon: '@drawable/ic_notification'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            'content-available': 1
          }
        }
      }
    };

    try {
      const response = await this.admin.messaging().send(message);
      console.log(`📱 Message sent successfully: ${response}`);
      return { success: true, messageId: response };
    } catch (error) {
      console.error(`❌ FCM send failed for token ${token}:`, error);

      // Handle invalid token
      if (error.code === 'messaging/registration-token-not-registered') {
        await this.cleanupInvalidToken(token);
      }

      return { success: false, error: error.message, errorCode: error.code };
    }
  }

  // Cleanup invalid tokens
  async cleanupInvalidToken(token) {
    try {
      const collections = ['retailers', 'tenants', 'users'];
      
      for (const collectionName of collections) {
        const snapshot = await this.db.collection(collectionName)
          .where('fcmToken', '==', token)
          .get();

        if (!snapshot.empty) {
          const batch = this.db.batch();
          snapshot.forEach(doc => {
            batch.update(doc.ref, {
              fcmToken: null,
              tokenStatus: 'invalid',
              tokenUpdatedAt: new Date()
            });
          });
          
          await batch.commit();
          console.log(`🧹 Cleaned up invalid token from ${collectionName}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to cleanup invalid token:', error);
    }
  }

  // Get collection name based on user type
  getCollectionName(userType) {
    const collectionMap = {
      'retailer': 'retailers',
      'tenant': 'tenants',
      'user': 'users'
    };
    
    return collectionMap[userType] || 'users';
  }
}

// ===========================================
// API ENDPOINT EXAMPLES
// ===========================================

// /api/otp/request
export async function POST(request) {
  try {
    const { phone, userType } = await request.json();
    
    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save OTP to database
    await saveOTPToDatabase(phone, otp);
    
    // Find user by phone
    const user = await findUserByPhone(phone, userType);
    
    if (user) {
      // Send OTP via FCM
      const fcmService = new FCMService();
      const result = await fcmService.sendOTPNotification(
        user.id, 
        userType, 
        otp, 
        phone
      );
      
      if (result.success) {
        return Response.json({
          success: true,
          message: 'OTP sent via push notification',
          method: 'fcm'
        });
      } else if (result.fallbackRequired) {
        // Fallback to SMS
        await sendOTPSMS(phone, otp);
        return Response.json({
          success: true,
          message: 'OTP sent via SMS',
          method: 'sms'
        });
      }
    }
    
    return Response.json({
      success: false,
      error: 'Failed to send OTP'
    });
    
  } catch (error) {
    console.error('OTP request error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// ===========================================
// USAGE EXAMPLE
// ===========================================

// Complete flow example
async function completeOTPFlow() {
  // 1. Initialize mobile app FCM
  const mobileApp = new MobileAppFCM();
  await mobileApp.initializeFCM();
  
  // 2. User logs in (registers token)
  await mobileApp.login({
    email: 'retailer@example.com',
    password: 'password123'
  });
  
  // 3. User requests OTP
  const otpResult = await mobileApp.requestOTP('+1234567890');
  
  // 4. Mobile app automatically receives and handles OTP
  // (handled by setupMessageHandlers())
  
  console.log('OTP Flow Complete!');
}

console.log('FCM OTP Example Loaded');
console.log('Key Components:');
console.log('1. MobileAppFCM - Client-side token management');
console.log('2. FCMService - Server-side notification sending');
console.log('3. API Endpoints - OTP request handling');
console.log('4. Complete flow from token generation to OTP delivery');