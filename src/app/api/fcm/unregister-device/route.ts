import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';

interface UnregisterDeviceRequest {
  retailerId: string;
  deviceToken: string;
  userId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UnregisterDeviceRequest = await request.json();
    const { retailerId, deviceToken, userId } = body;

    console.log('📱 FCM API: Received device unregistration request:', {
      retailerId,
      tokenLength: deviceToken?.length || 0,
      tokenPrefix: deviceToken?.substring(0, 20) + '...',
      userId
    });

    if (!retailerId || !deviceToken) {
      console.error('❌ FCM API: Missing required fields:', { retailerId: !!retailerId, deviceToken: !!deviceToken });
      return NextResponse.json(
        { error: 'Missing required fields: retailerId, deviceToken' },
        { status: 400 }
      );
    }

    // Check if FCM is properly configured
    if (!fcmService.isConfigured()) {
      console.error('❌ FCM API: FCM service is not properly configured');
      return NextResponse.json(
        { error: 'FCM service is not properly configured' },
        { status: 500 }
      );
    }

    console.log('🗑️ Unregistering device for user:', {
      retailerId,
      userId
    });

    const result = await fcmService.unregisterDevice(retailerId, deviceToken);

    console.log('🔧 FCM API: Unregister service returned result:', result);

    if (result.success) {
      console.log('✅ Device unregistered successfully:', retailerId);
      return NextResponse.json({
        success: true,
        message: result.message
      });
    } else {
      console.warn('⚠️ Device unregistration failed:', result.message);
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ Error in FCM unregister-device API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}