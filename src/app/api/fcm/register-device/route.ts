import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';

interface RegisterDeviceRequest {
  retailerId: string;
  deviceToken: string;
  userAgent?: string;
  isNewUser?: boolean;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterDeviceRequest = await request.json();
    const { retailerId, deviceToken, userAgent, isNewUser = true, timestamp } = body;

    console.log('📱 FCM API: Received device registration request:', {
      retailerId,
      tokenLength: deviceToken?.length || 0,
      tokenPrefix: deviceToken?.substring(0, 20) + '...',
      userAgent: userAgent?.substring(0, 50) + '...',
      isNewUser,
      timestamp: timestamp || new Date().toISOString()
    });

    if (!retailerId || !deviceToken) {
      console.error('❌ FCM API: Missing required fields:', { retailerId: !!retailerId, deviceToken: !!deviceToken });
      return NextResponse.json(
        { error: 'Missing required fields: retailerId, deviceToken' },
        { status: 400 }
      );
    }

    console.log(`📱 Registering device for ${isNewUser ? 'new' : 'returning'} user:`, {
      retailerId,
      userAgent: userAgent?.substring(0, 50) + '...',
      timestamp: timestamp || new Date().toISOString()
    });

    // Check if FCM is properly configured
    if (!fcmService.isConfigured()) {
      console.error('❌ FCM API: FCM service is not properly configured');
      return NextResponse.json(
        { error: 'FCM service is not properly configured' },
        { status: 500 }
      );
    }

    console.log('✅ FCM API: FCM service configured, calling registerDevice...');
    const result = await fcmService.registerDevice(retailerId, deviceToken, userAgent);

    console.log('🔧 FCM API: Service returned result:', result);

    if (result.success) {
      console.log(`✅ Device registered successfully for ${isNewUser ? 'new' : 'returning'} user:`, retailerId);
      return NextResponse.json({
        success: true,
        message: result.message,
        isNewUser,
        timestamp: timestamp || new Date().toISOString()
      });
    } else {
      console.warn(`⚠️ Device registration failed for ${isNewUser ? 'new' : 'returning'} user:`, result.message);
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ Error in FCM register-device API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}