// Force dynamic rendering
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { retailerService } from '@/services/firestore';
import { RetailerAuthService } from '@/services/retailer-auth';
import { serverTimestamp } from 'firebase/firestore';

interface RetailerLookupRequest {
  phone: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 RETAILER LOOKUP API v2.0 - Fixed Version');
    
    const body: RetailerLookupRequest = await request.json();
    const { phone } = body;

    console.log('🔍 Retailer lookup request for phone:', phone);

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      );
    }

    // First try to find retailer in retailers collection (check both phone and profile.phone fields)
    let retailer = await retailerService.getRetailerByPhoneEnhanced(cleanPhone);
    
    // If not found, try retailerUsers collection as fallback
    if (!retailer) {
      console.log('🔍 Retailer not found in retailers collection, checking retailerUsers...');
      const retailerUser = await RetailerAuthService.getRetailerUserByPhone(cleanPhone);
      
      if (retailerUser) {
        console.log('✅ Found retailer user, but no retailer document exists');
        // Return user info but indicate no retailer document
        return NextResponse.json({
          retailer: null,
          retailerUser: {
            id: retailerUser.id,
            phone: retailerUser.phone,
            name: retailerUser.name,
            hasDocument: false
          },
          message: 'Retailer user found but no retailer document exists'
        });
      }
    }

    // CRITICAL FIX: Always ensure consistency with retailerUsers collection
    if (retailer) {
      console.log('✅ Initial retailer found:', retailer.id);
      
      // Always check retailerUsers for the correct reference
      const retailerUser = await RetailerAuthService.getRetailerUserByPhone(cleanPhone);
      
      if (retailerUser) {
        console.log(`📋 retailerUsers references retailer ID: ${retailerUser.retailerId}`);
        
        if (retailerUser.retailerId !== retailer.id) {
          console.log('⚠️  INCONSISTENCY DETECTED - correcting:');
          console.log(`   - Search found: ${retailer.id}`);
          console.log(`   - retailerUsers expects: ${retailerUser.retailerId}`);
          
          // Always try to get the retailer document that retailerUsers references
          const correctRetailer = await retailerService.getById(retailerUser.retailerId, retailerUser.tenantId);
          
          if (correctRetailer && correctRetailer.phone === cleanPhone) {
            console.log('✅ CORRECTED: Using retailer document from retailerUsers reference');
            retailer = correctRetailer;
          } else {
            console.log('⚠️  retailerUsers reference is invalid, using search result');
            // Try to update retailerUsers with the correct retailer ID
            try {
              console.log('🔧 Updating retailerUsers with correct retailer ID...');
              const { doc, updateDoc } = await import('firebase/firestore');
              const { db } = await import('@/lib/firebase');
              const userRef = doc(db, 'retailerUsers', retailerUser.uid);
              await updateDoc(userRef, {
                retailerId: retailer.id,
                lastLoginAt: serverTimestamp()
              });
              console.log('✅ Fixed retailerUsers reference');
            } catch (fixError) {
              console.error('❌ Failed to fix retailerUsers reference:', fixError);
            }
          }
        } else {
          console.log('✅ Consistent: retailerUsers matches search result');
        }
      } else {
        console.log('⚠️  No retailerUsers found for this phone number');
      }
      
      // Don't expose tenant information for privacy
      const safeRetailer: any = {
        id: retailer.id,
      };
      
      // Handle both legacy and new profile formats
      if (retailer.profile) {
        // New profile format
        safeRetailer.name = retailer.profile.realName;
        safeRetailer.phone = retailer.profile.phone;
        safeRetailer.email = retailer.profile.email;
        safeRetailer.address = retailer.profile.address;
        safeRetailer.businessType = retailer.profile.businessType;
        safeRetailer.licenseNumber = retailer.profile.licenseNumber;
      } else {
        // Legacy format
        safeRetailer.name = retailer.name;
        safeRetailer.phone = retailer.phone;
        safeRetailer.email = retailer.email;
        safeRetailer.address = retailer.address;
        // Legacy format doesn't have businessType and licenseNumber fields
        // These are only available in the new profile format
        safeRetailer.businessType = undefined;
        safeRetailer.licenseNumber = undefined;
      }
      
      // Include zipcodes if available
      if (retailer.zipcodes) {
        safeRetailer.zipcodes = retailer.zipcodes;
      }

      return NextResponse.json({
        retailer: safeRetailer,
        message: 'Retailer found successfully',
        apiVersion: '2.0-fixed',
        consistencyChecked: true
      });
    }

    console.log('ℹ️ No retailer found for phone:', cleanPhone);
    
    return NextResponse.json({
      retailer: null,
      message: 'No retailer found with this phone number'
    });

  } catch (error) {
    console.error('❌ Error in retailer lookup:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to lookup retailer',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}