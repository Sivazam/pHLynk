// Force dynamic rendering
export const dynamic = "force-dynamic";

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
    const { searchParams } = new URL(request.url)
    const wholesalerId = searchParams.get('wholesalerId')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const tenantId = wholesalerId || session.user.tenantId || 'default'

    // Get retailer details
    const retailer = await retailerService.getById(retailerId, tenantId)

    if (!retailer) {
      return NextResponse.json({ 
        payments: [],
        summary: {
          totalAmount: 0,
          completedAmount: 0,
          pendingAmount: 0,
          wholesalerBreakdown: []
        }
      })
    }

    // Get all payments for this retailer
    let payments = await paymentService.query(tenantId, [])

    // Filter payments for this retailer
    payments = payments.filter(payment => 
      payment.retailerId === retailerId
    )

    // Apply date filters if provided
    if (fromDate || toDate) {
      const from = fromDate ? new Date(fromDate) : null
      const to = toDate ? new Date(new Date(toDate).setHours(23, 59, 59, 999)) : null
      
      payments = payments.filter(payment => {
        if (!payment.createdAt) return false
        const paymentDate = convertToDate(payment.createdAt)
        
        if (from && paymentDate < from) return false
        if (to && paymentDate > to) return false
        return true
      })
    }

    // Apply wholesaler filter if provided
    // Note: wholesaler filtering is not applicable for retailer API as payments are retailer-specific
    // This parameter is kept for API compatibility but has no effect

    // Sort payments by date (newest first)
    payments.sort((a, b) => {
      const dateA = a.createdAt ? convertToDate(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? convertToDate(b.createdAt).getTime() : 0
      return dateB - dateA
    })

    // Calculate summary
    const summary = {
      totalAmount: payments.reduce((sum, payment) => sum + (payment.totalPaid || 0), 0),
      completedAmount: payments
        .filter(p => p.state === 'COMPLETED')
        .reduce((sum, payment) => sum + (payment.totalPaid || 0), 0),
      pendingAmount: payments
        .filter(p => p.state === 'INITIATED' || p.state === 'OTP_SENT' || p.state === 'OTP_VERIFIED')
        .reduce((sum, payment) => sum + (payment.totalPaid || 0), 0),
      methodBreakdown: [] as any[]
    }

    // Calculate breakdown by payment method instead of wholesaler
    const methodMap = new Map()
    payments.forEach(payment => {
      const methodName = payment.method || 'Unknown'
      
      if (!methodMap.has(methodName)) {
        methodMap.set(methodName, {
          method: methodName,
          totalPaid: 0,
          paymentCount: 0
        })
      }
      
      const method = methodMap.get(methodName)
      method.totalPaid += payment.totalPaid || 0
      method.paymentCount += 1
    })

    summary.methodBreakdown = Array.from(methodMap.values())

    return NextResponse.json({
      payments: payments.map(payment => ({
        id: payment.id,
        amount: payment.totalPaid || 0,
        method: payment.method,
        status: payment.state,
        date: payment.createdAt ? convertToDate(payment.createdAt).toISOString() : new Date().toISOString(),
        retailer: {
          id: payment.retailerId,
          name: payment.retailerName || 'Unknown'
        },
        referenceNumber: payment.id
      })),
      summary
    })

  } catch (error) {
    console.error('Error fetching payment history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment history' },
      { status: 500 }
    )
  }
}