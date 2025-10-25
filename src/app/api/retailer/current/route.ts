// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    console.log('🏪 Current Retailer API: Starting request')
    
    // Get user info from query parameter or header (for testing/development)
    const searchParams = request.nextUrl.searchParams
    const userPhone = searchParams.get('phone') || request.headers.get('x-user-phone')
    
    // For development, if no phone provided, use the test retailer phone
    const phone = userPhone || '9014882779'
    
    console.log('🏪 Current Retailer API: Using phone:', phone)
    
    if (!phone) {
      console.log('❌ No phone number provided')
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    // Get retailer details from retailers collection using phone as identifier
    const retailersRef = collection(db, 'retailers')
    const retailerQuery = query(retailersRef, where('phone', '==', phone))
    const retailerSnapshot = await getDocs(retailerQuery)
    
    if (!retailerSnapshot.empty) {
      const retailerDoc = retailerSnapshot.docs[0]
      const retailerData = { id: retailerDoc.id, ...retailerDoc.data() } as any
      console.log('🏪 Current Retailer API: Found retailer:', retailerData.name)
      
      return NextResponse.json({
        success: true,
        retailerId: retailerData.id,
        retailerData: retailerData
      })
    }

    console.log('🏪 Current Retailer API: No retailer found for phone:', phone)
    return NextResponse.json({
      success: false,
      error: 'No retailer profile found'
    }, { status: 404 })

  } catch (error) {
    console.error('Error fetching current retailer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch retailer information' },
      { status: 500 }
    )
  }
}