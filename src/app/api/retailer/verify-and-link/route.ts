// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { RetailerProfileService, RetailerAssignmentService } from '@/services/retailer-profile-service';
import { doc, getDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface VerifyAndLinkRequest {
  phone: string;
  otp: string;
  profile: {
    realName: string;
    email?: string;
    address?: string;
    businessType?: string;
    licenseNumber?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Retailer verification and linking API called');
    
    const body: VerifyAndLinkRequest = await request.json();
    const { phone, otp, profile } = body;
    
    if (!phone || !otp || !profile?.realName) {
      return NextResponse.json(
        { error: 'Phone, OTP, and real name are required' },
        { status: 400 }
      );
    }
    
    console.log('📋 Verification data:', { 
      phone, 
      otp: otp.substring(0, 3) + '***', 
      realName: profile.realName 
    });
    
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Get retailer profile
    const retailerProfile = await RetailerProfileService.getRetailerProfileByPhone(cleanPhone);
    if (!retailerProfile) {
      return NextResponse.json(
        { error: 'Retailer not found. Please contact your wholesaler.' },
        { status: 404 }
      );
    }
    
    console.log('✅ Retailer profile found:', retailerProfile.id);
    
    // Verify OTP using existing cloud function
    try {
      const otpResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: cleanPhone,
          otp: otp,
          purpose: 'RETAILER_VERIFICATION'
        })
      });
      
      const otpResult = await otpResponse.json();
      
      if (!otpResult.success) {
        return NextResponse.json(
          { error: otpResult.error || 'Invalid OTP' },
          { status: 400 }
        );
      }
      
      console.log('✅ OTP verified successfully');
    } catch (otpError) {
      console.error('❌ OTP verification failed:', otpError);
      return NextResponse.json(
        { error: 'OTP verification failed. Please try again.' },
        { status: 500 }
      );
    }
    
    // Update retailer profile with complete information
    await RetailerProfileService.updateRetailerProfile(retailerProfile.id, {
      realName: profile.realName,
      email: profile.email,
      address: profile.address,
      businessType: profile.businessType,
      licenseNumber: profile.licenseNumber
    });
    
    // Mark phone as verified
    await RetailerProfileService.verifyPhone(retailerProfile.id);
    
    // Get all assignments for this retailer
    const assignments = await RetailerAssignmentService.getRetailerAssignments(retailerProfile.id);
    
    console.log(`✅ Found ${assignments.length} wholesaler assignments`);
    
    // Prepare assignment details for response
    const assignmentDetails = await Promise.all(
      assignments.map(async (assignment) => {
        // Get tenant details
        const tenantRef = doc(db, 'tenants', assignment.tenantId);
        const tenantDoc = await getDoc(tenantRef);
        const tenantData = tenantDoc.exists() ? tenantDoc.data() : null;
        
        return {
          assignmentId: assignment.id,
          tenantId: assignment.tenantId,
          tenantName: tenantData?.name || 'Unknown Business',
          aliasName: assignment.aliasName,
          areaId: assignment.areaId,
          zipcodes: assignment.zipcodes,
          creditLimit: assignment.creditLimit,
          currentBalance: assignment.currentBalance,
          assignedLineWorkerId: assignment.assignedLineWorkerId,
          createdAt: assignment.createdAt
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      message: `Welcome ${profile.realName}! Your account has been verified and linked to ${assignments.length} business(es).`,
      retailer: {
        id: retailerProfile.id,
        profile: {
          realName: profile.realName,
          phone: cleanPhone,
          email: profile.email,
          address: profile.address,
          businessType: profile.businessType,
          licenseNumber: profile.licenseNumber
        },
        verification: {
          isPhoneVerified: true,
          verifiedAt: new Date().toISOString()
        }
      },
      assignments: assignmentDetails,
      nextSteps: [
        'Download the mobile app',
        'Login with your phone number',
        'Start placing orders',
        'Manage your payments'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error in retailer verification:', error);
    return NextResponse.json(
      { 
        error: 'Verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📋 Check retailer verification status API called');
    
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    
    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }
    
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Get retailer profile
    const retailerProfile = await RetailerProfileService.getRetailerProfileByPhone(cleanPhone);
    if (!retailerProfile) {
      return NextResponse.json(
        { 
          exists: false,
          message: 'Retailer not found' 
        },
        { status: 404 }
      );
    }
    
    // Get assignments
    const assignments = await RetailerAssignmentService.getRetailerAssignments(retailerProfile.id);
    
    return NextResponse.json({
      exists: true,
      retailer: {
        id: retailerProfile.id,
        phone: cleanPhone,
        realName: retailerProfile.profile.realName,
        isVerified: retailerProfile.verification.isPhoneVerified,
        needsVerification: !retailerProfile.verification.isPhoneVerified,
        hasAssignments: assignments.length > 0,
        assignmentCount: assignments.length
      },
      assignments: assignments.map(a => ({
        tenantId: a.tenantId,
        aliasName: a.aliasName,
        creditLimit: a.creditLimit
      }))
    });
    
  } catch (error) {
    console.error('❌ Error checking verification status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}