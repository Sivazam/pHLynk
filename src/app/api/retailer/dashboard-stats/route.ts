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
        totalPayments: 0,
        completedPayments: 0,
        pendingPayments: 0,
        totalAmount: 0,
        associatedWholesalers: 0
      })
    }

    // Get all associated wholesaler IDs
    const associatedWholesalerIds = new Set()
    retailers.forEach(retailer => {
      retailer.wholesalers.forEach(association => {
        associatedWholesalerIds.add(association.wholesalerId)
      })
    })

    // Fetch all payments
    const payments = await db.payment.findMany({
      where: {
        retailerId,
        wholesalerId: { in: Array.from(associatedWholesalerIds) }
      }
    })

    // Calculate stats
    const totalPayments = payments.length
    const completedPayments = payments.filter(p => p.status === 'COMPLETED').length
    const pendingPayments = payments.filter(p => p.status === 'PENDING').length
    const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0)

    return NextResponse.json({
      totalPayments,
      completedPayments,
      pendingPayments,
      totalAmount,
      associatedWholesalers: associatedWholesalerIds.size
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}