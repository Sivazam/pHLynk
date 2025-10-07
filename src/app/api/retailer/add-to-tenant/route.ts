// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { retailerService } from '@/services/firestore';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AddRetailerToTenantRequest {
  retailerId: string;
  tenantId: string;
}

export async function POST(request: NextRequest) {
  let retailerId: string | undefined;
  let tenantId: string | undefined;
  
  try {
    const body: AddRetailerToTenantRequest = await request.json();
    retailerId = body.retailerId;
    tenantId = body.tenantId;

    console.log('🔗 Adding retailer to tenant:', { retailerId, tenantId });

    if (!retailerId || !tenantId) {
      return NextResponse.json(
        { error: 'Retailer ID and Tenant ID are required' },
        { status: 400 }
      );
    }

    // Verify tenant exists
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantDoc = await getDoc(tenantRef);
    
    if (!tenantDoc.exists()) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Verify retailer exists
    const retailer = await retailerService.getById(retailerId, tenantId);
    if (retailer) {
      // Retailer is already associated with this tenant
      return NextResponse.json({
        success: true,
        message: 'Retailer is already associated with your account',
        retailerId,
        tenantId,
        alreadyAssociated: true
      });
    }
    
    // Try to get retailer without tenant filter (since we're adding to new tenant)
    const retailersRef = doc(db, 'retailers', retailerId);
    const retailerDoc = await getDoc(retailersRef);
    
    if (!retailerDoc.exists()) {
      return NextResponse.json(
        { error: 'Retailer not found' },
        { status: 404 }
      );
    }

    // Check if retailer is already associated with this tenant
    const retailerData = retailerDoc.data();
    if (retailerData.tenantIds && retailerData.tenantIds.includes(tenantId)) {
      return NextResponse.json({
        success: true,
        message: 'Retailer is already associated with your account',
        retailerId,
        tenantId,
        alreadyAssociated: true
      });
    }

    // Add tenant to retailer's tenantIds array
    await retailerService.addTenantToRetailer(retailerId, tenantId);

    console.log('✅ Retailer added to tenant successfully');

    return NextResponse.json({
      success: true,
      message: 'Retailer added to your account successfully',
      retailerId,
      tenantId
    });

  } catch (error) {
    console.error('❌ Error adding retailer to tenant:', error);
    
    // Check if it's a duplicate error
    if (error instanceof Error && error.message.includes('already associated')) {
      return NextResponse.json({
        success: true,
        message: 'Retailer is already associated with your account',
        retailerId,
        tenantId
      });
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to add retailer to your account',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}