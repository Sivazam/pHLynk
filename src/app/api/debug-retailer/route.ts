import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const retailerId = searchParams.get('retailerId');

    if (!phone && !retailerId) {
      return NextResponse.json(
        { error: 'Please provide either phone or retailerId parameter' },
        { status: 400 }
      );
    }

    const results: any = {};

    // Check retailerUsers collection
    if (phone) {
      const uid = `retailer_${phone.replace(/\D/g, '')}`;
      const userRef = doc(db, 'retailerUsers', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        results.retailerUser = {
          id: userDoc.id,
          data: userDoc.data()
        };
      } else {
        results.retailerUser = null;
      }
    }

    // Check retailers collection
    if (retailerId) {
      const retailerRef = doc(db, 'retailers', retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (retailerDoc.exists()) {
        results.retailer = {
          id: retailerDoc.id,
          data: retailerDoc.data()
        };
      } else {
        results.retailer = null;
      }

      // Also check for retailer user by retailerId
      const usersRef = collection(db, 'retailerUsers');
      const q = query(usersRef, where('retailerId', '==', retailerId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        results.retailerUsersByRetailerId = [];
        querySnapshot.forEach((doc) => {
          results.retailerUsersByRetailerId.push({
            id: doc.id,
            data: doc.data()
          });
        });
      } else {
        results.retailerUsersByRetailerId = null;
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: 'Debug information retrieved successfully'
    });

  } catch (error) {
    console.error('Error in debug API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}