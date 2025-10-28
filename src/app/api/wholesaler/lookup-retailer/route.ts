// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { retailerService } from '@/services/firestore';
import { RetailerAuthService } from '@/services/retailer-auth';
import { RetailerProfileService, RetailerAssignmentService } from '@/services/retailer-profile-service';
import { getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface LookupRequest {
  phone: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Retailer lookup API called');
    
    const body: LookupRequest = await request.json();
    const { phone } = body;
    
    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }
    
    // Clean phone number (remove non-digits)
    const cleanPhone = phone.replace(/\D/g, '');
    
    console.log('📞 Looking up retailer with phone:', cleanPhone);
    
    // First, try to find retailer in new retailer profile system
    let retailerProfile = await RetailerProfileService.getRetailerProfileByPhone(cleanPhone);
    
    if (retailerProfile) {
      console.log('✅ Found retailer in new profile system:', retailerProfile.id);
      
      // Check if retailer has assignments with current tenant (if provided)
      const assignments = await RetailerAssignmentService.getRetailerAssignments(retailerProfile.id);
      
      const retailerInfo = {
        id: retailerProfile.id,
        name: retailerProfile.profile.realName || 'Not Verified',
        phone: retailerProfile.profile.phone,
        address: retailerProfile.profile.address,
        isVerified: retailerProfile.verification.isPhoneVerified,
        hasAssignments: assignments.length > 0,
        assignmentCount: assignments.length,
        isNew: assignments.length === 0
      };
      
      return NextResponse.json({
        success: true,
        retailer: retailerInfo,
        message: retailerInfo.isVerified 
          ? (retailerInfo.hasAssignments 
              ? 'Existing verified retailer found' 
              : 'Verified retailer available for assignment')
          : 'Retailer needs verification - you can add them but they must complete registration',
        verificationStatus: retailerInfo.isVerified ? 'VERIFIED' : 'NEEDS_VERIFICATION'
      });
    }
    
    // Fallback to old system for backward compatibility
    let retailer = await retailerService.getRetailerByPhone(cleanPhone);
    
    // If not found, try retailerUsers collection as fallback
    if (!retailer) {
      console.log('📞 Retailer not found in retailers collection, checking retailerUsers...');
      const retailerUser = await RetailerAuthService.getRetailerUserByPhone(cleanPhone);
      
      if (retailerUser) {
        console.log('📞 Found retailer user, creating basic retailer profile...');
        retailer = {
          id: retailerUser.retailerId || retailerUser.uid,
          name: retailerUser.name || 'Unknown Retailer',
          phone: retailerUser.phone,
          address: retailerUser.address,
          tenantIds: [], // No tenants yet
          zipcodes: [],
          createdAt: retailerUser.createdAt,
          updatedAt: retailerUser.lastLoginAt || retailerUser.createdAt
        };
      }
    }
    
    if (!retailer) {
      console.log('❌ Retailer not found for phone:', cleanPhone);
      return NextResponse.json({
        success: false,
        message: 'Retailer not found - you can create a new retailer account',
        phone: cleanPhone,
        canCreate: true
      });
    }
    
    console.log('✅ Retailer found (legacy system):', {
      id: retailer.id,
      name: retailer.name,
      phone: retailer.phone,
      hasTenants: retailer.tenantIds && retailer.tenantIds.length > 0
    });
    
    // Return only basic retailer info (no sensitive data)
    const retailerInfo = {
      id: retailer.id,
      name: retailer.name,
      phone: retailer.phone,
      address: retailer.address,
      isNew: !retailer.tenantIds || retailer.tenantIds.length === 0,
      isLegacy: true
    };
    
    return NextResponse.json({
      success: true,
      retailer: retailerInfo,
      message: retailerInfo.isNew 
        ? 'New retailer found - you can add them' 
        : 'Existing retailer found - you can add them to your business',
      system: 'LEGACY'
    });
    
  } catch (error) {
    console.error('❌ Error in retailer lookup API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}