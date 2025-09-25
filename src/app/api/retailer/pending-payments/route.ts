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
        payments: [],
        message: 'No retailer profile found'
      }, { status: 404 })
    }

    // Get all associated wholesaler IDs
    const associatedWholesalerIds = new Set()
    retailers.forEach(retailer => {
      retailer.wholesalers.forEach(association => {
        associatedWholesalerIds.add(association.wholesalerId)
      })
    })

    // Fetch pending payments
    const pendingPayments = await db.payment.findMany({
      where: {
        retailerId,
        wholesalerId: { in: Array.from(associatedWholesalerIds) },
        status: 'PENDING'
      },
      include: {
        lineWorker: true,
        wholesaler: true
      },
      orderBy: {
        date: 'desc'
      }
    })

    return NextResponse.json({
      payments: pendingPayments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        date: payment.date.toISOString(),
        lineWorker: {
          name: payment.lineWorker.name,
          phone: payment.lineWorker.phone
        },
        wholesaler: {
          name: payment.wholesaler.name
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