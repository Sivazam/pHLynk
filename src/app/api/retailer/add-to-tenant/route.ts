// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { retailerService } from '@/services/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AddRetailerToTenantRequest {
  retailerId: string;
  tenantId: string;
  areaId?: string;
  zipcodes?: string[];
  code?: string;
}

export async function POST(request: NextRequest) {
  let retailerId: string | undefined;
  let tenantId: string | undefined;

  try {
    const body: AddRetailerToTenantRequest = await request.json();
    retailerId = body.retailerId;
    tenantId = body.tenantId;
    const { areaId, zipcodes, code } = body;

    console.log('🔗 Adding retailer to tenant:', { retailerId, tenantId, areaId, zipcodes, code });

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

    // Check if retailer exists and is associated
    const retailer = await retailerService.getById(retailerId, tenantId);

    // If getting by ID + Tenant ID returns a retailer, they are already associated
    if (retailer) {
      // Retailer is already associated with this tenant
      // Update wholesaler assignment if area/zipcodes/code provided
      if (areaId || zipcodes || code !== undefined) {
        await retailerService.upsertWholesalerData(
          retailerId,
          tenantId,
          {
            areaId: areaId || '',
            zipcodes: zipcodes || [],
            code: code || undefined
          }
        );
      }

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

    // Double check tenant association in data
    const retailerData = retailerDoc.data();
    if (retailerData.tenantIds && retailerData.tenantIds.includes(tenantId)) {
      // Update wholesaler assignment if area/zipcodes/code provided
      if (areaId || zipcodes || code !== undefined) {
        await retailerService.upsertWholesalerData(
          retailerId,
          tenantId,
          {
            areaId: areaId || '',
            zipcodes: zipcodes || [],
            code: code || undefined
          }
        );
      }

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

    // Add wholesaler-specific assignment if area/zipcodes/code provided
    if (areaId || zipcodes || code !== undefined) {
      await retailerService.upsertWholesalerData(
        retailerId,
        tenantId,
        {
          areaId: areaId || '',
          zipcodes: zipcodes || [],
          code: code || undefined
        }
      );
    }

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