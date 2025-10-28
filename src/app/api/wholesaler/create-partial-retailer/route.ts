// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { RetailerProfileService, RetailerAssignmentService } from '@/services/retailer-profile-service';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CreatePartialRetailerRequest {
  phone: string;
  aliasName: string;
  areaId?: string;
  zipcodes: string[];
  tenantId: string;
  creditLimit?: number;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🏪 Create partial retailer API called');
    
    const body: CreatePartialRetailerRequest = await request.json();
    const { phone, aliasName, areaId, zipcodes, tenantId, creditLimit, notes } = body;
    
    if (!phone || !aliasName || !zipcodes || !tenantId) {
      return NextResponse.json(
        { error: 'Phone, alias name, zipcodes, and tenant ID are required' },
        { status: 400 }
      );
    }
    
    console.log('📋 Partial retailer data:', { 
      phone, 
      aliasName, 
      areaId, 
      zipcodes: zipcodes.length,
      tenantId 
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
    
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if retailer profile already exists
    const existingProfile = await RetailerProfileService.getRetailerProfileByPhone(cleanPhone);
    
    let retailerId: string;
    
    if (existingProfile) {
      // Retailer profile exists, use existing ID
      retailerId = existingProfile.id;
      console.log('✅ Existing retailer profile found:', retailerId);
      
      // Check if already assigned to this wholesaler
      const existingAssignment = await RetailerAssignmentService.getRetailerAssignment(tenantId, retailerId);
      if (existingAssignment) {
        return NextResponse.json(
          { error: 'This retailer is already assigned to your business.' },
          { status: 409 }
        );
      }
    } else {
      // Create minimal retailer profile (partial)
      retailerId = await RetailerProfileService.createRetailerProfile(cleanPhone, {
        realName: '', // Will be filled during verification
        address: '' // Will be filled during verification
      });
      console.log('✅ Partial retailer profile created:', retailerId);
    }
    
    // Create wholesaler assignment
    const assignmentId = await RetailerAssignmentService.createRetailerAssignment(
      tenantId, 
      retailerId, 
      {
        aliasName,
        areaId,
        zipcodes,
        creditLimit: creditLimit || 0,
        notes
      }
    );
    
    return NextResponse.json({
      success: true,
      message: `Retailer "${aliasName}" has been added successfully. They will need to verify their phone number to complete registration.`,
      retailerId,
      assignmentId,
      retailer: {
        id: retailerId,
        phone: cleanPhone,
        aliasName,
        isVerified: existingProfile?.verification.isPhoneVerified || false,
        needsVerification: !existingProfile?.verification.isPhoneVerified
      },
      nextStep: existingProfile?.verification.isPhoneVerified 
        ? 'RETAILER_READY' 
        : 'RETAILER_NEEDS_VERIFICATION'
    });
    
  } catch (error) {
    console.error('❌ Error creating partial retailer:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create retailer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}