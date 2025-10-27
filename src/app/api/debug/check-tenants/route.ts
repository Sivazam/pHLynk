// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    // Check all tenants
    const tenantsRef = collection(db, 'tenants')
    const tenantSnapshot = await getDocs(tenantsRef)
    
    const tenants = []
    tenantSnapshot.forEach(doc => {
      tenants.push({
        id: doc.id,
        ...doc.data()
      })
    })
    
    // Check some payments to see tenantIds
    const paymentsRef = collection(db, 'payments')
    const paymentSnapshot = await getDocs(paymentsRef)
    
    const payments = []
    paymentSnapshot.forEach(doc => {
      const paymentData = doc.data()
      payments.push({
        id: doc.id,
        tenantId: paymentData.tenantId,
        retailerId: paymentData.retailerId,
        totalPaid: paymentData.totalPaid,
        state: paymentData.state,
        createdAt: paymentData.createdAt
      })
    })
    
    return NextResponse.json({
      tenantsCount: tenants.length,
      tenants: tenants.map(t => ({ id: t.id, name: t.name, email: t.email })),
      paymentsCount: payments.length,
      samplePayments: payments.slice(0, 10)
    })
    
  } catch (error) {
    console.error('Error checking tenants:', error)
    return NextResponse.json(
      { error: 'Failed to check tenants', details: error.message },
      { status: 500 }
    )
  }
}