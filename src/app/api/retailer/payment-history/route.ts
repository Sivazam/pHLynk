import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

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

    // Build date filters
    let dateFilter = {}
    if (fromDate || toDate) {
      dateFilter = {
        date: {
          ...(fromDate && { gte: new Date(fromDate) }),
          ...(toDate && { 
            lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)) 
          })
        }
      }
    }

    // Get retailer's wholesaler associations
    const retailers = await db.retailer.findMany({
      where: {
        userId: retailerId
      },
      include: {
        wholesalers: {
          include: {
            wholesaler: true
          }
        }
      }
    })

    if (!retailers || retailers.length === 0) {
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

    // Get all associated wholesaler IDs
    const associatedWholesalerIds = new Set()
    retailers.forEach(retailer => {
      retailer.wholesalers.forEach(association => {
        associatedWholesalerIds.add(association.wholesalerId)
      })
    })

    // If specific wholesaler is selected, verify it's associated
    if (wholesalerId && wholesalerId !== 'all') {
      if (!associatedWholesalerIds.has(wholesalerId)) {
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
    }

    // Build wholesaler filter
    const wholesalerFilter = wholesalerId && wholesalerId !== 'all' 
      ? { wholesalerId }
      : { wholesalerId: { in: Array.from(associatedWholesalerIds) } }

    // Fetch payments with filters
    const payments = await db.payment.findMany({
      where: {
        retailerId,
        ...wholesalerFilter,
        ...dateFilter
      },
      include: {
        wholesaler: true
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Calculate summary
    const summary = {
      totalAmount: payments.reduce((sum, payment) => sum + payment.amount, 0),
      completedAmount: payments
        .filter(p => p.status === 'COMPLETED')
        .reduce((sum, payment) => sum + payment.amount, 0),
      pendingAmount: payments
        .filter(p => p.status === 'PENDING')
        .reduce((sum, payment) => sum + payment.amount, 0),
      wholesalerBreakdown: [] as any[]
    }

    // Calculate wholesaler breakdown
    const wholesalerMap = new Map()
    payments.forEach(payment => {
      const wholesalerId = payment.wholesalerId
      if (!wholesalerMap.has(wholesalerId)) {
        wholesalerMap.set(wholesalerId, {
          wholesalerId,
          wholesalerName: payment.wholesaler.name,
          totalPaid: 0,
          paymentCount: 0
        })
      }
      
      const wholesaler = wholesalerMap.get(wholesalerId)
      wholesaler.totalPaid += payment.amount
      wholesaler.paymentCount += 1
    })

    summary.wholesalerBreakdown = Array.from(wholesalerMap.values())

    return NextResponse.json({
      payments: payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        date: payment.date.toISOString(),
        wholesaler: {
          id: payment.wholesaler.id,
          name: payment.wholesaler.name,
          email: payment.wholesaler.email,
          phone: payment.wholesaler.phone
        },
        referenceNumber: payment.referenceNumber
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