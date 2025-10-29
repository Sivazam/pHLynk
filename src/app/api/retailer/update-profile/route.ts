// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { RetailerProfileService } from '@/services/retailer-profile-service';
import { RetailerAuthService } from '@/services/retailer-auth';
import { auth } from '@/lib/firebase';

interface UpdateProfileRequest {
  retailerId: string;
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
    console.log('🏪 Retailer profile update API called');
    
    const body: UpdateProfileRequest = await request.json();
    const { retailerId, profile } = body;
    
    if (!retailerId) {
      return NextResponse.json(
        { error: 'Retailer ID is required' },
        { status: 400 }
      );
    }
    
    if (!profile.realName || profile.realName.trim() === '') {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      );
    }
    
    console.log('📋 Updating retailer profile:', {
      retailerId,
      realName: profile.realName,
      email: profile.email,
      hasAddress: !!profile.address,
      businessType: profile.businessType,
      hasLicense: !!profile.licenseNumber
    });
    
    // Validate email format if provided
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }
    
    // Get existing retailer profile
    const existingProfile = await RetailerProfileService.getRetailerProfile(retailerId);
    
    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Retailer profile not found' },
        { status: 404 }
      );
    }
    
    // Update the profile in retailers collection
    const updatedProfile = {
      ...existingProfile.profile,
      realName: profile.realName.trim(),
      email: profile.email?.trim() || undefined,
      address: profile.address?.trim() || undefined,
      businessType: profile.businessType || undefined,
      licenseNumber: profile.licenseNumber?.trim() || undefined
    };
    
    await RetailerProfileService.updateRetailerProfile(retailerId, updatedProfile);
    
    // Also update the retailerUsers collection
    try {
      const retailerUserData = await RetailerAuthService.getRetailerUserByRetailerId(retailerId);
      if (retailerUserData) {
        console.log('👤 Updating retailer user data in retailerUsers collection');
        await RetailerAuthService.updateRetailerUser(retailerUserData.uid, {
          name: profile.realName.trim(),
          email: profile.email?.trim() || '',
          address: profile.address?.trim() || '',
          businessType: profile.businessType || '',
          licenseNumber: profile.licenseNumber?.trim() || ''
        });
        console.log('✅ Retailer user data updated successfully');
      } else {
        console.log('⚠️ No retailer user found in retailerUsers collection');
      }
    } catch (error) {
      console.error('❌ Error updating retailer user data:', error);
      // Don't fail the request if retailerUsers update fails
    }
    
    // Get updated profile data
    const finalProfile = await RetailerProfileService.getRetailerProfile(retailerId);
    
    console.log('✅ Retailer profile updated successfully:', {
      retailerId,
      realName: finalProfile?.profile.realName
    });
    
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        retailerId,
        profile: finalProfile?.profile,
        verification: finalProfile?.verification,
        updatedAt: finalProfile?.updatedAt
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating retailer profile:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}