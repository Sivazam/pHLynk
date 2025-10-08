import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';

interface CleanupUserDevicesRequest {
  userId: string;
  userType?: 'users' | 'retailers' | 'wholesalers' | 'lineWorkers' | 'superAdmins';
}

export async function POST(request: NextRequest) {
  try {
    const body: CleanupUserDevicesRequest = await request.json();
    const { userId, userType = 'retailers' } = body;

    console.log('🧹 FCM API: Received cleanup user devices request:', {
      userId,
      userType
    });

    if (!userId) {
      console.error('❌ FCM API: Missing required field: userId');
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Get all devices for the user
    const devices = await fcmService.getActiveDevices(userId, userType);
    console.log(`📱 Found ${devices.length} devices for ${userType}:`, userId);

    if (devices.length === 0) {
      console.log('✅ No devices to cleanup for user:', userId);
      return NextResponse.json({
        success: true,
        message: 'No devices found to cleanup',
        cleanedCount: 0
      });
    }

    // Remove all devices for this user
    let cleanedCount = 0;
    for (const device of devices) {
      try {
        const result = await fcmService.unregisterDevice(userId, device.token, userType);
        if (result.success) {
          cleanedCount++;
          console.log(`✅ Cleaned device: ${device.token.substring(0, 20)}...`);
        } else {
          console.warn(`⚠️ Failed to clean device: ${device.token.substring(0, 20)}...`);
        }
      } catch (error) {
        console.error(`❌ Error cleaning device ${device.token.substring(0, 20)}...:`, error);
      }
    }

    console.log(`✅ Cleanup completed for ${userType} ${userId}. Cleaned ${cleanedCount}/${devices.length} devices`);

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned ${cleanedCount} device(s)`,
      cleanedCount,
      totalDevices: devices.length,
      userType
    });

  } catch (error) {
    console.error('❌ Error in FCM cleanup-user-devices API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}