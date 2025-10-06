import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseMessaging, getFirebaseFirestore } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 DIRECT FCM API - send-otp-notification called');
    
    const body = await request.json();
    const { retailerId, otp, amount, paymentId, lineWorkerName } = body;
    
    console.log('📤 DIRECT FCM API - Request data:', { retailerId, otp, amount, paymentId, lineWorkerName });

    // Input validation
    if (!retailerId || !otp || !amount || !paymentId || !lineWorkerName) {
      console.error('❌ DIRECT FCM API - Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: retailerId, otp, amount, paymentId, lineWorkerName' },
        { status: 400 }
      );
    }

    const db = getFirebaseFirestore();
    const messaging = getFirebaseMessaging();

    // Get retailer user details
    const retailerUsersQuery = await db
      .collection('retailerUsers')
      .where('retailerId', '==', retailerId)
      .limit(1)
      .get();

    if (retailerUsersQuery.empty) {
      console.error(`❌ DIRECT FCM API - Retailer user not found for retailerId: ${retailerId}`);
      return NextResponse.json(
        { error: `Retailer user not found for retailerId: ${retailerId}`, success: false, fallbackToSMS: true },
        { status: 404 }
      );
    }

    const retailerUser = retailerUsersQuery.docs[0];
    const retailerUserId = retailerUser.id;
    const retailerUserData = retailerUser.data();
    
    // Get FCM devices
    const fcmDevices = retailerUserData?.fcmDevices || [];
    
    if (fcmDevices.length === 0) {
      console.warn(`⚠️ DIRECT FCM API - No FCM devices found for retailer user: ${retailerUserId}`);
      return NextResponse.json(
        { error: 'No FCM devices found', success: false, fallbackToSMS: true },
        { status: 404 }
      );
    }

    // Find most recently active device
    const activeDevice = fcmDevices.reduce((latest: any, device: any) => {
      const deviceTime = device.lastActive?.toDate?.() || new Date(0);
      const latestTime = latest?.lastActive?.toDate?.() || new Date(0);
      return deviceTime > latestTime ? device : latest;
    }, fcmDevices[0]);

    const fcmToken = activeDevice.token;
    console.log('✅ DIRECT FCM API - Using FCM token:', fcmToken.substring(0, 20) + '...');

    // Create FCM message with proper icons and bold OTP
    const message = {
      notification: {
        title: '🔐 Payment OTP Required',
        body: `Your OTP code is: **${otp}** for ₹${amount.toLocaleString()} by ${lineWorkerName}`,
      },
      data: {
        type: 'otp',
        otp: otp,
        amount: amount.toString(),
        paymentId: paymentId,
        retailerId: retailerId,
        lineWorkerName: lineWorkerName,
        tag: `otp-${paymentId}`,
        requireInteraction: 'true',
        // Icon paths for the notification
        icon: '/notification-large-192x192.png', // Right side - high-res app icon from logo.png
        badge: '/badge-72x72.png', // Left side - badge icon with blue background
        clickAction: '/retailer/dashboard'
      },
      token: fcmToken,
      android: {
        priority: 'high' as const,
        notification: {
          priority: 'high' as const,
          defaultSound: true,
          defaultVibrateTimings: true,
          // Android specific icon configuration
          icon: '/notification-large-192x192.png', // Right side large icon
          badge: '/badge-72x72.png', // Left side badge icon
          color: '#20439f', // Brand blue for notification accent
          style: 'default',
          notificationCount: 1
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
            'mutable-content': 1
          }
        },
        fcmOptions: {
          imageUrl: '/notification-large-192x192.png' // iOS large icon
        }
      },
      webpush: {
        headers: {
          icon: '/notification-large-192x192.png', // Right side large icon
          badge: '/badge-72x72.png', // Left side badge icon
          themeColor: '#20439f' // Brand blue
        },
        notification: {
          title: '🔐 Payment OTP Required',
          body: `Your OTP code is: **${otp}** for ₹${amount.toLocaleString()} by ${lineWorkerName}`,
          icon: '/notification-large-192x192.png',
          badge: '/badge-72x72.png',
          tag: `otp-${paymentId}`,
          requireInteraction: true,
          actions: [
            {
              action: 'open',
              title: 'Open App'
            }
          ]
        }
      }
    };

    // Send FCM message
    console.log('📤 DIRECT FCM API - Sending FCM message...');
    const response = await messaging.send(message);
    console.log('✅ DIRECT FCM API - FCM OTP notification sent successfully:', response);

    // Log FCM delivery
    await db.collection('fcmLogs').add({
      type: 'OTP_NOTIFICATION',
      retailerId: retailerId,
      paymentId: paymentId,
      userId: retailerUserId,
      token: fcmToken.substring(0, 8) + '...',
      status: 'SENT',
      messageId: response,
      sentBy: 'DIRECT_FCM_API',
      sentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ DIRECT FCM API - OTP notification sent successfully');
    
    return NextResponse.json({
      success: true,
      messageId: response,
      type: 'direct_fcm_sent',
      message: 'OTP notification sent successfully via direct FCM'
    });

  } catch (error) {
    console.error('❌ DIRECT FCM API - Error sending OTP notification:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send OTP notification',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        fallbackToSMS: true
      },
      { status: 500 }
    );
  }
}