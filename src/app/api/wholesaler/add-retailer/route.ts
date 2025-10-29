// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { retailerService } from '@/services/firestore';
import { RetailerProfileService, RetailerAssignmentService } from '@/services/retailer-profile-service';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AddRetailerRequest {
  retailerId?: string;  // Optional for existing retailers
  phone?: string;       // Phone for creating new retailers
  tenantId: string;
  areaId?: string;
  zipcodes?: string[];
  aliasName?: string;   // Required for new retailers
  creditLimit?: number;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Enhanced add retailer API called');
    
    const body: AddRetailerRequest = await request.json();
    const { retailerId, phone, tenantId, areaId, zipcodes, aliasName, creditLimit, notes } = body;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }
    
    if (!retailerId && !phone) {
      return NextResponse.json(
        { error: 'Either retailer ID or phone number is required' },
        { status: 400 }
      );
    }
    
    console.log('📋 Adding retailer:', {
      retailerId,
      phone,
      tenantId,
      areaId,
      zipcodes: zipcodes || [],
      aliasName
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
    
    let actualRetailerId = retailerId;
    let retailerData: any = null;
    
    // Case 1: Adding existing retailer by ID
    if (retailerId) {
      console.log('📋 Adding existing retailer by ID');
      
      // Try new retailer profile system first
      const retailerProfile = await RetailerProfileService.getRetailerProfileByPhone(retailerId.replace('retailer_', ''));
      if (retailerProfile) {
        retailerData = {
          id: retailerProfile.id,
          name: retailerProfile.profile?.realName || retailerProfile.name,
          phone: retailerProfile.profile?.phone || retailerProfile.phone,
          address: retailerProfile.profile?.address || retailerProfile.address
        };
        actualRetailerId = retailerProfile.id;
      } else {
        // Fallback to legacy system
        retailerData = await retailerService.getById(retailerId, tenantId);
        if (!retailerData) {
          const retailerRef = doc(db, 'retailers', retailerId);
          const retailerDoc = await getDoc(retailerRef);
          
          if (retailerDoc.exists()) {
            retailerData = retailerDoc.data();
          }
        }
        actualRetailerId = retailerId;
      }
      
      if (!retailerData) {
        return NextResponse.json(
          { error: 'Retailer not found' },
          { status: 404 }
        );
      }
      
      // Check if already assigned
      const existingAssignment = await RetailerAssignmentService.getRetailerAssignment(tenantId, actualRetailerId!);
      if (existingAssignment) {
        return NextResponse.json(
          { error: 'This retailer is already assigned to your business.' },
          { status: 409 }
        );
      }
      
      // Create assignment for existing retailer
      await RetailerAssignmentService.createRetailerAssignment(
        tenantId,
        actualRetailerId!,
        {
          aliasName: aliasName || retailerData.name,
          areaId,
          zipcodes: zipcodes || [],
          creditLimit: creditLimit || 0,
          notes
        }
      );
      
      return NextResponse.json({
        success: true,
        message: `Retailer "${retailerData.name}" has been added to your business`,
        retailer: {
          id: actualRetailerId,
          name: retailerData.name,
          phone: retailerData.phone,
          address: retailerData.address
        }
      });
      
    } else {
      // Case 2: Creating new retailer by phone (partial retailer)
      console.log('📋 Creating new partial retailer');
      
      if (!aliasName) {
        return NextResponse.json(
          { error: 'Alias name is required when creating a new retailer' },
          { status: 400 }
        );
      }
      
      const cleanPhone = phone!.replace(/\D/g, '');
      
      // Check if retailer already exists
      const existingProfile = await RetailerProfileService.getRetailerProfileByPhone(cleanPhone);
      
      if (existingProfile) {
        // Retailer exists, just create assignment
        const existingAssignment = await RetailerAssignmentService.getRetailerAssignment(tenantId, existingProfile.id);
        if (existingAssignment) {
          return NextResponse.json(
            { error: 'This retailer is already assigned to your business.' },
            { status: 409 }
          );
        }
        
        await RetailerAssignmentService.createRetailerAssignment(
          tenantId,
          existingProfile.id,
          {
            aliasName,
            areaId,
            zipcodes: zipcodes || [],
            creditLimit: creditLimit || 0,
            notes
          }
        );
        
        return NextResponse.json({
          success: true,
          message: `Existing retailer "${existingProfile.profile?.realName || existingProfile.name}" has been added to your business`,
          retailer: {
            id: existingProfile.id,
            name: existingProfile.profile?.realName || existingProfile.name,
            phone: existingProfile.profile?.phone || existingProfile.phone,
            isVerified: existingProfile.verification?.isPhoneVerified || existingProfile.phoneVerified || false
          }
        });
      } else {
        // Create new partial retailer
        const newRetailerId = await RetailerProfileService.createRetailerProfile(cleanPhone, {
          realName: '', // Will be filled during verification
          address: ''
        });
        
        await RetailerAssignmentService.createRetailerAssignment(
          tenantId,
          newRetailerId,
          {
            aliasName,
            areaId,
            zipcodes: zipcodes || [],
            creditLimit: creditLimit || 0,
            notes
          }
        );
        
        return NextResponse.json({
          success: true,
          message: `New retailer "${aliasName}" has been added. They will need to verify their phone number to complete registration.`,
          retailer: {
            id: newRetailerId,
            phone: cleanPhone,
            aliasName,
            isVerified: false,
            needsVerification: true
          },
          nextStep: 'RETAILER_NEEDS_VERIFICATION'
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error adding retailer:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add retailer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}