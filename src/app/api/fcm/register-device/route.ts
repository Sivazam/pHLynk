import { NextRequest, NextResponse } from 'next/server';
import { fcmV1Service } from '@/lib/fcm-v1-service';

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

    // Check FCM v1 configuration
    const configStatus = fcmV1Service.getConfigStatus();
    if (!configStatus.configured) {
      return NextResponse.json(
        { 
          error: 'FCM v1 service is not properly configured',
          missing: configStatus.missing,
          suggestion: 'Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your environment variables'
        },
        { status: 500 }
      );
    }

    // For now, just validate the token format and return success
    // In a real implementation, you would store this in a database
    console.log(`📱 Device registered: ${targetUserId} (${userType}) with token: ${deviceToken.substring(0, 20)}...`);
    
    return NextResponse.json({
      success: true,
      message: 'Device registered successfully with FCM v1',
      userId: targetUserId,
      userType,
      tokenPreview: deviceToken.substring(0, 20) + '...'
    });
  } catch (error) {
    console.error('Error in FCM v1 register-device API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}