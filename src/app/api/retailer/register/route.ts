// API for Retailer Self-Registration and Verification
import { NextRequest, NextResponse } from 'next/server';
import { RetailerProfileService, RetailerAssignmentService } from '@/services/retailer-profile-service';
import { auth } from '@/lib/firebase';

interface RegisterRequest {
  phone: string;
  profile: {
    realName: string;
    email?: string;
    address?: string;
    businessType?: string;
    licenseNumber?: string;
  };
  otp?: string;              // For verification flow
  paymentId?: string;        // For verification flow
}

export async function POST(request: NextRequest) {
  try {
    console.log('🏪 Enhanced retailer registration API called');
    
    const body: RegisterRequest = await request.json();
    const { phone, profile, otp, paymentId } = body;
    
    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }
    
    // Verification flow (for partial retailers created by wholesaler)
    if (otp && paymentId) {
      console.log('🔐 Processing retailer verification flow');
      
      if (!profile?.realName) {
        return NextResponse.json(
          { error: 'Profile information is required for verification' },
          { status: 400 }
        );
      }
      
      // Verify OTP using existing API
      try {
        const otpResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/otp/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentId,
            otp,
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
      
      // Get or create retailer profile
      const cleanPhone = phone.replace(/\D/g, '');
      let retailerProfile = await RetailerProfileService.getRetailerProfileByPhone(cleanPhone);
      
      if (!retailerProfile) {
        // Create new profile if doesn't exist
        const retailerId = await RetailerProfileService.createRetailerProfile(cleanPhone, profile);
        retailerProfile = { id: retailerId } as any;
      } else {
        // Update existing profile
        await RetailerProfileService.updateRetailerProfile(retailerProfile.id, profile);
      }
      
      // Mark phone as verified (non-null assertion since we ensure it exists above)
      await RetailerProfileService.verifyPhone(retailerProfile!.id);
      
      // Get all assignments for this retailer
      const assignments = await RetailerAssignmentService.getRetailerAssignments(retailerProfile!.id);
      
      return NextResponse.json({
        success: true,
        message: `Welcome ${profile.realName}! Your account has been verified and linked to ${assignments.length} business(es).`,
        retailer: {
          id: retailerProfile!.id,
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
        assignments: assignments.map(a => ({
          tenantId: a.tenantId,
          aliasName: a.aliasName,
          creditLimit: a.creditLimit,
          areaId: a.areaId
        })),
        nextSteps: [
          'Download the mobile app',
          'Login with your phone number',
          'Start placing orders',
          'Manage your payments'
        ]
      });
      
    } else {
      // Registration flow (new retailer)
      console.log('📝 Processing retailer registration flow');
      
      if (!profile?.realName) {
        return NextResponse.json(
          { error: 'Real name is required' },
          { status: 400 }
        );
      }
      
      console.log('📋 Registration data:', { phone, realName: profile.realName });
      
      // Check if retailer profile already exists
      const existingProfile = await RetailerProfileService.getRetailerProfileByPhone(phone);
      if (existingProfile) {
        return NextResponse.json(
          { error: 'An account with this phone number already exists. Please login instead.' },
          { status: 409 }
        );
      }
      
      // Create retailer profile
      const retailerId = await RetailerProfileService.createRetailerProfile(phone, profile);
      
      return NextResponse.json({
        success: true,
        message: 'Retailer profile created successfully. Please verify your phone number with OTP.',
        retailerId,
        nextStep: 'VERIFY_PHONE'
      });
    }
    
  } catch (error) {
    console.error('❌ Error in retailer registration:', error);
    return NextResponse.json(
      { 
        error: 'Registration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}