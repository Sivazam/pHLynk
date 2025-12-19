// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, getDocs, doc, getDoc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug API called')
    
    const results = {
      retailers: [],
      tenants: [],
      retailerUsers: []
    }
    
    // Check retailers collection
    try {
      const retailersRef = collection(db, 'retailers')
      const retailerSnapshot = await getDocs(retailersRef)
      
      retailerSnapshot.forEach(doc => {
        results.retailers.push({
          id: doc.id,
          name: doc.data().name,
          phone: doc.data().phone,
          tenantIds: doc.data().tenantIds || [],
          tenantId: doc.data().tenantId
        })
      })
      
      console.log('📊 Retailers found:', results.retailers.length)
    } catch (error) {
      console.error('❌ Error fetching retailers:', error)
    }
    
    // Check tenants collection
    try {
      const tenantsRef = collection(db, 'tenants')
      const tenantSnapshot = await getDocs(tenantsRef)
      
      tenantSnapshot.forEach(doc => {
        results.tenants.push({
          id: doc.id,
          name: doc.data().name,
          status: doc.data().status,
          email: doc.data().email
        })
      })
      
      console.log('📊 Tenants found:', results.tenants.length)
    } catch (error) {
      console.error('❌ Error fetching tenants:', error)
    }
    
    // Check retailerUsers collection
    try {
      const retailerUsersRef = collection(db, 'retailerUsers')
      const retailerUserSnapshot = await getDocs(retailerUsersRef)
      
      retailerUserSnapshot.forEach(doc => {
        results.retailerUsers.push({
          id: doc.id,
          retailerId: doc.data().retailerId,
          name: doc.data().name,
          phone: doc.data().phone,
          tenantIds: doc.data().tenantIds || []
        })
      })
      
      console.log('📊 Retailer users found:', results.retailerUsers.length)
    } catch (error) {
      console.error('❌ Error fetching retailer users:', error)
    }
    
    return NextResponse.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Debug API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}