// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { retailerService } from '@/services/firestore';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AddRetailerRequest {
  retailerId: string;
  tenantId: string;
  areaId?: string;
  zipcodes?: string[];
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Add retailer to tenant API called');
    
    const body: AddRetailerRequest = await request.json();
    const { retailerId, tenantId, areaId, zipcodes } = body;
    
    if (!retailerId || !tenantId) {
      return NextResponse.json(
        { error: 'Retailer ID and Tenant ID are required' },
        { status: 400 }
      );
    }
    
    console.log('📋 Adding retailer to tenant:', {
      retailerId,
      tenantId,
      areaId,
      zipcodes: zipcodes || []
    });
    
    // Verify tenant exists
    const tenantRef = doc(db, 'tenants', tenantId);
    const tenantDoc = await getDoc(tenantRef);
    
    if (!tenantDoc.exists()) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }
    
    const tenantData = tenantDoc.data();
    console.log('✅ Tenant verified:', tenantData.name);
    
    // Get current retailer data
    const retailer = await retailerService.getById(retailerId, tenantId);
    
    if (!retailer) {
      // Try to get retailer without tenant check (for cross-tenant access)
      const retailerRef = doc(db, 'retailers', retailerId);
      const retailerDoc = await getDoc(retailerRef);
      
      if (!retailerDoc.exists()) {
        return NextResponse.json(
          { error: 'Retailer not found' },
          { status: 404 }
        );
      }
      
      const retailerData = retailerDoc.data();
      console.log('✅ Retailer found (cross-tenant):', retailerData.name);
      
      // Add tenant to retailer
      await retailerService.addTenantToRetailer(retailerId, tenantId);
      
      // NEW: Use wholesalerData structure instead of just updating area/zipcodes
      await retailerService.upsertWholesalerData(retailerId, tenantId, {
        areaId: areaId,
        zipcodes: zipcodes
      });
      
      return NextResponse.json({
        success: true,
        message: `Retailer "${retailerData.name}" has been added to your business`,
        retailer: {
          id: retailerId,
          name: retailerData.name,
          phone: retailerData.phone,
          address: retailerData.address
        }
      });
    }
    
    // Retailer already has access to this tenant
    console.log('ℹ️  Retailer already has access to this tenant');
    
    // Update wholesaler data anyway in case area changed
    await retailerService.upsertWholesalerData(retailerId, tenantId, {
      areaId: areaId,
      zipcodes: zipcodes
    });
    
    return NextResponse.json({
      success: true,
      message: `Retailer "${retailer.name}" is already associated with your business`,
      retailer: {
        id: retailer.id,
        name: retailer.name,
        phone: retailer.phone,
        address: retailer.address
      }
    });
    
  } catch (error) {
    console.error('❌ Error adding retailer to tenant:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}