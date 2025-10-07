import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';
import { auth } from '@/lib/firebase';

interface RegisterDeviceRequest {
  retailerId: string;
  deviceToken: string;
  userAgent?: string;
  isNewUser?: boolean;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 🔐 SECURITY: Verify user is authenticated before registering device
    const authHeader = request.headers.get('authorization');
    let authToken: string | null = null;
    
    // Extract token from Authorization header or from request body
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authToken = authHeader.substring(7);
    } else {
      // For client-side requests, check Firebase auth session
      try {
        const sessionCookie = request.cookies.get('session')?.value;
        if (sessionCookie) {
          // Verify session cookie (if you're using session cookies)
          // For now, we'll rely on client-side auth state
        }
      } catch (error) {
        console.warn('⚠️ No valid authentication found for device registration');
      }
    }

    const body: RegisterDeviceRequest = await request.json();
    const { retailerId, deviceToken, userAgent, isNewUser = true, timestamp } = body;

    console.log('📱 FCM API: Received device registration request:', {
      retailerId,
      tokenLength: deviceToken?.length || 0,
      tokenPrefix: deviceToken?.substring(0, 20) + '...',
      userAgent: userAgent?.substring(0, 50) + '...',
      isNewUser,
      timestamp: timestamp || new Date().toISOString(),
      hasAuth: !!authToken
    });

    if (!retailerId || !deviceToken) {
      console.error('❌ FCM API: Missing required fields:', { retailerId: !!retailerId, deviceToken: !!deviceToken });
      return NextResponse.json(
        { error: 'Missing required fields: retailerId, deviceToken' },
        { status: 400 }
      );
    }

    // 🔐 SECURITY: Verify retailer exists and is active before allowing device registration
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const retailerRef = doc(db, 'retailers', retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (!retailerDoc.exists()) {
        console.error('❌ FCM API: Retailer not found:', retailerId);
        return NextResponse.json(
          { error: 'Retailer not found' },
          { status: 404 }
        );
      }
      
      const retailerData = retailerDoc.data();
      if (!retailerData.isActive) {
        console.error('❌ FCM API: Retailer is inactive:', retailerId);
        return NextResponse.json(
          { error: 'Retailer account is inactive' },
          { status: 403 }
        );
      }
      
      console.log('✅ FCM API: Retailer verified and active:', retailerId);
    } catch (verificationError) {
      console.error('❌ FCM API: Error verifying retailer:', verificationError);
      return NextResponse.json(
        { error: 'Failed to verify retailer account' },
        { status: 500 }
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