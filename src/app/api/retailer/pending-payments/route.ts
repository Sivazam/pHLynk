// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { retailerService, paymentService } from '@/services/firestore'
import { toDate as convertToDate } from '@/lib/timestamp-utils'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'

// Function to fetch wholesaler name by tenant ID
async function getWholesalerName(tenantId: string): Promise<string> {
  try {
    const tenantDoc = await getDoc(doc(db, 'tenants', tenantId))
    if (tenantDoc.exists()) {
      return tenantDoc.data().name || 'Unknown Wholesaler'
    }
    return 'Unknown Wholesaler'
  } catch (error) {
    console.error('Error fetching wholesaler name:', error)
    return 'Unknown Wholesaler'
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user info from query parameter or header (for testing/development)
    const searchParams = request.nextUrl.searchParams
    const userPhone = searchParams.get('phone') || request.headers.get('x-user-phone')
    
    // For development, if no phone provided, use the test retailer phone
    const phone = userPhone || '9014882779'
    
    console.log('💳 Pending Payments API: Using phone:', phone)
    
    if (!phone) {
      console.log('❌ No phone number provided')
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const wholesalerId = searchParams.get('wholesalerId')

    // Get retailer details - query directly to find retailer and their tenant associations
    let retailer: any = null
    let tenantIds: string[] = []
    
    const retailersRef = collection(db, 'retailers')
    const retailerQuery = query(retailersRef, where('phone', '==', phone))
    const retailerSnapshot = await getDocs(retailerQuery)
    
    if (!retailerSnapshot.empty) {
      const retailerDoc = retailerSnapshot.docs[0]
      retailer = { id: retailerDoc.id, ...retailerDoc.data() }
      tenantIds = retailer.tenantIds || []
      console.log('💳 Pending Payments API: Found retailer:', retailer.name)
    } else {
      console.log('💳 Pending Payments API: No retailer found for phone:', phone)
    }

    if (!retailer) {
      return NextResponse.json({ 
        payments: [],
        message: 'No retailer profile found'
      }, { status: 404 })
    }

    // Get all payments for this retailer across all tenants
    const paymentsRef = collection(db, 'payments')
    const paymentsQuery = query(paymentsRef, where('retailerId', '==', retailer.id))
    const paymentSnapshot = await getDocs(paymentsQuery)
    
    let payments = paymentSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any))

    // Apply wholesaler filter if provided
    if (wholesalerId && wholesalerId !== 'all') {
      payments = payments.filter(payment => 
        (payment.tenantIds && payment.tenantIds.includes(wholesalerId)) || 
        payment.tenantId === wholesalerId
      );
    }

    // Filter payments for pending status
    const pendingPayments = payments.filter(payment => 
      payment.state === 'INITIATED' || payment.state === 'OTP_SENT' || payment.state === 'OTP_VERIFIED'
    )

    console.log('💳 Pending Payments API: Found', pendingPayments.length, 'pending payments')

    // Sort payments by date (newest first)
    pendingPayments.sort((a, b) => {
      const dateA = a.createdAt ? convertToDate(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? convertToDate(b.createdAt).getTime() : 0
      return dateB - dateA
    })

    // Fetch wholesaler names for payments that don't have initiatedByTenantName
    const uniqueTenantIds = [...new Set(pendingPayments.map(payment => payment.tenantId).filter(Boolean))]
    const wholesalerNameCache = new Map()
    
    for (const tenantId of uniqueTenantIds) {
      const wholesalerName = await getWholesalerName(tenantId)
      wholesalerNameCache.set(tenantId, wholesalerName)
    }

    return NextResponse.json({
      payments: pendingPayments.map(payment => {
        const wholesalerId = payment.tenantId
        const wholesalerName = payment.initiatedByTenantName || 
                              (wholesalerId ? wholesalerNameCache.get(wholesalerId) : null) || 
                              'Unknown Wholesaler'
        
        return {
          id: payment.id,
          amount: payment.totalPaid || 0,
          method: payment.method,
          date: payment.createdAt ? convertToDate(payment.createdAt).toISOString() : new Date().toISOString(),
          lineWorker: {
            name: payment.lineWorkerName || 'Unknown',
            phone: ''
          },
          retailer: {
            name: payment.retailerName || 'Unknown'
          },
          wholesaler: {
            id: wholesalerId,
            name: wholesalerName
          }
        }
      }),
      count: pendingPayments.length
    })

  } catch (error) {
    console.error('Error fetching pending payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending payments' },
      { status: 500 }
    )
  }
}