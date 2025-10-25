// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Wholesalers API called')
    
    const session = await getServerSession(authOptions);
    console.log('📝 Session:', session ? 'Found' : 'Not found')
    
    if (!session) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'Unauthorized - No session' }, { status: 401 });
    }

    console.log('👤 User role:', session.user?.role)
    
    if (!session.user || session.user.role !== 'RETAILER') {
      console.log('❌ User not authorized or not a retailer')
      return NextResponse.json({ error: 'Unauthorized - Not a retailer' }, { status: 401 });
    }

    // Get retailer details using phone as identifier (same as dashboard-stats)
    console.log('🔍 Getting retailer details for email:', session.user.email)
    let retailer: any = null
    let tenantIds: string[] = []
    
    try {
      const retailersRef = collection(db, 'retailers')
      const retailerQuery = query(retailersRef, where('phone', '==', session.user.email || ''))
      const retailerSnapshot = await getDocs(retailerQuery)
      
      if (!retailerSnapshot.empty) {
        const retailerDoc = retailerSnapshot.docs[0]
        retailer = { id: retailerDoc.id, ...retailerDoc.data() }
        tenantIds = retailer.tenantIds || []
        console.log('✅ Retailer found:', {
          id: retailer.id,
          name: retailer.name,
          tenantIds: tenantIds
        })
      } else {
        console.log('❌ No retailer found for email:', session.user.email)
        return NextResponse.json({
          success: true,
          data: { wholesalers: [] },
        });
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