import { NextRequest, NextResponse } from 'next/server';
import { sendOTPViaFCM } from '@/lib/fcm-service';

interface SendOTPRequest {
  retailerId: string;
  otp: string;
  amount: number;
  paymentId: string;
  lineWorkerName?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'AAx2VtFVmIMRG0LJYhwg'; // Test user ID
    const userType = searchParams.get('userType') || 'wholesaler'; // Test user type

    console.log(`🧪 Testing FCM architecture for ${userType}: ${userId}`);

    const results = {
      testUser: { userId, userType },
      collectionMapping: null as any,
      deviceRetrieval: null as any,
      serviceTest: null as any,
      architectureValidation: null as any
    };

    // Test 1: Collection Mapping
    try {
      const collectionName = getCollectionNameForUserType(userType);
      results.collectionMapping = {
        userType,
        mappedCollection: collectionName,
        success: true
      };
      console.log(`✅ Collection mapping: ${userType} → ${collectionName}`);
    } catch (error) {
      results.collectionMapping = {
        userType,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
      console.log(`❌ Collection mapping failed:`, error);
    }

    // Test 2: Device Retrieval from Firestore
    if (results.collectionMapping?.success) {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        const collectionName = results.collectionMapping.mappedCollection;
        const userRef = doc(db, collectionName, userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const devices = userData.fcmDevices || [];
          
          results.deviceRetrieval = {
            collection: collectionName,
            userExists: true,
            deviceCount: devices.length,
            devices: devices.map((d: any) => ({
              token: d.token?.substring(0, 20) + '...',
              userAgent: d.userAgent,
              registeredAt: d.registeredAt,
              lastActive: d.lastActive
            })),
            success: true
          };
          console.log(`✅ Device retrieval: Found ${devices.length} devices`);
        } else {
          results.deviceRetrieval = {
            collection: collectionName,
            userExists: false,
            deviceCount: 0,
            success: false,
            error: 'User document not found'
          };
          console.log(`❌ Device retrieval: User not found in ${collectionName}`);
        }
      } catch (error) {
        results.deviceRetrieval = {
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        };
        console.log(`❌ Device retrieval failed:`, error);
      }
    }

    // Test 3: FCM Service Test
    try {
      const fcmServiceModule = await import('@/lib/fcm-service');
      const devices = await fcmServiceModule.fcmService.getUserDevices(userId, userType as any);
      results.serviceTest = {
        serviceDevicesFound: devices.length,
        devices: devices.map(d => ({
          token: d.token?.substring(0, 20) + '...',
          userAgent: d.userAgent,
          registeredAt: d.registeredAt,
          lastActive: d.lastActive
        })),
        success: true
      };
      console.log(`✅ FCM Service: Found ${devices.length} devices`);
    } catch (error) {
      results.serviceTest = {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
      console.log(`❌ FCM Service test failed:`, error);
    }

    // Test 4: Architecture Validation
    const firestoreDevices = results.deviceRetrieval?.devices || [];
    const serviceDevices = results.serviceTest?.devices || [];
    
    results.architectureValidation = {
      firestoreDeviceCount: firestoreDevices.length,
      serviceDeviceCount: serviceDevices.length,
      devicesMatch: firestoreDevices.length === serviceDevices.length,
      collectionMappingCorrect: results.collectionMapping?.success || false,
      userExistsInFirestore: results.deviceRetrieval?.userExists || false,
      overallSuccess: (
        results.collectionMapping?.success &&
        results.deviceRetrieval?.success &&
        results.serviceTest?.success &&
        firestoreDevices.length === serviceDevices.length
      )
    };

    console.log(`🏁 Architecture test completed. Overall success: ${results.architectureValidation.overallSuccess}`);

    return NextResponse.json({
      success: true,
      message: 'FCM architecture test completed',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('FCM architecture test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SendOTPRequest = await request.json();
    const { retailerId, otp, amount, paymentId, lineWorkerName } = body;

    if (!retailerId || !otp || !amount || !paymentId) {
      return NextResponse.json(
        { error: 'Missing required fields: retailerId, otp, amount, paymentId' },
        { status: 400 }
      );
    }

    // Get retailer name for better notification
    let retailerName = 'Retailer';
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const retailerRef = doc(db, 'retailers', retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (retailerDoc.exists()) {
        retailerName = retailerDoc.data()?.businessName || retailerDoc.data()?.name || retailerName;
      }
    } catch (error) {
      console.warn('Error fetching retailer name:', error);
    }

    const result = await sendOTPViaFCM(
      retailerId,
      otp,
      retailerName,
      paymentId,
      amount,
      lineWorkerName
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        sentCount: result.sentCount
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in FCM send-otp API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to test collection mapping
function getCollectionNameForUserType(userType: string): string {
  switch (userType) {
    case 'retailer':
      return 'retailers';
    case 'wholesaler':
    case 'wholesaler_admin':
    case 'super_admin':
      return 'tenants';
    case 'line_worker':
      return 'users';
    default:
      throw new Error(`Unknown user type: ${userType}`);
  }
}