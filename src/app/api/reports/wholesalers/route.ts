// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Wholesalers API called')
    
    // Get user info from query parameter or header
    const searchParams = request.nextUrl.searchParams
    const userPhone = searchParams.get('phone') || request.headers.get('x-user-phone')
    
    console.log('📝 Using phone:', userPhone)
    
    if (!userPhone) {
      console.log('❌ No phone number provided')
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    // Get retailer details using phone as identifier
    console.log('🔍 Getting retailer details for phone:', userPhone)
    let retailer: any = null
    let tenantIds: string[] = []
    
    try {
      // First try to get from retailerUsers collection (primary source)
      const retailerUsersRef = collection(db, 'retailerUsers')
      const retailerUserQuery = query(retailerUsersRef, where('phone', '==', userPhone))
      const retailerUserSnapshot = await getDocs(retailerUserQuery)
      
      if (!retailerUserSnapshot.empty) {
        const retailerUserDoc = retailerUserSnapshot.docs[0]
        retailer = { id: retailerUserDoc.id, ...retailerUserDoc.data() }
        tenantIds = retailer.tenantIds || []
        console.log('✅ Retailer found from retailerUsers:', {
          id: retailer.id,
          name: retailer.name,
          tenantIds: tenantIds
        })
      } else {
        // Fallback to retailers collection
        console.log('⚠️ No retailer found in retailerUsers, checking retailers collection')
        const retailersRef = collection(db, 'retailers')
        const retailerQuery = query(retailersRef, where('phone', '==', userPhone))
        const retailerSnapshot = await getDocs(retailerQuery)
        
        if (!retailerSnapshot.empty) {
          const retailerDoc = retailerSnapshot.docs[0]
          retailer = { id: retailerDoc.id, ...retailerDoc.data() }
          tenantIds = retailer.tenantIds || []
          console.log('✅ Retailer found from retailers:', {
            id: retailer.id,
            name: retailer.name,
            tenantIds: tenantIds
          })
        } else {
          console.log('❌ No retailer found for phone:', userPhone)
          return NextResponse.json({
            success: true,
            data: { wholesalers: [] },
          });
        }
      }
    } catch (retailerError) {
      console.error('❌ Error fetching retailer:', retailerError)
      return NextResponse.json({
        success: true,
        data: { wholesalers: [] },
      });
    }

    if (tenantIds.length === 0) {
      console.log('⚠️ No tenant IDs found for retailer')
      return NextResponse.json({
        success: true,
        data: { wholesalers: [] },
      });
    }

    // Fetch wholesaler details from tenants collection
    console.log('🔍 Fetching wholesalers from tenants collection')
    const wholesalers: any[] = [];
    
    for (const tenantId of tenantIds) {
      try {
        console.log('🔍 Fetching wholesaler for tenant:', tenantId)
        const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
        if (tenantDoc.exists()) {
          const tenantData = tenantDoc.data();
          const wholesaler = {
            id: tenantId,
            name: tenantData.name || 'Unknown Wholesaler',
            email: tenantData.email || '',
          };
          console.log('✅ Found wholesaler:', wholesaler)
          wholesalers.push(wholesaler);
        } else {
          console.log('⚠️ No tenant document found for tenant:', tenantId)
        }
      } catch (tenantError) {
        console.error('❌ Error fetching tenant:', tenantId, tenantError);
      }
    }

    console.log('📊 Final wholesalers list:', wholesalers)

    return NextResponse.json({
      success: true,
      data: {
        wholesalers: wholesalers.map(w => ({
          id: w.id,
          name: w.name,
          email: w.email,
        })),
      },
    });

  } catch (error) {
    console.error('❌ General error in wholesalers API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wholesalers' },
      { status: 500 }
    );
  }
}