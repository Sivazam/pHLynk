import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Checking retailer FCM tokens...');
    
    const { searchParams } = new URL(request.url);
    const retailerId = searchParams.get('retailerId');
    
    if (retailerId) {
      // Check specific retailer
      console.log(`🔍 Checking specific retailer: ${retailerId}`);
      
      const retailerDoc = await getDoc(doc(db, 'retailers', retailerId));
      
      if (!retailerDoc.exists()) {
        return NextResponse.json({
          error: 'Retailer not found',
          retailerId
        }, { status: 404 });
      }
      
      const retailerData = retailerDoc.data();
      const fcmDevices = retailerData.fcmDevices || [];
      const fcmToken = retailerData.fcmToken; // Old format
      
      return NextResponse.json({
        retailerId,
        retailerName: retailerData.name || 'N/A',
        fcmDevices: fcmDevices.map(device => ({
          token: device.token ? device.token.substring(0, 30) + '...' : 'N/A',
          registeredAt: device.registeredAt?.toDate?.() || 'N/A',
          lastActive: device.lastActive?.toDate?.() || 'N/A',
          userAgent: device.userAgent?.substring(0, 50) + '...' || 'N/A'
        })),
        fcmToken: fcmToken ? fcmToken.substring(0, 30) + '...' : null,
        hasOldToken: !!fcmToken,
        hasNewTokens: fcmDevices.length > 0,
        totalDevices: fcmDevices.length
      });
      
    } else {
      // Check all retailers (limit to first 10)
      console.log('🔍 Checking all retailers (limit 10)...');
      
      const retailersSnapshot = await getDocs(collection(db, 'retailers').limit(10));
      const results = [];
      
      for (const doc of retailersSnapshot.docs) {
        const retailerData = doc.data();
        const fcmDevices = retailerData.fcmDevices || [];
        const fcmToken = retailerData.fcmToken; // Old format
        
        results.push({
          retailerId: doc.id,
          retailerName: retailerData.name || 'N/A',
          phone: retailerData.phone || 'N/A',
          fcmDevices: fcmDevices.map(device => ({
            token: device.token ? device.token.substring(0, 30) + '...' : 'N/A',
            registeredAt: device.registeredAt?.toDate?.() || 'N/A',
            lastActive: device.lastActive?.toDate?.() || 'N/A',
            userAgent: device.userAgent?.substring(0, 50) + '...' || 'N/A'
          })),
          fcmToken: fcmToken ? fcmToken.substring(0, 30) + '...' : null,
          hasOldToken: !!fcmToken,
          hasNewTokens: fcmDevices.length > 0,
          totalDevices: fcmDevices.length
        });
      }
      
      return NextResponse.json({
        totalRetailers: results.length,
        retailers: results,
        summary: {
          withOldTokens: results.filter(r => r.hasOldToken).length,
          withNewTokens: results.filter(r => r.hasNewTokens).length,
          withAnyTokens: results.filter(r => r.hasOldToken || r.hasNewTokens).length,
          withoutTokens: results.filter(r => !r.hasOldToken && !r.hasNewTokens).length
        }
      });
    }
    
  } catch (error) {
    console.error('❌ DEBUG: Error checking retailer FCM:', error);
    return NextResponse.json({
      error: 'Failed to check retailer FCM tokens',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}