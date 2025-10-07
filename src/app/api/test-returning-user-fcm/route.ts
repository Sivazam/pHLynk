import { NextRequest, NextResponse } from 'next/server';
import { fcmService } from '@/lib/fcm-service';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Test API to simulate returning user FCM flow
 * This demonstrates how FCM tokens are handled for users who were already logged in
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, simulateReturningUser = true } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log(`🧪 Testing FCM flow for ${simulateReturningUser ? 'returning' : 'new'} user:`, userId);

    const testResults = {
      userId,
      userType: 'returning',
      steps: [] as any[],
      fcmToken: null as string | null,
      success: false
    };

    // Step 1: Check if user exists
    testResults.steps.push({
      step: 1,
      action: 'Checking user existence',
      status: 'running'
    });

    const userRef = doc(db, 'retailers', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      testResults.steps[0].status = 'failed';
      testResults.steps[0].error = 'User not found';
      return NextResponse.json(testResults);
    }

    testResults.steps[0].status = 'completed';
    testResults.steps[0].data = {
      userExists: true,
      userData: {
        email: userDoc.data().email,
        currentDevices: userDoc.data().fcmDevices?.length || 0
      }
    };

    // Step 2: Simulate FCM token generation (what happens on client-side)
    testResults.steps.push({
      step: 2,
      action: 'Simulating FCM token generation',
      status: 'running'
    });

    // Simulate a new FCM token
    const simulatedFCMToken = `simulated_fcm_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    testResults.fcmToken = simulatedFCMToken;

    testResults.steps[1].status = 'completed';
    testResults.steps[1].data = {
      tokenGenerated: simulatedFCMToken.substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    };

    // Step 3: Check if token already exists
    testResults.steps.push({
      step: 3,
      action: 'Checking if token already registered',
      status: 'running'
    });

    const existingDevices = userDoc.data().fcmDevices || [];
    const tokenExists = existingDevices.some((device: any) => device.token === simulatedFCMToken);

    testResults.steps[2].status = 'completed';
    testResults.steps[2].data = {
      tokenExists,
      existingDeviceCount: existingDevices.length
    };

    // Step 4: Register or update token
    testResults.steps.push({
      step: 4,
      action: tokenExists ? 'Updating existing token' : 'Registering new token',
      status: 'running'
    });

    if (tokenExists) {
      // Update last active timestamp
      const updatedDevices = existingDevices.map((device: any) =>
        device.token === simulatedFCMToken
          ? { ...device, lastActive: new Date() }
          : device
      );

      await updateDoc(userRef, { fcmDevices: updatedDevices });
      
      testResults.steps[3].status = 'completed';
      testResults.steps[3].data = {
        action: 'updated',
        lastActive: new Date().toISOString()
      };
    } else {
      // Register new device
      const newDevice = {
        token: simulatedFCMToken,
        userAgent: 'Test Browser/Simulated Returning User',
        registeredAt: new Date(),
        lastActive: new Date()
      };

      await updateDoc(userRef, {
        fcmDevices: [...existingDevices, newDevice]
      });

      testResults.steps[3].status = 'completed';
      testResults.steps[3].data = {
        action: 'registered',
        deviceInfo: {
          userAgent: newDevice.userAgent,
          registeredAt: newDevice.registeredAt
        }
      };
    }

    // Step 5: Verify final state
    testResults.steps.push({
      step: 5,
      action: 'Verifying final device state',
      status: 'running'
    });

    const finalUserDoc = await getDoc(userRef);
    const finalDevices = finalUserDoc.data()?.fcmDevices || [];

    testResults.steps[4].status = 'completed';
    testResults.steps[4].data = {
      finalDeviceCount: finalDevices.length,
      devices: finalDevices.map((d: any) => ({
        token: d.token.substring(0, 30) + '...',
        lastActive: d.lastActive,
        userAgent: d.userAgent
      }))
    };

    testResults.success = true;

    return NextResponse.json({
      success: true,
      testResults,
      summary: {
        userId,
        userType: simulateReturningUser ? 'returning' : 'new',
        fcmToken: simulatedFCMToken.substring(0, 50) + '...',
        tokenAction: tokenExists ? 'updated' : 'registered',
        totalDevices: finalDevices.length,
        testCompletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error in returning user FCM test:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check current FCM status for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Checking FCM status for user:`, userId);

    const userRef = doc(db, 'retailers', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const devices = userData.fcmDevices || [];

    return NextResponse.json({
      userId,
      email: userData.email,
      fcmStatus: {
        deviceCount: devices.length,
        devices: devices.map((device: any, index: number) => ({
          index,
          token: device.token.substring(0, 30) + '...',
          userAgent: device.userAgent,
          registeredAt: device.registeredAt,
          lastActive: device.lastActive,
          isActive: isDeviceActive(device.lastActive)
        })),
        hasActiveDevices: devices.some((device: any) => isDeviceActive(device.lastActive))
      }
    });

  } catch (error) {
    console.error('❌ Error checking FCM status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to check if device is active (used within last 30 days)
 */
function isDeviceActive(lastActive: any): boolean {
  if (!lastActive) return false;
  
  const lastActiveDate = lastActive.toDate ? lastActive.toDate() : new Date(lastActive);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  return lastActiveDate > thirtyDaysAgo;
}