// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'RETAILER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const retailerId = session.user.id
    console.log('🏪 Current Retailer API: session.user.id:', retailerId)

    // Get retailer details from retailers collection using phone as identifier
    const retailersRef = collection(db, 'retailers')
    const retailerQuery = query(retailersRef, where('phone', '==', session.user.email || ''))
    const retailerSnapshot = await getDocs(retailerQuery)
    
    if (!retailerSnapshot.empty) {
      const retailerDoc = retailerSnapshot.docs[0]
      const retailerData = { id: retailerDoc.id, ...retailerDoc.data() } as any
      console.log('🏪 Current Retailer API: Found retailer:', retailerData.name)
      
      return NextResponse.json({
        success: true,
        retailerId: retailerId,
        retailerData: retailerData
      })
    }

    console.log('🏪 Current Retailer API: No retailer found for email:', session.user.email)
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