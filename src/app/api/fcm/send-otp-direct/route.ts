import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseMessaging, getFirebaseFirestore } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 DIRECT FCM API - send-otp-notification called');
    
    const body = await request.json();
    const { retailerId, otp, amount, paymentId, lineWorkerName, lineWorkerId } = body;
    
    console.log('📤 DIRECT FCM API - Request data:', { retailerId, otp, amount, paymentId, lineWorkerName, lineWorkerId });

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

    // Fetch line worker to get tenantId
    let wholesalerName = '';
    try {
      const lineWorkerDoc = await db.collection('users').doc(lineWorkerId).get();
      if (lineWorkerDoc.exists) {
        const lineWorkerData = lineWorkerDoc.data();
        const tenantId = lineWorkerData?.tenantId;
        
        if (tenantId) {
          // Fetch tenant details to get wholesaler name
          const tenantDoc = await db.collection('tenants').doc(tenantId).get();
          if (tenantDoc.exists) {
            const tenantData = tenantDoc.data();
            wholesalerName = tenantData?.name || '';
            console.log('✅ DIRECT FCM API - Fetched wholesaler name:', wholesalerName);
          } else {
            console.warn('⚠️ DIRECT FCM API - Tenant not found for tenantId:', tenantId);
          }
        } else {
          console.warn('⚠️ DIRECT FCM API - Line worker has no tenantId');
        }
      } else {
        console.warn('⚠️ DIRECT FCM API - Line worker not found for lineWorkerId:', lineWorkerId);
      }
    } catch (error) {
      console.error('❌ DIRECT FCM API - Error fetching wholesaler name:', error);
      // Continue without wholesaler name if fetch fails
    }

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

    // Create FCM message with proper icons and updated format
    const wholesalerPart = wholesalerName ? ` from ${wholesalerName}` : '';
    const messageBody = `Your OTP code is ${otp} for payment of ₹${amount.toLocaleString()} collected by ${lineWorkerName}${wholesalerPart}\n-- PharmaLync`;
    
    const message = {
      notification: {
        title: 'Payment Verification Required',
        body: messageBody,
      },
      data: {
        type: 'otp',
        otp: otp,
        amount: amount.toString(),
        paymentId: paymentId,
        retailerId: retailerId,
        lineWorkerName: lineWorkerName,
        wholesalerName: wholesalerName,
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
          title: 'Payment Verification Required',
          body: messageBody,
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