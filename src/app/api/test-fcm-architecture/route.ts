import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface TestFCMRequest {
  testType: 'retailer' | 'wholesaler' | 'line_worker';
  userId: string;
  deviceToken?: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TestFCMRequest = await request.json();
    const { testType, userId, deviceToken, message = 'Test notification from new FCM architecture' } = body;

    if (!testType || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: testType, userId' },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing new FCM architecture for ${testType}: ${userId}`);

    // Step 1: Check if user exists in their collection
    const collectionName = getCollectionName(testType);
    const userRef = doc(db, collectionName, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: `${testType} not found in ${collectionName} collection` },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    console.log(`✅ Found ${testType} in ${collectionName}:`, {
      name: userData.name || userData.displayName || userData.businessName,
      hasFcmDevices: !!(userData.fcmDevices && userData.fcmDevices.length > 0),
      deviceCount: userData.fcmDevices?.length || 0
    });

    // Step 2: If deviceToken provided, register it
    let registrationResult: { success: boolean; message: string } | null = null;
    if (deviceToken) {
      console.log(`📱 Registering device token for ${testType}...`);
      registrationResult = await fcmService.registerDevice(
        userId,
        deviceToken,
        'test-browser',
        testType
      );
      console.log(`📱 Registration result:`, registrationResult);
    }

    // Step 3: Get current devices
    const devices = await fcmService.getUserDevices(userId, testType);
    console.log(`📱 Current devices for ${testType}:`, devices.length);

    // Step 4: Send test notification if devices exist
    let notificationResult: { success: boolean; message: string; sentCount?: number } | null = null;
    if (devices.length > 0) {
      console.log(`📤 Sending test notification to ${devices.length} device(s)...`);
      notificationResult = await fcmService.sendNotificationToUser(
        userId,
        testType,
        {
          title: `🧪 Test Notification (${testType})`,
          body: message,
          data: {
            type: 'test',
            testType,
            userId,
            timestamp: new Date().toISOString()
          },
          icon: '/icon-192x192.png',
          tag: `test-${testType}-${Date.now()}`,
          clickAction: '/'
        }
      );
      console.log(`📤 Notification result:`, notificationResult);
    } else {
      console.log(`⚠️ No devices found for ${testType}, skipping notification test`);
    }

    return NextResponse.json({
      success: true,
      testType,
      userId,
      collectionName,
      userExists: true,
      devicesFound: devices.length,
      devices: devices.map(d => ({
        token: d.token.substring(0, 20) + '...',
        userAgent: d.userAgent,
        registeredAt: d.registeredAt,
        lastActive: d.lastActive
      })),
      registrationResult,
      notificationResult,
      message: 'Test completed successfully'
    });

  } catch (error) {
    console.error('Error in FCM architecture test:', error);
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getCollectionName(userType: string): string {
  switch (userType) {
    case 'retailer':
      return 'retailers';
    case 'wholesaler':
      return 'tenants';
    case 'line_worker':
      return 'users';
    default:
      throw new Error(`Unknown user type: ${userType}`);
  }
}