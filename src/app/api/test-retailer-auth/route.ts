// Test endpoint to simulate retailer authentication
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }
    
    console.log('🔍 Testing retailer authentication for phone:', phone);
    
    // Step 1: Find retailer by phone number (same as our AuthContext logic)
    const retailersRef = collection(db, COLLECTIONS.RETAILERS);
    const phoneQuery = query(retailersRef, where('phone', '==', phone));
    const phoneSnapshot = await getDocs(phoneQuery);
    
    if (phoneSnapshot.empty) {
      return NextResponse.json({ 
        error: 'No retailer found with this phone number',
        phone: phone,
        found: false
      }, { status: 404 });
    }
    
    const retailerDoc = phoneSnapshot.docs[0];
    const retailerData = retailerDoc.data();
    
    console.log('✅ Found retailer:', retailerData);
    
    // Step 2: Check if retailer is active (same as AuthContext)
    if (retailerData.hasOwnProperty('isActive') && !retailerData.isActive) {
      return NextResponse.json({ 
        error: 'Retailer account is inactive',
        retailer: retailerData
      }, { status: 403 });
    }
    
    // Step 3: Create AuthUser object (same as AuthContext)
    const authUser = {
      uid: `test_${phone}`, // Simulate Firebase UID
      email: `retailer_${phone}@pharmalynk.local`,
      displayName: retailerData.name || 'Retailer',
      photoURL: undefined,
      tenantId: retailerData.tenantId,
      tenantStatus: 'ACTIVE',
      roles: ['RETAILER'],
      isRetailer: true,
      retailerId: retailerDoc.id, // Use document ID
      phone: retailerData.phone
    };
    
    console.log('🎯 Created AuthUser for retailer:', authUser);
    
    return NextResponse.json({
      success: true,
      message: 'Retailer authentication simulation successful',
      retailer: {
        id: retailerDoc.id,
        ...retailerData
      },
      authUser: authUser
    });
    
  } catch (error) {
    console.error('❌ Error testing retailer authentication:', error);
    return NextResponse.json(
      { error: 'Failed to test retailer authentication', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET method to show available phone numbers for testing
export async function GET() {
  try {
    const retailersRef = collection(db, COLLECTIONS.RETAILERS);
    const retailersSnapshot = await getDocs(retailersRef);
    
    const retailers = [];
    retailersSnapshot.forEach((doc) => {
      const data = doc.data();
      retailers.push({
        id: doc.id,
        name: data.name,
        phone: data.phone,
        isActive: data.isActive,
        tenantId: data.tenantId
      });
    });
    
    return NextResponse.json({
      message: 'Available retailers for testing',
      retailers: retailers
    });
    
  } catch (error) {
    console.error('❌ Error getting retailers:', error);
    return NextResponse.json(
      { error: 'Failed to get retailers' },
      { status: 500 }
    );
  }
}