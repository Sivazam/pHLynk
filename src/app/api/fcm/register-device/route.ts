import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';

interface RegisterDeviceRequest {
  retailerId: string;
  deviceToken: string;
  userAgent?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterDeviceRequest = await request.json();
    const { retailerId, deviceToken, userAgent } = body;

    if (!retailerId || !deviceToken) {
      return NextResponse.json(
        { error: 'Missing required fields: retailerId, deviceToken' },
        { status: 400 }
      );
    }

    // Check if FCM is properly configured
    if (!fcmService.isConfigured()) {
      return NextResponse.json(
        { error: 'FCM service is not properly configured' },
        { status: 500 }
      );
    }

    const result = await fcmService.registerDevice(retailerId, deviceToken, userAgent);

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
    console.error('Error in FCM register-device API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}