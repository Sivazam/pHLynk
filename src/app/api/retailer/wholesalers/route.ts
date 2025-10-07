// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { retailerService } from '@/services/firestore'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'RETAILER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const retailerId = session.user.id

    // Get retailer details - query directly to find retailer and their tenant associations
    let retailer: any = null
    let tenantIds: string[] = []
    
    const retailersRef = collection(db, 'retailers')
    const retailerQuery = query(retailersRef, where('phone', '==', session.user.email || ''))
    const retailerSnapshot = await getDocs(retailerQuery)
    
    if (!retailerSnapshot.empty) {
      const retailerDoc = retailerSnapshot.docs[0]
      retailer = { id: retailerDoc.id, ...retailerDoc.data() }
      tenantIds = retailer.tenantIds || []
    }

    if (!retailer) {
      return NextResponse.json({ 
        wholesalers: [],
        message: 'No retailer profile found'
      }, { status: 404 })
    }

    // Get wholesaler details for each tenantId
    const wholesalers: any[] = []
    
    for (const tenantId of tenantIds) {
      try {
        const tenantDoc = await getDoc(doc(db, 'tenants', tenantId))
        if (tenantDoc.exists()) {
          const tenantData = tenantDoc.data()
          wholesalers.push({
            id: tenantId,
            name: tenantData.name || 'Unknown Wholesaler',
            status: tenantData.status || 'UNKNOWN',
            subscriptionStatus: tenantData.subscriptionStatus || 'UNKNOWN'
          })
        }
      } catch (error) {
        console.error(`Error fetching wholesaler ${tenantId}:`, error)
      }
    }

    return NextResponse.json({
      wholesalers,
      count: wholesalers.length
    })

  } catch (error) {
    console.error('Error fetching wholesalers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wholesalers' },
      { status: 500 }
    )
  }
}