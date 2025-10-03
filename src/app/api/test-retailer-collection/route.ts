// Test endpoint to check retailer collection
import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';

export async function GET() {
  try {
    console.log('🔍 Testing retailer collection access...');
    
    // Test 1: Get all retailers
    const retailersRef = collection(db, COLLECTIONS.RETAILERS);
    const retailersSnapshot = await getDocs(retailersRef);
    
    console.log(`📊 Found ${retailersSnapshot.size} retailers in total`);
    
    const retailers: any[] = [];
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
    
    // Test 2: Try to find a specific retailer by phone number
    const testPhone = '6303955759'; // The phone number from the user ID
    const phoneQuery = query(retailersRef, where('phone', '==', testPhone));
    const phoneSnapshot = await getDocs(phoneQuery);
    
    console.log(`🔍 Search for phone ${testPhone}: Found ${phoneSnapshot.size} matches`);
    
    let phoneMatch: any = null;
    if (!phoneSnapshot.empty) {
      const phoneDoc = phoneSnapshot.docs[0];
      phoneMatch = {
        id: phoneDoc.id,
        ...phoneDoc.data()
      };
    }
    
    // Test 3: Check all available phone numbers
    const allPhones = retailers.map(r => r.phone);
    console.log('📞 Available phone numbers:', allPhones);
    
    // Test 4: Try to find any retailer that might match the user ID pattern
    const userId = 'ofFeXb8SjWOjugla8ZmrCfvP2b63';
    console.log('🔍 Looking for retailer that might match Firebase user ID:', userId);
    
    return NextResponse.json({
      success: true,
      totalRetailers: retailersSnapshot.size,
      retailers: retailers, // Return all for debugging
      phoneSearch: {
        phone: testPhone,
        found: phoneSnapshot.size > 0,
        data: phoneMatch
      },
      allPhones: allPhones,
      debugUserId: userId
    });
    
  } catch (error) {
    console.error('❌ Error testing retailer collection:', error);
    return NextResponse.json(
      { error: 'Failed to test retailer collection', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}