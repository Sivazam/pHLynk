// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { retailerService, paymentService } from '@/services/firestore'
import { toDate as convertToDate } from '@/lib/timestamp-utils'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

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

    // Get retailer details - query directly to find retailer and their tenant associations
    let retailer = null
    let tenantIds = []
    
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
        payments: [],
        summary: {
          totalAmount: 0,
          completedAmount: 0,
          pendingAmount: 0,
          wholesalerBreakdown: []
        }
      })
    }

    // Get all payments for this retailer across all tenants
    const paymentsRef = collection(db, 'payments')
    const paymentsQuery = query(paymentsRef, where('retailerId', '==', retailerId))
    const paymentSnapshot = await getDocs(paymentsQuery)
    
    let payments = paymentSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as any))

    // Apply wholesaler filter if provided
    if (wholesalerId && wholesalerId !== 'all') {
      payments = payments.filter(payment => payment.tenantId === wholesalerId)
    }

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
      wholesalerBreakdown: [] as any[]
    }

    // Calculate breakdown by wholesaler
    const wholesalerMap = new Map()
    payments.forEach(payment => {
      const wholesalerId = payment.tenantId || 'unknown'
      
      if (!wholesalerMap.has(wholesalerId)) {
        wholesalerMap.set(wholesalerId, {
          wholesalerId,
          wholesalerName: payment.initiatedByTenantName || 'Unknown Wholesaler',
          totalPaid: 0,
          paymentCount: 0
        })
      }
      
      const wholesaler = wholesalerMap.get(wholesalerId)
      wholesaler.totalPaid += payment.totalPaid || 0
      wholesaler.paymentCount += 1
    })

    summary.wholesalerBreakdown = Array.from(wholesalerMap.values())

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
        wholesaler: {
          id: payment.tenantId,
          name: payment.initiatedByTenantName || 'Unknown Wholesaler'
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