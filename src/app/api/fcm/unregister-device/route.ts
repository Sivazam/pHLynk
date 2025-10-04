import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';

interface UnregisterDeviceRequest {
  retailerId: string;
  deviceToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UnregisterDeviceRequest = await request.json();
    const { retailerId, deviceToken } = body;

    if (!retailerId || !deviceToken) {
      return NextResponse.json(
        { error: 'Missing required fields: retailerId, deviceToken' },
        { status: 400 }
      );
    }

    const result = await fcmService.unregisterDevice(retailerId, deviceToken);

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