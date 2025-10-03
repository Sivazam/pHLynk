import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';

interface UnregisterDeviceRequest {
  retailerId?: string;
  userId?: string;
  deviceToken: string;
  userType?: 'retailer' | 'line_worker' | 'wholesaler' | 'super_admin';
}

export async function POST(request: NextRequest) {
  try {
    const body: UnregisterDeviceRequest = await request.json();
    const { retailerId, userId, deviceToken, userType = 'retailer' } = body;

    // Support both retailerId and userId for backward compatibility
    const targetUserId = userId || retailerId;
    
    if (!targetUserId || !deviceToken) {
      return NextResponse.json(
        { error: 'Missing required fields: userId (or retailerId), deviceToken' },
        { status: 400 }
      );
    }

    const result = await fcmService.unregisterDevice(targetUserId, deviceToken, userType);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in FCM unregister-device API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}