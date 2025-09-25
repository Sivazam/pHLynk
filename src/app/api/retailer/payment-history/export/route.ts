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
    const format = searchParams.get('format') || 'csv'

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
      return new Response('No data found', { status: 404 })
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
        return new Response('No data found', { status: 404 })
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

    if (payments.length === 0) {
      return new Response('No data found', { status: 404 })
    }

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Date', 'Wholesaler', 'Amount', 'Method', 'Status', 'Reference Number']
      const rows = payments.map(payment => [
        new Date(payment.date).toLocaleString(),
        payment.wholesaler.name,
        payment.amount,
        payment.method,
        payment.status,
        payment.referenceNumber || ''
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n')

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="payment-history.csv"'
        }
      })
    } else {
      // Generate JSON
      const jsonData = {
        exportDate: new Date().toISOString(),
        filters: {
          wholesalerId: wholesalerId || 'all',
          fromDate: fromDate || null,
          toDate: toDate || null
        },
        payments: payments.map(payment => ({
          id: payment.id,
          date: payment.date.toISOString(),
          amount: payment.amount,
          method: payment.method,
          status: payment.status,
          referenceNumber: payment.referenceNumber,
          wholesaler: {
            id: payment.wholesaler.id,
            name: payment.wholesaler.name,
            email: payment.wholesaler.email,
            phone: payment.wholesaler.phone
          }
        }))
      }

      return new Response(JSON.stringify(jsonData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="payment-history.json"'
        }
      })
    }

  } catch (error) {
    console.error('Error exporting payment history:', error)
    return NextResponse.json(
      { error: 'Failed to export payment history' },
      { status: 500 }
    )
  }
}