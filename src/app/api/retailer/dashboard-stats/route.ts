import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { retailerService, paymentService } from '@/services/firestore'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'RETAILER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const retailerId = session.user.id
    const tenantId = 'default' // You may need to determine this from the session or context

    // Get retailer details
    const retailer = await retailerService.getById(retailerId, tenantId)

    if (!retailer) {
      return NextResponse.json({ 
        totalPayments: 0,
        completedPayments: 0,
        pendingPayments: 0,
        totalAmount: 0,
        associatedWholesalers: 0
      })
    }

    // Get all payments for this retailer
    const payments = await paymentService.query(tenantId, [
      // Assuming payments have a retailerId field - adjust the query as needed
      // This might need to be adjusted based on your actual data model
    ])

    // For now, let's filter payments in memory since we don't know the exact schema
    const retailerPayments = payments.filter(payment => 
      payment.retailerId === retailerId
    )

    // Calculate stats
    const totalPayments = retailerPayments.length
    const completedPayments = retailerPayments.filter(p => p.state === 'COMPLETED').length
    const pendingPayments = retailerPayments.filter(p => 
      p.state === 'INITIATED' || p.state === 'OTP_SENT' || p.state === 'OTP_VERIFIED'
    ).length
    const totalAmount = retailerPayments.reduce((sum, payment) => sum + (payment.totalPaid || 0), 0)

    // For associated wholesalers, we would need to check the retailer's associations
    // This might be stored in the retailer document or in a separate collection
    const associatedWholesalers = 0 // Placeholder - implement based on your data model

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