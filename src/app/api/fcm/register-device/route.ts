import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';

interface RegisterDeviceRequest {
  retailerId?: string;
  userId?: string;
  deviceToken: string;
  userAgent?: string;
  userType?: 'retailer' | 'line_worker' | 'wholesaler' | 'super_admin';
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterDeviceRequest = await request.json();
    const { retailerId, userId, deviceToken, userAgent, userType = 'retailer' } = body;

    // Support both retailerId and userId for backward compatibility
    const targetUserId = userId || retailerId;
    
    if (!targetUserId || !deviceToken) {
      return NextResponse.json(
        { error: 'Missing required fields: userId (or retailerId), deviceToken' },
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

    const result = await fcmService.registerDevice(targetUserId, deviceToken, userAgent, userType);

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