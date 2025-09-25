import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { retailerService, paymentService } from '@/services/firestore'
import { toDate as convertToDate } from '@/lib/timestamp-utils'

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
        payments: [],
        message: 'No retailer profile found'
      }, { status: 404 })
    }

    // Get all payments for this retailer
    let payments = await paymentService.query(tenantId, [])

    // Filter payments for this retailer and pending status
    const pendingPayments = payments.filter(payment => 
      payment.retailerId === retailerId &&
      (payment.state === 'INITIATED' || payment.state === 'OTP_SENT' || payment.state === 'OTP_VERIFIED')
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
          name: 'Unknown', // Line worker info not available in Payment interface
          phone: ''
        },
        retailer: {
          name: payment.retailerName || 'Unknown'
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