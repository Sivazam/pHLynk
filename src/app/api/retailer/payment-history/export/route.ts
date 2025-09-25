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
    const { searchParams } = new URL(request.url)
    const wholesalerId = searchParams.get('wholesalerId')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const format = searchParams.get('format') || 'csv'

    // Get retailer details
    const retailer = await retailerService.getById(retailerId, tenantId)

    if (!retailer) {
      return new Response('No retailer profile found', { status: 404 })
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

    if (payments.length === 0) {
      return new Response('No data found', { status: 404 })
    }

    // Sort payments by date (newest first)
    payments.sort((a, b) => {
      const dateA = a.createdAt ? convertToDate(a.createdAt).getTime() : 0
      const dateB = b.createdAt ? convertToDate(b.createdAt).getTime() : 0
      return dateB - dateA
    })

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Date', 'Retailer', 'Amount', 'Method', 'Status', 'Reference Number']
      const rows = payments.map(payment => [
        payment.createdAt ? new Date(convertToDate(payment.createdAt)).toLocaleString() : 'Unknown',
        payment.retailerName || 'Unknown',
        payment.totalPaid || 0,
        payment.method || 'Unknown',
        payment.state || 'Unknown',
        payment.id || ''
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
          date: payment.createdAt ? convertToDate(payment.createdAt).toISOString() : new Date().toISOString(),
          amount: payment.totalPaid || 0,
          method: payment.method,
          status: payment.state,
          referenceNumber: payment.id,
          retailer: {
            name: payment.retailerName || 'Unknown',
            id: payment.retailerId
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