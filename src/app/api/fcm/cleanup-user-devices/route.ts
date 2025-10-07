import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';

interface CleanupUserDevicesRequest {
  retailerId: string;
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CleanupUserDevicesRequest = await request.json();
    const { retailerId, userId } = body;

    console.log('🧹 FCM API: Received cleanup user devices request:', {
      retailerId,
      userId
    });

    if (!retailerId || !userId) {
      console.error('❌ FCM API: Missing required fields:', { retailerId: !!retailerId, userId: !!userId });
      return NextResponse.json(
        { error: 'Missing required fields: retailerId, userId' },
        { status: 400 }
      );
    }

    // Get all devices for the retailer
    const devices = await fcmService.getRetailerDevices(retailerId);
    console.log(`📱 Found ${devices.length} devices for retailer:`, retailerId);

    if (devices.length === 0) {
      console.log('✅ No devices to cleanup for retailer:', retailerId);
      return NextResponse.json({
        success: true,
        message: 'No devices found to cleanup',
        cleanedCount: 0
      });
    }

    // Remove all devices for this retailer
    let cleanedCount = 0;
    for (const device of devices) {
      try {
        const result = await fcmService.unregisterDevice(retailerId, device.token);
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

    console.log(`✅ Cleanup completed for retailer ${retailerId}. Cleaned ${cleanedCount}/${devices.length} devices`);

    return NextResponse.json({
      success: true,
      message: `Successfully cleaned ${cleanedCount} device(s)`,
      cleanedCount,
      totalDevices: devices.length
    });

  } catch (error) {
    console.error('❌ Error in FCM cleanup-user-devices API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}