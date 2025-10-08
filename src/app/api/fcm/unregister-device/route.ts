import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';

interface UnregisterDeviceRequest {
  userId: string;
  deviceToken: string;
  userType?: 'users' | 'retailers' | 'wholesalers' | 'lineWorkers' | 'superAdmins';
}

export async function POST(request: NextRequest) {
  try {
    const body: UnregisterDeviceRequest = await request.json();
    const { userId, deviceToken, userType = 'retailers' } = body;

    console.log('📱 FCM API: Received device unregistration request:', {
      userId,
      userType,
      tokenLength: deviceToken?.length || 0,
      tokenPrefix: deviceToken?.substring(0, 20) + '...'
    });

    if (!userId || !deviceToken) {
      console.error('❌ FCM API: Missing required fields:', { userId: !!userId, deviceToken: !!deviceToken });
      return NextResponse.json(
        { error: 'Missing required fields: userId, deviceToken' },
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
      userId,
      userType
    });

    const result = await fcmService.unregisterDevice(userId, deviceToken, userType);

    console.log('🔧 FCM API: Unregister service returned result:', result);

    if (result.success) {
      console.log('✅ Device unregistered successfully:', userId);
      return NextResponse.json({
        success: true,
        message: result.message,
        userType
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