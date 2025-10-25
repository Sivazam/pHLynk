// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { retailerService, paymentService } from '@/services/firestore'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    // Get user info from query parameter or header (for testing/development)
    const searchParams = request.nextUrl.searchParams
    const userPhone = searchParams.get('phone') || request.headers.get('x-user-phone')
    
    // For development, if no phone provided, use the test retailer phone
    const phone = userPhone || '9014882779'
    
    console.log('📊 Dashboard Stats API: Using phone:', phone)
    
    if (!phone) {
      console.log('❌ No phone number provided')
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    // Get retailer details - try to find from any tenant the retailer belongs to
    let retailer: any = null
    let tenantIds: string[] = []
    
    // Query retailers directly to find the retailer and get all associated tenants
    const retailersRef = collection(db, 'retailers')
    const retailerQuery = query(retailersRef, where('phone', '==', phone))
    const retailerSnapshot = await getDocs(retailerQuery)
    
    if (!retailerSnapshot.empty) {
      const retailerDoc = retailerSnapshot.docs[0]
      retailer = { id: retailerDoc.id, ...retailerDoc.data() }
      tenantIds = retailer.tenantIds || []
      console.log('📊 Dashboard Stats API: Found retailer:', retailer.name)
    } else {
      console.log('📊 Dashboard Stats API: No retailer found for phone:', phone)
    }

    if (!retailer) {
      return NextResponse.json({ 
        totalPayments: 0,
        completedPayments: 0,
        pendingPayments: 0,
        totalAmount: 0,
        associatedWholesalers: 0
      })
    }

    // Query payments directly from Firestore for better performance and accuracy
    const paymentsRef = collection(db, 'payments')
    const paymentsQuery = query(paymentsRef, where('retailerId', '==', retailer.id))
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

    // Get associated wholesalers count from tenantIds array
    const associatedWholesalers = tenantIds.length

    console.log('📊 Dashboard Stats API: Returning stats:', {
      totalPayments,
      completedPayments,
      pendingPayments,
      totalAmount,
      associatedWholesalers
    })

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