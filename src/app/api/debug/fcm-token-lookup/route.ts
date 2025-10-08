import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { retailerId } = body;

    if (!retailerId) {
      return NextResponse.json(
        { error: 'Missing retailerId' },
        { status: 400 }
      );
    }

    console.log('🔍 Debugging FCM token lookup for retailer:', retailerId);

    // Step 1: Check if retailer exists in retailers collection
    const retailerDoc = await getDoc(doc(db, 'retailers', retailerId));
    
    if (retailerDoc.exists()) {
      const retailerData = retailerDoc.data();
      const fcmDevices = retailerData.fcmDevices || [];
      
      console.log('✅ Found retailer in retailers collection:', {
        retailerId,
        name: retailerData.name,
        fcmDevicesCount: fcmDevices.length,
        fcmDevices: fcmDevices.map(d => ({
          tokenPrefix: d.token ? d.token.substring(0, 20) + '...' : 'no-token',
          isActive: d.isActive,
          lastActive: d.lastActive
        }))
      });

      // Find active devices
      const activeDevices = fcmDevices.filter(device => device.isActive);
      
      if (activeDevices.length > 0) {
        console.log('✅ Found active FCM devices:', activeDevices.length);
        return NextResponse.json({
          success: true,
          retailerId,
          collection: 'retailers',
          fcmDevices: activeDevices,
          message: `Found ${activeDevices.length} active devices`
        });
      } else {
        console.log('⚠️ No active FCM devices found');
        return NextResponse.json({
          success: false,
          retailerId,
          collection: 'retailers',
          fcmDevices: [],
          message: 'No active devices found'
        });
      }
    } else {
      console.log('❌ Retailer not found in retailers collection');
      
      // Step 2: Check retailerUsers collection as fallback
      const retailerUsersQuery = query(
        collection(db, 'retailerUsers'),
        where('retailerId', '==', retailerId)
      );
      const retailerUsersDocs = await getDocs(retailerUsersQuery);
      
      if (!retailerUsersDocs.empty) {
        const retailerUserDoc = retailerUsersDocs.docs[0];
        const retailerUserData = retailerUserDoc.data();
        
        console.log('✅ Found retailerUser in retailerUsers collection:', {
          uid: retailerUserDoc.id,
          retailerId: retailerUserData.retailerId,
          name: retailerUserData.name,
          phone: retailerUserData.phone
        });
        
        return NextResponse.json({
          success: false,
          retailerId,
          collection: 'retailerUsers',
          foundInRetailerUsers: true,
          retailerUserId: retailerUserDoc.id,
          message: 'Found in retailerUsers but not in retailers - FCM tokens should be in retailers collection'
        });
      } else {
        console.log('❌ Retailer not found in any collection');
        return NextResponse.json({
          success: false,
          retailerId,
          message: 'Retailer not found in retailers or retailerUsers collections'
        });
      }
    }

  } catch (error) {
    console.error('❌ Error debugging FCM token:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}