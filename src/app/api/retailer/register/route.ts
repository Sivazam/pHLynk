// API for Retailer Self-Registration
import { NextRequest, NextResponse } from 'next/server';
import { RetailerProfileService } from '@/services/retailer-profile-service';
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
}

export async function POST(request: NextRequest) {
  try {
    console.log('🏪 Retailer self-registration API called');
    
    const body: RegisterRequest = await request.json();
    const { phone, profile } = body;
    
    if (!phone || !profile?.realName) {
      return NextResponse.json(
        { error: 'Phone number and real name are required' },
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