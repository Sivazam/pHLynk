// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'RETAILER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use retailerId from session instead of querying by phone
    const retailerId = session.user.retailerId || session.user.id

    // Get retailer details directly by ID
    let retailer: any = null
    let tenantIds: string[] = []
    
    const retailerDoc = await getDoc(doc(db, 'retailers', retailerId))
    
    if (retailerDoc.exists()) {
      retailer = { id: retailerDoc.id, ...retailerDoc.data() }
      tenantIds = retailer.tenantIds || retailer.tenantId ? [retailer.tenantId] : []
    } else {
      // Fallback: try to get from retailerUsers collection
      const retailerUsersRef = collection(db, 'retailerUsers')
      const retailerUserQuery = query(retailerUsersRef, where('retailerId', '==', retailerId))
      const retailerUserSnapshot = await getDocs(retailerUserQuery)
      
      if (!retailerUserSnapshot.empty) {
        const retailerUserDoc = retailerUserSnapshot.docs[0]
        const retailerUserData = retailerUserDoc.data()
        tenantIds = retailerUserData.tenantIds || retailerUserData.tenantId ? [retailerUserData.tenantId] : []
        
        // Create a basic retailer object from user data
        retailer = {
          id: retailerId,
          name: retailerUserData.name,
          phone: retailerUserData.phone,
          tenantIds: tenantIds
        }
      }
    }

    if (!retailer) {
      return NextResponse.json({ 
        wholesalers: [],
        message: 'No retailer profile found'
      }, { status: 404 })
    }

    console.log('🔍 Retailer wholesalers API:', {
      retailerId,
      retailerName: retailer.name,
      tenantIds,
      tenantId: retailer.tenantId
    })

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
      count: wholesalers.length,
      retailerId: retailer.id,
      retailerName: retailer.name,
      debug: {
        tenantIds,
        wholesalerAssignments: Object.keys(retailer.wholesalerAssignments || {})
      }
    })

  } catch (error) {
    console.error('Error fetching wholesalers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wholesalers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}