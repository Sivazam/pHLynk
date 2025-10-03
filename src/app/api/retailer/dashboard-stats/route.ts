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

    // Get retailer details to find tenantId
    const retailer = await retailerService.getById(retailerId, 'default')

    if (!retailer) {
      return NextResponse.json({ 
        totalPayments: 0,
        completedPayments: 0,
        pendingPayments: 0,
        totalAmount: 0,
        associatedWholesalers: 0
      })
    }

    // Use the correct tenantId from retailer
    const tenantId = retailer.tenantId || 'default'

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

    // Get associated wholesalers count
    const associatedWholesalers = retailer.tenantId ? 1 : 0 // Each retailer is associated with one wholesaler/tenant

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