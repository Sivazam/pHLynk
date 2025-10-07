import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { retailerId, phone } = body;

    console.log('🔍 Debug FCM Registration:', { retailerId, phone });

    const debugInfo = {
      retailerId,
      phone,
      checks: []
    };

    // Check 1: Does retailer document exist?
    if (retailerId) {
      const retailerRef = doc(db, 'retailers', retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      debugInfo.checks.push({
        check: 'Retailer document exists',
        result: retailerDoc.exists(),
        data: retailerDoc.exists() ? {
          id: retailerDoc.id,
          name: retailerDoc.data()?.name,
          phone: retailerDoc.data()?.phone,
          isActive: retailerDoc.data()?.isActive,
          fcmDevices: retailerDoc.data()?.fcmDevices || []
        } : null
      });
    }

    // Check 2: Find retailer by phone number
    if (phone) {
      const retailersRef = collection(db, 'retailers');
      const q = query(retailersRef, where('phone', '==', phone));
      const querySnapshot = await getDocs(q);
      
      debugInfo.checks.push({
        check: 'Find retailer by phone',
        result: !querySnapshot.empty,
        data: querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data()?.name,
          phone: doc.data()?.phone,
          isActive: doc.data()?.isActive,
          fcmDevices: doc.data()?.fcmDevices || []
        }))
      });
    }

    // Check 3: Check retailerUsers collection
    if (phone) {
      const uid = `retailer_${phone.replace(/\D/g, '')}`;
      const retailerUserRef = doc(db, 'retailerUsers', uid);
      const retailerUserDoc = await getDoc(retailerUserRef);
      
      debugInfo.checks.push({
        check: 'Retailer user document exists',
        result: retailerUserDoc.exists(),
        data: retailerUserDoc.exists() ? {
          uid: retailerUserDoc.id,
          retailerId: retailerUserDoc.data()?.retailerId,
          phone: retailerUserDoc.data()?.phone,
          isActive: retailerUserDoc.data()?.isActive
        } : null
      });
    }

    // Check 4: List all retailers (for debugging)
    const allRetailersRef = collection(db, 'retailers');
    const allRetailersSnapshot = await getDocs(allRetailersRef);
    
    debugInfo.checks.push({
      check: 'All retailers count',
      result: allRetailersSnapshot.size,
      data: allRetailersSnapshot.docs.slice(0, 5).map(doc => ({
        id: doc.id,
        name: doc.data()?.name,
        phone: doc.data()?.phone,
        isActive: doc.data()?.isActive
      }))
    });

    return NextResponse.json({
      success: true,
      debugInfo
    });

  } catch (error) {
    console.error('❌ Debug FCM registration error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}