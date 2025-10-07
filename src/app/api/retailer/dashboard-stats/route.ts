// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { retailerService, paymentService } from '@/services/firestore'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'RETAILER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const retailerId = session.user.id

    // Get retailer details - try to find from any tenant the retailer belongs to
    let retailer: any = null
    let tenantIds: string[] = []
    
    // Query retailers directly to find the retailer and get all associated tenants
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
        totalPayments: 0,
        completedPayments: 0,
        pendingPayments: 0,
        totalAmount: 0,
        associatedWholesalers: 0
      })
    }

    // Query payments directly from Firestore for better performance and accuracy
    const paymentsRef = collection(db, 'payments')
    const paymentsQuery = query(paymentsRef, where('retailerId', '==', retailerId))
    const paymentSnapshot = await getDocs(paymentsQuery)
    
    const retailerPayments = paymentSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any))

    // Calculate stats
    const totalPayments = retailerPayments.length
    const completedPayments = retailerPayments.filter(p => p.state === 'COMPLETED').length
    const pendingPayments = retailerPayments.filter(p => 
      p.state === 'INITIATED' || p.state === 'OTP_SENT' || p.state === 'OTP_VERIFIED'
    ).length
    const totalAmount = retailerPayments.reduce((sum, payment) => sum + (payment.totalPaid || 0), 0)

    // Get associated wholesalers count from tenantIds array
    const associatedWholesalers = tenantIds.length

    return NextResponse.json({
      totalPayments,
      completedPayments,
      pendingPayments,
      totalAmount,
      associatedWholesalers
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}