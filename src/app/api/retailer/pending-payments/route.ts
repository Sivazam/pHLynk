// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { retailerService, paymentService } from '@/services/firestore'
import { toDate as convertToDate } from '@/lib/timestamp-utils'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'RETAILER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const retailerId = session.user.id
    const { searchParams } = new URL(request.url)
    const wholesalerId = searchParams.get('wholesalerId')

    // Get retailer details - query directly to find retailer and their tenant associations
    let retailer = null
    let tenantIds = []
    
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
        payments: [],
        message: 'No retailer profile found'
      }, { status: 404 })
    }

    // Get all payments for this retailer across all tenants
    const paymentsRef = collection(db, 'payments')
    const paymentsQuery = query(paymentsRef, where('retailerId', '==', retailerId))
    const paymentSnapshot = await getDocs(paymentsQuery)
    
    let payments = paymentSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any))

    // Apply wholesaler filter if provided
    if (wholesalerId && wholesalerId !== 'all') {
      payments = payments.filter(payment => payment.tenantId === wholesalerId)
    }

    // Filter payments for pending status
    const pendingPayments = payments.filter(payment => 
      payment.state === 'INITIATED' || payment.state === 'OTP_SENT' || payment.state === 'OTP_VERIFIED'
    )

    // Sort payments by date (newest first)
    pendingPayments.sort((a, b) => {
      const dateA = a.createdAt ? convertToDate(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? convertToDate(b.createdAt).getTime() : 0
      return dateB - dateA
    })

    return NextResponse.json({
      payments: pendingPayments.map(payment => ({
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
          id: payment.tenantId,
          name: payment.initiatedByTenantName || 'Unknown Wholesaler'
        }
      })),
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