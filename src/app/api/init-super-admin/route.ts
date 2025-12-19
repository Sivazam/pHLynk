// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Creating test tenant...');
    
    const body = await request.json();
    const { name, email, phone } = body;
    
    if (!name || !email) {
      return NextResponse.json({
        success: false,
        error: 'Name and email are required'
      }, { status: 400 });
    }
    
    // Create a test tenant
    const tenantData = {
      name: name || 'Test Wholesaler',
      email: email || 'test@pharmalynk.com',
      phone: phone || '+1234567890',
      status: 'ACTIVE',
      subscriptionStatus: 'ACTIVE',
      plan: 'PREMIUM',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const tenantRef = doc(collection(db, 'tenants'));
    await setDoc(tenantRef, tenantData);
    
    const tenantId = tenantRef.id;
    
    console.log('✅ Test tenant created:', { tenantId, name: tenantData.name });
    
    return NextResponse.json({
      success: true,
      tenantId: tenantId,
      message: 'Test tenant created successfully',
      tenant: {
        id: tenantId,
        name: tenantData.name,
        email: tenantData.email,
        status: tenantData.status
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating test tenant:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create test tenant'
    }, { status: 500 });
  }
}