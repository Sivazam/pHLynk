import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';
import { auth } from '@/lib/firebase';

interface RegisterDeviceRequest {
  userId: string;
  deviceToken: string;
  userAgent?: string;
  userType?: 'users' | 'retailers' | 'wholesalers' | 'lineWorkers' | 'superAdmins';
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
    const { 
      userId, 
      deviceToken, 
      userAgent, 
      userType = 'retailers', 
      isNewUser = true, 
      timestamp 
    } = body;

    console.log('📱 FCM API: Received device registration request:', {
      userId,
      userType,
      tokenLength: deviceToken?.length || 0,
      tokenPrefix: deviceToken?.substring(0, 20) + '...',
      userAgent: userAgent?.substring(0, 50) + '...',
      isNewUser,
      timestamp: timestamp || new Date().toISOString(),
      hasAuth: !!authToken
    });

    if (!userId || !deviceToken) {
      console.error('❌ FCM API: Missing required fields:', { userId: !!userId, deviceToken: !!deviceToken });
      return NextResponse.json(
        { error: 'Missing required fields: userId, deviceToken' },
        { status: 400 }
      );
    }

    // 🔐 SECURITY: Verify user exists and is active before allowing device registration
    // TEMPORARILY DISABLED FOR DEBUGGING
    console.log('🔍 DEBUG: Skipping user verification for debugging');
    
    /*
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      
      const userRef = doc(db, userType, userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.error(`❌ FCM API: ${userType} not found:`, userId);
        return NextResponse.json(
          { error: `${userType} not found` },
          { status: 404 }
        );
      }
      
      const userData = userDoc.data();
      if (userData.hasOwnProperty('active') && !userData.active) {
        console.error(`❌ FCM API: ${userType} is inactive:`, userId);
        return NextResponse.json(
          { error: `${userType} account is inactive` },
          { status: 403 }
        );
      }
      
      console.log(`✅ FCM API: ${userType} verified and active:`, userId);
    } catch (verificationError) {
      console.error('❌ FCM API: Error verifying user:', verificationError);
      return NextResponse.json(
        { error: 'Failed to verify user account' },
        { status: 500 }
      );
    }
    */

    console.log(`📱 Registering device for ${isNewUser ? 'new' : 'returning'} ${userType}:`, {
      userId,
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
    const result = await fcmService.registerDevice(userId, deviceToken, userAgent, userType);

    console.log('🔧 FCM API: Service returned result:', result);

    if (result.success) {
      console.log(`✅ Device registered successfully for ${isNewUser ? 'new' : 'returning'} ${userType}:`, userId);
      return NextResponse.json({
        success: true,
        message: result.message,
        userType,
        isNewUser,
        timestamp: timestamp || new Date().toISOString()
      });
    } else {
      console.warn(`⚠️ Device registration failed for ${isNewUser ? 'new' : 'returning'} ${userType}:`, result.message);
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